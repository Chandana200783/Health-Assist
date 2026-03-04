import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2, AlertTriangle, CheckCircle, Utensils, Download, FileText, History, TrendingUp, TrendingDown, Minus, Calendar, Check, Zap } from 'lucide-react';
import { analyzeImage, generateDietPlan } from '../services/aiService';
import { saveHealthMetric, getHealthMetrics, saveReminder } from '../services/dbService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthState } from '../hooks/useAuth';
import { useProfile, useSettings } from '../App';
import ReactMarkdown from 'react-markdown';

export default function ScanReport() {
    const { user } = useAuthState();
    const { currentProfile } = useProfile();
    const { language } = useSettings();
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [dietPlan, setDietPlan] = useState(null);
    const [dietLoading, setDietLoading] = useState(false);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [scheduleAdded, setScheduleAdded] = useState(false);

    useEffect(() => {
        if (user && currentProfile) {
            loadHistory();
        }
    }, [user, currentProfile]);

    const loadHistory = async () => {
        const profileId = currentProfile?.id || user.uid;
        const data = await getHealthMetrics(profileId);
        // Filter only 'lab_report' type
        setHistory(data.filter(d => d.type === 'lab_report'));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setResult(null);
            setError(null);
            setDietPlan(null);
            setScheduleAdded(false);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setLoading(true);
        setError(null);
        setDietPlan(null);
        setScheduleAdded(false);

        try {
            const data = await analyzeImage(image, 'report', language);
            setResult(data);
            if (user) {
                const profileId = currentProfile?.id || user.uid;
                await saveHealthMetric(profileId, 'lab_report', data);
                loadHistory(); // Refresh history
            }
        } catch (err) {
            setError("Failed to analyze report. Please ensure the image is clear and try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDemoAnalysis = async () => {
        setLoading(true);
        setError(null);
        setDietPlan(null);
        setScheduleAdded(false);

        try {
            // Mock Data for Demo
            const demoData = {
                health_score: 65,
                glucose_level: { value: 180, unit: "mg/dL" },
                total_cholesterol: { value: 240, unit: "mg/dL" },
                blood_sugar_fasting: { value: 110, unit: "mg/dL" },
                detailed_analysis: "**DEMO ANALYSIS**\n\n*   **Glucose:** High (180 mg/dL). Immediate attention required.\n*   **Cholesterol:** High (240 mg/dL). Lifestyle changes recommended.\n*   **Overall:** Health score is impacted by metabolic markers."
            };

            setResult(demoData);
            if (user) {
                const profileId = currentProfile?.id || user.uid;
                await saveHealthMetric(profileId, 'lab_report', demoData);
                loadHistory();
            }
        } catch (err) {
            console.error(err);
            setError("Demo failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateDiet = async () => {
        if (!result) return;
        setDietLoading(true);
        try {
            const plan = await generateDietPlan(result, language);
            setDietPlan(plan);
        } catch (err) {
            alert("Failed to generate diet plan.");
        } finally {
            setDietLoading(false);
        }
    }

    const handleAddToScheduler = async () => {
        if (!dietPlan || !user) return;
        const profileId = currentProfile?.id || user.uid;

        try {
            const meals = [
                { name: 'Breakfast', time: '08:00', suggestion: dietPlan.daily_plan?.breakfast },
                { name: 'Lunch', time: '13:00', suggestion: dietPlan.daily_plan?.lunch },
                { name: 'Dinner', time: '20:00', suggestion: dietPlan.daily_plan?.dinner }
            ];

            const promises = meals.map(meal => {
                if (!meal.suggestion) return Promise.resolve();
                return saveReminder(profileId, {
                    title: `Eat ${meal.name}: ${meal.suggestion}`,
                    date: new Date().toISOString().split('T')[0], // Today
                    time: meal.time,
                    type: 'diet'
                });
            });

            if (dietPlan.hydration_goal) {
                promises.push(saveReminder(profileId, {
                    title: `Drink Water (Goal: ${dietPlan.hydration_goal})`,
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    type: 'diet'
                }));
            }

            await Promise.all(promises);
            setScheduleAdded(true);
            // Optionally notify user via toast (local state)
        } catch (err) {
            console.error(err);
            alert("Failed to add to scheduler.");
        }
    };

    const handleDownloadPDF = () => {
        if (!dietPlan) return;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(40, 100, 255);
        doc.text("Personal Health Companion", 105, 20, null, null, "center");

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("AI Diet Plan Report", 105, 30, null, null, "center");

        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);

        // Analysis
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Health Analysis", 20, 45);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const splitAnalysis = doc.splitTextToSize(dietPlan.analysis, 170);
        doc.text(splitAnalysis, 20, 52);

        let finalY = 52 + (splitAnalysis.length * 5) + 5;

        // Recommendations
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Recommendations", 20, finalY);

        finalY += 7;
        doc.setFontSize(11);
        doc.setTextColor(0, 100, 0);
        doc.text(`EAT: ${dietPlan.recommendations?.eat?.join(", ")}`, 20, finalY);

        finalY += 7;
        doc.setTextColor(200, 0, 0);
        doc.text(`AVOID: ${dietPlan.recommendations?.avoid?.join(", ")}`, 20, finalY);

        finalY += 10;
        doc.setTextColor(0, 0, 0);

        // Daily Plan Table
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Daily Meal Plan", 20, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Meal', 'Suggestion']],
            body: [
                ['Breakfast', dietPlan.daily_plan?.breakfast],
                ['Lunch', dietPlan.daily_plan?.lunch],
                ['Dinner', dietPlan.daily_plan?.dinner],
            ],
            theme: 'grid',
            headStyles: { fillColor: [66, 133, 244] },
        });

        // Hydration
        const finalTableY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setTextColor(0, 100, 200);
        doc.text(`Target Hydration: ${dietPlan.hydration_goal}`, 20, finalTableY);

        // Disclaimer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("Disclaimer: AI-generated advice. Consult a doctor.", 105, 280, null, null, "center");

        doc.save("diet_plan.pdf");
    };

    const getStatusIcon = (index) => {
        if (index === 0 && history.length > 1) {
            return <TrendingUp size={16} className="text-green-500" />;
        }
        return <Minus size={16} className="text-gray-400" />;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Medical Report Analysis</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column: Upload & History */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            {preview ? (
                                <div className="relative">
                                    <img src={preview} alt="Upload preview" className="max-h-96 mx-auto rounded-lg shadow-sm" />
                                    <button onClick={() => { setImage(null); setPreview(null); setResult(null); setDietPlan(null); }} className="absolute -top-3 -right-3 p-2 bg-red-500 rounded-full hover:bg-red-600 shadow-lg text-white">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="report-upload" />
                                    <label htmlFor="report-upload" className="cursor-pointer flex flex-col items-center">
                                        <Upload size={48} className="text-teal-500 mb-4 bg-teal-50 dark:bg-teal-900/20 p-3 rounded-xl box-content" />
                                        <p className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Click to Upload Report</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm">Supported formats: JPG, PNG</p>
                                    </label>
                                </>
                            )}
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={handleAnalyze}
                                disabled={!image || loading}
                                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition shadow-lg shadow-teal-600/20"
                            >
                                {loading ? <><Loader2 className="animate-spin" /> Analyzing...</> : <><CheckCircle size={20} /> Analyze Report</>}
                            </button>
                        </div>

                        <div className="mt-4 border-t pt-4 border-gray-100 dark:border-gray-700">
                            <button
                                onClick={handleDemoAnalysis}
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <><Zap size={20} /> Run Demo Analysis (AI Mock)</>}
                            </button>
                        </div>

                        <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-start gap-3 border border-orange-100 dark:border-orange-800">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <p className="text-sm">For information purposes only. Always verify results with a medical professional.</p>
                        </div>
                    </div>

                    {/* Report History */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                            <History size={18} className="text-gray-400" /> Past Reports
                        </h3>
                        {history.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No reports scanned yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((h, idx) => (
                                    <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 hover:border-teal-200 dark:hover:border-teal-500/50 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white dark:bg-gray-600 p-2 rounded-lg border border-gray-100 dark:border-gray-500 text-teal-600 dark:text-teal-400">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">Lab Report</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {h.date ? new Date(h.date.seconds * 1000).toLocaleDateString() : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {idx === 0 && <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">New</span>}
                                            <div title="Status vs Previous">
                                                {getStatusIcon(idx)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                {result ? (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 h-fit">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                            <FileText className="text-teal-600 dark:text-teal-400" />
                            Analysis Results
                        </h2>

                        {(result.summary || result.detailed_analysis) && (
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                                <h3 className="text-sm text-gray-500 dark:text-gray-400 uppercase font-bold mb-2 tracking-wider">Detailed Analysis</h3>
                                <div className="leading-relaxed text-gray-800 dark:text-gray-200 text-sm markdown-body">
                                    <ReactMarkdown>{result.detailed_analysis || result.summary}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {Object.entries(result).map(([key, value]) => {
                                if (key === 'summary' || key === 'detailed_analysis' || key === 'health_score') return null;

                                // Handle case where value is just a number or string (like health_score if we wanted to show it here, or other metadata)
                                if (typeof value !== 'object' || value === null) {
                                    return (
                                        <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                            <span className="capitalize text-gray-600 dark:text-gray-300">{key.replace(/_/g, ' ')}</span>
                                            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                                {value}
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                        <span className="capitalize text-gray-600 dark:text-gray-300">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                            {value.value} <span className="text-gray-500 dark:text-gray-400 text-sm font-sans">{value.unit}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {result && !dietPlan && (
                            <button
                                onClick={handleGenerateDiet}
                                disabled={dietLoading}
                                className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-600/20"
                            >
                                {dietLoading ? <Loader2 className="animate-spin" /> : <><Utensils size={20} /> Generate Diet Plan based on Report</>}
                            </button>
                        )}

                        {dietPlan && (
                            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Utensils className="text-green-500" /> Recommended Diet Plan</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddToScheduler}
                                            disabled={scheduleAdded}
                                            className={`text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 transition font-medium ${scheduleAdded ? 'bg-teal-100 text-teal-700' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                                        >
                                            {scheduleAdded ? <><Check size={16} /> Added</> : <><Calendar size={16} /> Add to Schedule</>}
                                        </button>
                                        <button onClick={handleDownloadPDF} className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition font-medium">
                                            <Download size={16} /> PDF
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 mb-4">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Analysis</h4>
                                    <p className="text-gray-700 dark:text-gray-300">{dietPlan.analysis}</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl border border-green-100 dark:border-green-800">
                                        <span className="font-bold block mb-1">Eat More</span>
                                        <ul className="list-disc pl-4 text-sm space-y-1">{dietPlan.recommendations?.eat?.map(item => <li key={item}>{item}</li>)}</ul>
                                    </div>
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800">
                                        <span className="font-bold block mb-1">Avoid</span>
                                        <ul className="list-disc pl-4 text-sm space-y-1">{dietPlan.recommendations?.avoid?.map(item => <li key={item}>{item}</li>)}</ul>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-gray-900 dark:text-white">Daily Sample</h4>
                                    <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm flex justify-between shadow-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Breakfast</span>
                                        <span className="text-gray-900 dark:text-gray-200 font-medium">{dietPlan.daily_plan?.breakfast}</span>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm flex justify-between shadow-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Lunch</span>
                                        <span className="text-gray-900 dark:text-gray-200 font-medium">{dietPlan.daily_plan?.lunch}</span>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm flex justify-between shadow-sm">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">Dinner</span>
                                        <span className="text-gray-900 dark:text-gray-200 font-medium">{dietPlan.daily_plan?.dinner}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="hidden lg:flex items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500">
                        <div className="text-center">
                            <FileText size={48} className="mx-auto mb-4 opacity-50" />
                            <p>Upload a report to see analysis and diet plan</p>
                        </div>
                    </div>
                )}


                {error && (
                    <div className="lg:col-span-2 p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-800">
                        <p className="font-semibold">Error</p>
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
