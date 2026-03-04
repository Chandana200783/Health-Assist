import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize the Google Generative AI client
// Initialize lazily
let genAI = null;

// Priorities for models to try (fallback strategy)
const MODELS_TO_TRY = [
    "gemini-1.5-flash-8b",
    "gemini-pro"
];

function getGenAI() {
    if (!API_KEY) throw new Error("API Key missing");
    if (!genAI) {
        genAI = new GoogleGenerativeAI(API_KEY);
    }
    return genAI;
}

// Helper to execute generation with fallback
async function executeGeneration(params, typeArg = 'generateContent') {
    const ai = getGenAI();
    let lastError = null;

    // Determine the type: prioritize params.type if it exists (fix for chat call), otherwise use argument
    const type = params.type || typeArg;

    for (const modelName of MODELS_TO_TRY) {
        try {
            // console.log(`Trying model: ${modelName}`);
            const modelConfig = { model: modelName };
            if (params.systemInstruction) {
                modelConfig.systemInstruction = params.systemInstruction;
            }

            const model = ai.getGenerativeModel(modelConfig);

            let result;
            if (type === 'chat') {
                const chat = model.startChat({ history: params.history || [] });
                result = await chat.sendMessage(params.message);
            } else {
                // For standard generation
                result = await model.generateContent(params.prompt);
            }

            const response = await result.response;
            return response; // Success return

        } catch (error) {
            console.warn(`Model ${modelName} failed:`, error.message);
            lastError = error;
        }
    }
    throw lastError || new Error("All models failed. Please check your network and API Key.");
}

const reportSystemPrompt = (language = 'English') => `
You are a technical data extraction engine.
TASK: Extract health metrics from the provided medical lab report image.

OUTPUT FORMAT:
Return ONLY valid raw JSON. Do NOT include Markdown formatting (no \`\`\`json). Do NOT include conversational text.

JSON STRUCTURE:
{
  "health_score": 85, // Estimate a general health score (0-100) based on the results. 100 is perfect.
  "glucose_level": { "value": number, "unit": "mg/dL" }, // Normalize to mg/dL if possible (e.g. from Fasting Blood Sugar).
  "total_cholesterol": { "value": number, "unit": "mg/dL" }, // Extract "Total Cholesterol" or just "Cholesterol".
  "blood_sugar_fasting": { "value": number|string, "unit": "string" },
  "hba1c": { "value": number|string, "unit": "string" },
  "tsh": { "value": number|string, "unit": "string" },
  "height": { "value": number, "unit": "cm/ft/m" }, // User height if found
  "weight": { "value": number, "unit": "kg/lbs" }, // User weight if found
  "detailed_analysis": "Detailed health analysis in ${language}. Use bullet points. For each metric, explicitly state if it is HIGH, LOW, or NORMAL range."
}

DATA HANDLING:
- If 'Total Cholesterol' is found, map it to 'total_cholesterol'.
- If 'Fasting Blood Sugar' or 'Glucose' is found, map it to 'glucose_level'.
- Extract NUMERIC values only for 'value' fields (e.g. 167, not "167 mg/dL"). Put unit in 'unit'.
- If a value is unclear, omit it.
- NO PII (Names, IDs) is allowed.
`;

const foodSystemPrompt = (language = 'English') => `
You are a nutritional assessment AI. Your goal is to identify food items in the image and estimate nutritional content.

RULES:
1. Output ONLY valid JSON. No markdown formatting.
2. Identify each distinct food item visible.
3. For each item, estimate the portion size (e.g., "1 cup", "100g", "1 slice") in ${language}.
4. Estimate calories and macros (protein, carbs, fats) for that portion.
5. Provide a 'total_calories' field summing all items.
6. Provide the name of the food item in ${language}.
`;

const medicineSystemPrompt = (language = 'English') => `
You are a pharmaceutical identification engine.
TASK: Identify the medicine in the image and provide structured details.

OUTPUT FORMAT:
Return ONLY valid raw JSON. Do NOT include Markdown. Do NOT include conversational text.

JSON STRUCTURE:
{
  "name": "Medicine Name",
  "generic_name": "Generic Name (for buying online)",
  "estimated_cost_inr": number, // Estimated price in INR. Return 0 if unknown.
  "usage": "Treats X, Y (in ${language})",
  "side_effects": "Common side effects (in ${language})",
  "dosage_form": "Tablet/Syrup/etc.",
  "best_intake_time": "e.g., After food (in ${language})",
  "dosage_by_age": "Adults: X, Kids: Y (in ${language})",
  "warning": "Key warnings (in ${language})"
}

FALLBACK:
If the image is not a medicine or text is unreadable, return:
{
  "name": "Unknown",
  "warning": "Could not identify. Please consult a doctor.",
  "usage": "N/A"
}
`;

const dietSystemPrompt = (language = 'English') => `
You are a customized Dietician AI. Create a detailed weekly diet plan based on the user's health metrics.

RULES:
1. Output ONLY valid JSON.
2. Analyze the provided health metrics (e.g., High Sugar, Low Hemoglobin).
3. Create a structured plan with:
   - 'analysis': Brief assessment of health status in ${language}.
   - 'recommendations': Specific food to eat and avoid in ${language}.
   - 'daily_plan': A sample 3-meal plan (Breakfast, Lunch, Dinner) with food names in ${language}.
   - 'hydration_goal': Water intake suggestion in ${language}.
`;

const scheduleSystemPrompt = (language = 'English') => `
You are a Smart Health Scheduler AI. Your goal is to create a weekly schedule of reminders based on user goals or health data.

RULES:
1. Output ONLY valid JSON.
2. The output must be an array of objects.
3. Each object must have:
    - 'title': Extremely short action name (max 4 words, e.g. "Drink Water", "Morning Jog"). NO goals or descriptions here.
    - 'time': Time in 24h format (e.g., "07:00", "22:00").
    - 'type': One of "medication", "workout", "diet", "checkup".
    - 'days': Array of days (e.g., ["Monday", "Wednesday", "Friday"]) OR "Daily".
    - 'reason': Brief reason why this is suggested in ${language}.
`;

/**
 * Converts a File object to a Base64 string.
 * @param {File} file 
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(error);
    });
}

/**
 * Analyzes an image using Google Generative AI (Gemini).
 * @param {File} file - The image file to analyze.
 * @param {'report' | 'food' | 'meds'} type - The type of analysis to perform.
 * @param {string} language - The language for the result.
 * @returns {Promise<Object>} - The parsed JSON result.
 */
export async function analyzeImage(file, type, language = 'English') {


    try {
        const base64Image = await fileToBase64(file);

        let systemInstruction = '';
        if (type === 'food') systemInstruction = foodSystemPrompt(language);
        else if (type === 'meds') systemInstruction = medicineSystemPrompt(language);
        else systemInstruction = reportSystemPrompt(language);

        // For Google Generative AI SDK, we send the image as a Part
        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: file.type
            },
        };

        // Use executeGeneration helper
        const response = await executeGeneration({
            systemInstruction: systemInstruction,
            prompt: [imagePart] // Passed as prompt content
        });

        const text = response.text();

        // Robust JSON extraction: Find first { and last }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("AI Analysis Failed:", error);
        throw error;
    }
}

/**
 * Searches for a medicine by name.
 * @param {string} query 
 * @param {string} language 
 * @returns {Promise<Object>}
 */
export async function searchMedicine(query, language = 'English') {


    try {
        const searchPrompt = `
            You are a medical pharmacist. Provide detailed information about the medicine "${query}".
            Output valid JSON only matching this format:
            {
                "name": "${query}",
                "usage": "...",
                "side_effects": "...",
                "dosage_form": "...",
                "best_intake_time": "...",
                "dosage_by_age": "...",
                "warning": "..."
            }
            Provide all descriptive values in ${language} language.
        `;

        const response = await executeGeneration({
            prompt: [searchPrompt]
        });
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error("Medicine Search Failed:", error);
        throw error;
    }
}

/**
 * Generates a diet plan based on health metrics.
 * @param {Object} metrics 
 * @param {string} language 
 * @returns {Promise<Object>}
 */
export async function generateDietPlan(metrics, language = 'English') {


    try {
        const prompt = `
            Generates a diet plan based on these health metrics:
            ${JSON.stringify(metrics)}
        `;

        const response = await executeGeneration({
            systemInstruction: dietSystemPrompt(language),
            prompt: [prompt]
        });
        const text = response.text();

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Diet Generation Failed:", error);
        throw error;
    }
}

/**
 * Generates a smart schedule based on user goal or profile.
 * @param {string} goal 
 * @param {Object} profile 
 * @param {string} language 
 * @returns {Promise<Array>}
 */
// Text-based medicine lookup for Presets
export async function getMedicineDetails(medicineName, language = 'English') {


    const prompt = `
    You are a pharmaceutical expert.
    TASK: Provide detailed medical usage info for the medicine: "${medicineName}".

    OUTPUT FORMAT:
    Return ONLY valid raw JSON. Do NOT include Markdown.
    
    JSON STRUCTURE:
    {
      "name": "${medicineName}",
      "usage": "Treats X, Y (in ${language})",
      "side_effects": "Common side effects",
      "dosage_form": "Tablet/Syrup",
      "best_intake_time": "Time (Morning/Night) & Relation to food (Before/After)",
      "dosage_by_age": "Adults: X, Kids: Y",
      "warning": "Contraindications and 'Don'ts' (e.g. Don't drive, Don't take with alcohol)"
    }
    `;

    try {
        const response = await executeGeneration({
            prompt: [prompt]
        });
        const text = response.text();

        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Medicine Lookup Failed:", error);
        throw error; // Throw original error to see if it's API or Safety related
    }
}

export async function generateSmartSchedule(goal, profile, language = 'English') {


    try {
        const prompt = `
            Generate a healthy weekly schedule for a user with the following profile/goal:
            Goal: ${goal}
            Profile: ${JSON.stringify(profile)}
            
            Focus on actionable reminders for medication, workout, and diet.
        `;

        const response = await executeGeneration({
            systemInstruction: scheduleSystemPrompt(language),
            prompt: [prompt]
        });
        const text = response.text();

        // For array output
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON Array found");

        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Schedule Generation Failed:", error);
        throw error;
    }
}

/**
 * Chat with the Health Assistant.
 * @param {Array} history - Previous chat history [{role: 'user'|'model', parts: [{text: ...}]}]
 * @param {string} message - User's message
 * @param {Object} context - User context (profile, etc.)
 * @returns {Promise<string>}
 */
export async function chatWithHealthAssistant(history, message, context) {


    try {
        const systemText = `
                You are "Health Assist", a helpful, empathetic, and knowledgeable personal health companion.
                
                USER CONTEXT:
                ${JSON.stringify(context)}

                RULES:
                1. Keep answers concise (max 3-4 sentences initially, expand if asked).
                2. Be encouraging and positive.
                3. If medical advice is asked, give general wellness info but ALWAYS disclaim to consult a doctor for serious issues.
                4. Use the user's name if known.
                5. Output in Markdown (bold key terms).
                `;

        const response = await executeGeneration({
            type: 'chat',
            history: history,
            message: message,
            systemInstruction: {
                role: "system",
                parts: [{ text: systemText }]
            }
        });

        return response.text();
    } catch (error) {
        console.error("Chat Failed:", error);
        return `Connection Error: ${error.message || "Unknown error"}. Please check your API Key or Network.`;
    }
}

