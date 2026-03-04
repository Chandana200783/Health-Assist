import React, { useState, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuth';
import { useProfile, useSettings } from '../App';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Users, Activity, Heart, Search, ChevronRight, X, ChevronDown,
    Droplets, Utensils, Pill, Upload, ArrowLeftCircle, Loader2,
    Dumbbell, Timer, Zap, Sunrise, Wind, Flame, Edit2, Lightbulb, RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { analyzeImage } from '../services/aiService';
import { getHealthMetrics, saveHealthMetric } from '../services/dbService';
import WorkoutTimer from '../components/WorkoutTimer';

// Realistic Mock Data for Charts (2 lines: Before Food, After Food)
const mockHealthData = [
    { name: 'Mon', beforeFood: 95, afterFood: 135 },
    { name: 'Tue', beforeFood: 92, afterFood: 128 },
    { name: 'Wed', beforeFood: 98, afterFood: 142 },
    { name: 'Thu', beforeFood: 94, afterFood: 130 },
    { name: 'Fri', beforeFood: 91, afterFood: 125 },
    { name: 'Sat', beforeFood: 96, afterFood: 138 },
    { name: 'Sun', beforeFood: 93, afterFood: 132 },
];

const zeroHealthData = mockHealthData.map(d => ({ ...d, beforeFood: 0, afterFood: 0 }));

export default function Dashboard() {
    const { user } = useAuthState();
    const { currentProfile, setCurrentProfile, familyMembers } = useProfile();
    const { theme } = useSettings();
    const navigate = useNavigate();

    const [healthScore, setHealthScore] = useState(0);
    const [healthBreakdown, setHealthBreakdown] = useState({ bmi: 0, glucose: 0, cholesterol: 0 }); // Added breakdown state
    const [hoveredChartIndex, setHoveredChartIndex] = useState(null); // Added state
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Timer State
    const [selectedWorkout, setSelectedWorkout] = useState(null);

    useEffect(() => {
        if (user && currentProfile) {
            const fetchData = async () => {
                try {
                    // Fetch latest lab report directly from health_metrics
                    const metrics = await getHealthMetrics(user.uid, currentProfile.id);
                    // Helper to safely parse numbers
                    const parseValue = (val) => {
                        if (typeof val === 'number') return val;
                        if (typeof val === 'string') {
                            const match = val.match(/(\d+)/);
                            return match ? parseInt(match[0]) : 0;
                        }
                        return 0;
                    };

                    // 1. BMI: Find latest data with height AND weight
                    const latestBmiMetric = metrics.find(m =>
                        (m.metrics?.height?.value && m.metrics?.weight?.value) ||
                        (m.height?.value && m.weight?.value)
                    );

                    if (latestBmiMetric) {
                        const mData = latestBmiMetric.metrics || latestBmiMetric;
                        const h = parseValue(mData.height?.value);
                        const w = parseValue(mData.weight?.value);
                        setBmiData({ height: h, weight: w });
                    } else {
                        setBmiData({ height: 0, weight: 0 });
                    }

                    // 2. Glucose: Find latest with glucose data
                    const latestGlucoseMetric = metrics.find(m =>
                        m.metrics?.glucose_level?.value || m.metrics?.blood_sugar_fasting?.value || m.metrics?.blood_sugar_pp?.value
                    );

                    const gBefore = latestGlucoseMetric ? parseValue(latestGlucoseMetric.metrics.blood_sugar_fasting?.value) : 0;
                    // Prefer PP, then random/generic glucose_level
                    const gAfter = latestGlucoseMetric ? (parseValue(latestGlucoseMetric.metrics.blood_sugar_pp?.value) || parseValue(latestGlucoseMetric.metrics.glucose_level?.value)) : 0;

                    // 3. Cholesterol: Find latest with cholesterol data
                    const latestCholesterolMetric = metrics.find(m =>
                        m.metrics?.total_cholesterol?.value || m.metrics?.cholesterol?.value
                    );
                    const cholesterolVal = latestCholesterolMetric ?
                        (parseValue(latestCholesterolMetric.metrics.total_cholesterol?.value) || parseValue(latestCholesterolMetric.metrics.cholesterol?.value)) : 0;

                    setBiologicalData({
                        glucose_before: gBefore,
                        glucose_after: gAfter,
                        cholesterol: cholesterolVal,
                        unit_gl: 'mg/dL',
                        unit_ch: 'mg/dL'
                    });

                    // 4. Health Score: From latest lab report OR dynamic calc
                    const latestReport = metrics.find(m => m.type === 'lab_report');
                    if (latestReport && latestReport.metrics) {
                        const data = latestReport.metrics;
                        setHealthScore(typeof data.health_score === 'number' ? data.health_score : 50);
                        // Backwards compatibility or recalc breakdown if missing
                        if (data.health_breakdown) {
                            setHealthBreakdown(data.health_breakdown);
                        } else {
                            // Fallback recalc with available data
                            const h = latestBmiMetric ? (latestBmiMetric.metrics?.height?.value || latestBmiMetric.height?.value || 0) / 100 : 0;
                            const w = latestBmiMetric ? (latestBmiMetric.metrics?.weight?.value || latestBmiMetric.weight?.value || 0) : 0;
                            const bmi = h > 0 ? w / (h * h) : 0;
                            const { breakdown } = calculateDynamicHealthScore(bmi, gAfter || gBefore, cholesterolVal);
                            setHealthBreakdown(breakdown);
                        }
                    } else {
                        // Dynamic Calculation if no report
                        const h = latestBmiMetric ? (latestBmiMetric.metrics?.height?.value || latestBmiMetric.height?.value || 0) / 100 : 0;
                        const w = latestBmiMetric ? (latestBmiMetric.metrics?.weight?.value || latestBmiMetric.weight?.value || 0) : 0;
                        const bmi = h > 0 ? w / (h * h) : 0;

                        // Use After food for score calculation logic (conservative)
                        const { score, breakdown } = calculateDynamicHealthScore(bmi, gAfter || gBefore, cholesterolVal);
                        setHealthScore(score);
                        setHealthBreakdown(breakdown);
                    }


                } catch (e) {
                    console.error("Error fetching dashboard data:", e);
                }
            };
            fetchData();
        }
    }, [user, currentProfile]);

    const [biologicalData, setBiologicalData] = useState({
        glucose_before: 0,
        glucose_after: 0,
        cholesterol: 0,
        unit_gl: 'mg/dL',
        unit_ch: 'mg/dL'
    });

    const [bmiData, setBmiData] = useState({ height: 0, weight: 0 });

    // Manual Data Entry States
    const [showBmiModal, setShowBmiModal] = useState(false);
    const [manualBmiInput, setManualBmiInput] = useState({ height: '', weight: '' });

    const [showBioModal, setShowBioModal] = useState(false);
    const [manualBioInput, setManualBioInput] = useState({ glucose_before: '', glucose_after: '', cholesterol: '' });


    const calculateBMI = () => {
        if (!bmiData.height || !bmiData.weight) return null;
        const heightM = bmiData.height / 100; // Assuming cm
        const bmi = (bmiData.weight / (heightM * heightM)).toFixed(1);

        let category = '';
        let color = '';
        let tip = '';

        if (bmi < 18.5) {
            category = 'Underweight';
            color = 'text-blue-500';
            tip = 'Focus on nutrient-dense foods to gain healthy weight.';
        } else if (bmi < 24.9) {
            category = 'Normal';
            color = 'text-green-500';
            tip = 'Great job! Maintain a balanced diet and regular exercise.';
        } else if (bmi < 29.9) {
            category = 'Overweight';
            color = 'text-orange-500';
            tip = 'Incorporate more cardio and portion control into your routine.';
        } else {
            category = 'Obese';
            color = 'text-red-500';
            tip = 'Consult a specialist for a personalized weight management plan.';
        }

        return { value: bmi, category, color };
    };

    const bmiInfo = calculateBMI();

    // Health Suggestions Logic
    const getHealthSuggestion = (bmiVal, gVal, cVal) => {
        const tips = [];

        // BMI Tips
        if (bmiVal >= 25) {
            tips.push("Swap one meal a day for a protein-rich salad.");
            tips.push("Aim for a 30-minute brisk walk daily to boost metabolism.");
            tips.push("Drinking water before meals can help with portion control.");
            tips.push("Reduce processed carb intake to manage weight effectively.");
            tips.push("Try intermittent fasting (16:8) after consulting a doctor.");
            tips.push("Track your daily calorie intake to stay within goals.");
        } else if (bmiVal < 18.5) {
            tips.push("Include healthy fats like avocados and nuts in diet.");
            tips.push("Strength training helps build healthy muscle mass.");
            tips.push("Eat more frequently—try 5-6 smaller meals a day.");
            tips.push("Add protein smoothies to your daily routine.");
            tips.push("Focus on nutrient-dense foods, not just empty calories.");
        }

        // Glucose Tips
        if (gVal > 140) {
            tips.push("Fiber-rich foods like oats help stabilize blood sugar.");
            tips.push("Avoid sugary drinks; opt for water or herbal tea.");
            tips.push("A short walk after meals can significantly lower glucose.");
            tips.push("Include cinnamon in your diet; it may lower blood sugar.");
            tips.push("Monitor portion sizes, especially for carbohydrates.");
            tips.push("Stay hydrated to help kidneys flush out excess sugar.");
        }

        // Cholesterol Tips
        if (cVal >= 200) {
            tips.push("Reduce saturated fats found in red meat and dairy.");
            tips.push("Eat more soluble fiber from beans and fruits.");
            tips.push("Omega-3s in fish like salmon support heart health.");
            tips.push("Use olive oil instead of butter for cooking.");
            tips.push("Add a handful of walnuts to your daily snack.");
            tips.push("Avoid trans fats often found in fried foods.");
        }

        // General Wellness (Fallback)
        if (tips.length === 0) {
            tips.push("Stay hydrated! Aim for 8 glasses of water a day.");
            tips.push("Consistent sleep schedule improves overall health.");
            tips.push("Practice mindfulness to reduce stress levels.");
            tips.push("Take the stairs instead of the elevator for extra steps.");
            tips.push("Stretch daily to improve flexibility and reduce pain.");
            tips.push("Limit screen time before bed for better sleep quality.");
        }

        return tips[Math.floor(Math.random() * tips.length)];
    };

    const [currentSuggestion, setCurrentSuggestion] = useState("");

    // Update suggestion when metrics change or on mount
    useEffect(() => {
        const bmiVal = bmiInfo ? Number(bmiInfo.value) : 0;
        const gVal = biologicalData.glucose_after || biologicalData.glucose_before;
        const cVal = biologicalData.cholesterol;
        setCurrentSuggestion(getHealthSuggestion(bmiVal, gVal, cVal));
    }, [biologicalData, bmiData]);

    const refreshSuggestion = () => {
        const bmiVal = bmiInfo ? Number(bmiInfo.value) : 0;
        const gVal = biologicalData.glucose_after || biologicalData.glucose_before;
        const cVal = biologicalData.cholesterol;
        let newSug = getHealthSuggestion(bmiVal, gVal, cVal);
        // Retry once to avoid duplicate
        if (newSug === currentSuggestion) newSug = getHealthSuggestion(bmiVal, gVal, cVal);
        setCurrentSuggestion(newSug);
    };

    const handleReportUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // For this task, user complained about switching, not deletion sync.

        // If we removed the currently selected profile, switch back to main
        // if (currentProfile.id === memberId) {
        //     handleSwitchProfile(null);
        // }
    };

    const handleSwitchProfile = (member) => {
        if (member) {
            setCurrentProfile({ id: member.id, name: member.name, isMain: false });
        } else {
            setCurrentProfile({ id: user.uid, name: user.displayName || 'User', isMain: true });
        }
        setShowProfileMenu(false);
    };
    const handleStartWorkout = (workout) => {
        setSelectedWorkout(workout);
    };

    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981'; // Green
        if (score >= 50) return '#F59E0B'; // Orange
        return '#EF4444'; // Red
    };

    const scoreColor = getScoreColor(healthScore);

    // Generate dynamic graph data based on actual glucose level
    const currentHealthData = React.useMemo(() => {
        // Use defaults if 0
        const baseBefore = biologicalData.glucose_before > 0 ? biologicalData.glucose_before : 90;
        const baseAfter = biologicalData.glucose_after > 0 ? biologicalData.glucose_after : 120;

        // Simulate a realistic week trend
        // We will make 'Today' (Sun or last point) equal to the actual values if they exist
        return [
            { name: 'Mon', beforeFood: Math.floor(baseBefore * 0.95), afterFood: Math.floor(baseAfter * 0.92) },
            { name: 'Tue', beforeFood: Math.floor(baseBefore * 1.02), afterFood: Math.floor(baseAfter * 1.05) },
            { name: 'Wed', beforeFood: Math.floor(baseBefore * 0.98), afterFood: Math.floor(baseAfter * 0.95) },
            { name: 'Thu', beforeFood: Math.floor(baseBefore * 1.05), afterFood: Math.floor(baseAfter * 1.02) },
            { name: 'Fri', beforeFood: Math.floor(baseBefore * 0.92), afterFood: Math.floor(baseAfter * 0.98) },
            { name: 'Sat', beforeFood: Math.floor(baseBefore * 1.01), afterFood: Math.floor(baseAfter * 1.03) },
            { name: 'Sun', beforeFood: baseBefore, afterFood: baseAfter },
        ];
    }, [biologicalData.glucose_before, biologicalData.glucose_after]);



    // Helper for visual feedback colors
    const getMetricStatus = (value, type) => {
        if (!value) return { color: 'border-gray-100 dark:border-gray-700', label: 'No Data', text: 'text-gray-400' };

        const val = Number(value);
        if (type === 'glucose' || type === 'glucose_before') {
            // Fasting/Before Food
            if (val < 100) return { color: 'border-green-500', label: 'Normal', text: 'text-green-600' };
            if (val <= 125) return { color: 'border-yellow-500', label: 'Warning', text: 'text-yellow-600' };
            return { color: 'border-red-500', label: 'High', text: 'text-red-600' };
        }
        if (type === 'glucose_after') {
            // Post-Prandial (After Food) - Higher thresholds
            if (val < 140) return { color: 'border-green-500', label: 'Normal', text: 'text-green-600' };
            if (val <= 199) return { color: 'border-yellow-500', label: 'Warning', text: 'text-yellow-600' };
            return { color: 'border-red-500', label: 'High', text: 'text-red-600' };
        }
        if (type === 'cholesterol') {
            // Total Cholesterol
            if (val < 200) return { color: 'border-green-500', label: 'Optimal', text: 'text-green-600' };
            if (val <= 239) return { color: 'border-yellow-500', label: 'Borderline', text: 'text-yellow-600' };
            return { color: 'border-red-500', label: 'High', text: 'text-red-600' };
        }
        return { color: 'border-gray-100 dark:border-gray-700', label: '--', text: 'text-gray-400' };
    };

    // Helper to calculate dynamic score based on available data
    const calculateDynamicHealthScore = (bmiVal, glucoseVal, cholVal, isAfterFood = false) => {
        // We divide 100 points into: BMI (34), Glucose (33), Cholesterol (33)
        const maxBMI = 34;
        const maxGlu = 33;
        const maxChol = 33;

        let scoreBMI = maxBMI;
        let scoreGlu = maxGlu;
        let scoreChol = maxChol;

        // BMI Deductions (Base 34)
        if (bmiVal) {
            if (bmiVal < 18.5) scoreBMI -= 5; // Underweight
            else if (bmiVal >= 25 && bmiVal < 30) scoreBMI -= 8; // Overweight
            else if (bmiVal >= 30) scoreBMI -= 15; // Obese
            // Normal (18.5-24.9) keeps full points
        } else {
            // If no data, we assume full for potential, but practically it should be 0 or gray. 
            // However, request is to show 'empty' as light gray. 
            // So if value is missing, we give it 0 points for the chart 'colored' part?
            // Let's assume missing data doesn't contribute to the score.
            scoreBMI = 0;
        }

        // Glucose Deductions (Base 33)
        if (glucoseVal) {
            if (isAfterFood) {
                // PP
                if (glucoseVal >= 140 && glucoseVal <= 199) scoreGlu -= 10;
                else if (glucoseVal > 199) scoreGlu -= 20;
            } else {
                // Fasting
                if (glucoseVal >= 100 && glucoseVal <= 125) scoreGlu -= 10;
                else if (glucoseVal > 125) scoreGlu -= 20;
            }
        } else {
            scoreGlu = 0;
        }

        // Ensure non-negative
        scoreGlu = Math.max(0, scoreGlu);

        // Cholesterol Deductions (Base 33)
        if (cholVal) {
            if (cholVal >= 200 && cholVal <= 239) scoreChol -= 10;
            else if (cholVal > 239) scoreChol -= 20;
        } else {
            scoreChol = 0;
        }
        scoreChol = Math.max(0, scoreChol);

        const totalScore = scoreBMI + scoreGlu + scoreChol;

        return {
            score: totalScore,
            breakdown: { bmi: scoreBMI, glucose: scoreGlu, cholesterol: scoreChol }
        };
    };

    const healthChartData = React.useMemo(() => {
        const { bmi, glucose, cholesterol } = healthBreakdown;

        // Colors for each component
        const getComponentColor = (val, max, type) => {
            if (val === 0) return '#E5E7EB'; // No Data
            const ratio = val / max;
            if (ratio >= 0.8) return '#10B981'; // Good (Green)
            if (ratio >= 0.5) return '#F59E0B'; // Warning (Orange)
            return '#EF4444'; // Bad (Red)
        };

        const data = [
            { name: 'BMI', value: bmi, color: getComponentColor(bmi, 34, 'bmi') },
            { name: 'Glucose', value: glucose, color: getComponentColor(glucose, 33, 'glu') },
            { name: 'Cholesterol', value: cholesterol, color: getComponentColor(cholesterol, 33, 'chol') },
        ];

        // Add empty filler if total < 100
        const total = bmi + glucose + cholesterol;
        if (total < 100) {
            data.push({ name: 'Potentials', value: 100 - total, color: '#E5E7EB' }); // Light gray
        }

        return data;
    }, [healthBreakdown]);

    const handleSaveBiological = async (e) => {
        e.preventDefault();
        const gB = Number(manualBioInput.glucose_before);
        const gA = Number(manualBioInput.glucose_after);
        const c = Number(manualBioInput.cholesterol);

        if (gB > 0 || gA > 0 || c > 0) {
            const metrics = {};
            if (gB > 0) metrics.blood_sugar_fasting = { value: gB, unit: 'mg/dL' };
            if (gA > 0) metrics.blood_sugar_pp = { value: gA, unit: 'mg/dL' };
            if (c > 0) metrics.total_cholesterol = { value: c, unit: 'mg/dL' };

            await saveHealthMetric(user.uid, 'manual_bio', metrics, null, currentProfile.id);

            // Recalculate Score with new values + existing BMI
            const h = bmiData.height ? Number(bmiData.height) / 100 : 0;
            const w = bmiData.weight ? Number(bmiData.weight) : 0;
            const bmi = h > 0 ? w / (h * h) : 0;

            // Use After food for score, fallback to Before
            // IMPORTANT: Pass flag if using After food
            // Note: If falling back to existing data, we need to know if existing was PP.
            // Simplified: If manual gA entered, use PP logic. If manual gB entered (and no gA), use Fasting.
            // If neither entered (only Chol update), check existing state.

            let usePP = false;
            let finalG = 0;

            if (gA > 0) { usePP = true; finalG = gA; }
            else if (gB > 0) { usePP = false; finalG = gB; }
            else if (biologicalData.glucose_after > 0) { usePP = true; finalG = biologicalData.glucose_after; }
            else { usePP = false; finalG = biologicalData.glucose_before; }

            const cVal = c > 0 ? c : biologicalData.cholesterol;

            const { score: newScore, breakdown } = calculateDynamicHealthScore(bmi, finalG, cVal, usePP);

            // Update local state
            setBiologicalData(prev => ({
                ...prev,
                glucose_before: gB > 0 ? gB : prev.glucose_before,
                glucose_after: gA > 0 ? gA : prev.glucose_after,
                cholesterol: cVal
            }));
            setHealthScore(newScore);
            setHealthBreakdown(breakdown);
            setShowBioModal(false);
        }
    };

    const handleSaveBMI = async (e) => {
        e.preventDefault();
        const h = Number(manualBmiInput.height);
        const w = Number(manualBmiInput.weight);
        if (h > 0 && w > 0) {

            // Save to DB
            await saveHealthMetric(user.uid, 'manual_bmi', { height: { value: h, unit: 'cm' }, weight: { value: w, unit: 'kg' } }, null, currentProfile.id);

            // Recalculate Score
            const bmi = w / ((h / 100) * (h / 100));

            const usePP = biologicalData.glucose_after > 0;
            const gVal = biologicalData.glucose_after || biologicalData.glucose_before;

            const { score: newScore, breakdown } = calculateDynamicHealthScore(bmi, gVal, biologicalData.cholesterol, usePP);

            setBmiData({ height: h, weight: w });
            setHealthScore(newScore);
            setHealthBreakdown(breakdown);
            setShowBmiModal(false);
        }
    };

    return (
        <div className="space-y-6 text-gray-900 dark:text-white">
            {/* Workout Timer Overlay */}
            {selectedWorkout && (
                <WorkoutTimer
                    workout={selectedWorkout}
                    onClose={() => setSelectedWorkout(null)}
                />
            )}

            {/* Top Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Hello, {currentProfile?.name || 'User'}!
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Here represents your health overview.</p>
                    </div>

                    {/* Separate Profile Switcher Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm"
                        >
                            <Users size={18} className="text-teal-600 dark:text-teal-400" />
                            <span className="text-sm font-medium hidden sm:inline">Switch Profile</span>
                            <ChevronDown size={16} className={`text-gray-400 transition transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Profile Dropdown */}
                        {showProfileMenu && (
                            <div className="absolute top-12 left-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="p-2">
                                    <button
                                        onClick={() => handleSwitchProfile(null)}
                                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${currentProfile?.isMain ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-800 flex items-center justify-center font-bold text-teal-700 dark:text-teal-200 text-sm">M</div>
                                        <span className="font-medium">{user.displayName || 'My Profile'}</span>
                                    </button>

                                    {familyMembers.length > 0 && <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>}

                                    {familyMembers.map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => handleSwitchProfile(member)}
                                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${currentProfile?.id === member.id ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm">{member.name[0]}</div>
                                            <div>
                                                <span className="font-medium block">{member.name}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">({member.relation})</span>
                                            </div>
                                        </button>
                                    ))}

                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                                    <button
                                        onClick={() => navigate('/family')}
                                        className="w-full text-left px-4 py-2 text-sm text-teal-600 dark:text-teal-400 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition flex items-center gap-2"
                                    >
                                        <Users size={16} /> Manage Family
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Medicine & Uses"
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none w-64 shadow-sm"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value.trim()) {
                                navigate(`/meds?q=${encodeURIComponent(e.target.value)}`);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Upload Section (Visible if No Data or prompted) */}
            {
                (healthScore === 0 && biologicalData.glucose_after === 0 && biologicalData.glucose_before === 0 && biologicalData.cholesterol === 0 && bmiData.height === 0) && (
                    <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border border-teal-100 dark:border-teal-800 p-6 rounded-3xl animate-in slide-in-from-top-4 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-teal-900 mb-2">Get Your Health Score</h2>
                            <p className="text-teal-700 max-w-lg">
                                Upload your recent medical report to generate a personal health score and insights.
                            </p>
                            {/* {analysisResult && (
                                <div className="mt-4 p-3 bg-white/60 rounded-lg text-sm text-teal-800 border border-teal-100">
                                    <span className="font-bold">Latest Analysis:</span> {analysisResult.summary?.slice(0, 100)}...
                                </div>
                            )} */}
                        </div>
                        <div className="relative shrink-0">
                            {/* {uploading ? (
                                <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-xl text-teal-600 font-bold shadow-md">
                                    <Loader2 className="animate-spin" size={20} /> Analyzing...
                                </div>
                            ) : ( */}
                            <>
                                <button
                                    onClick={() => navigate('/report')}
                                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-lg shadow-teal-600/20 cursor-pointer transition transform active:scale-95"
                                >
                                    <Upload size={20} /> Upload Report
                                </button>
                            </>

                        </div>
                    </div>
                )
            }

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Left Col - Health Score & BMI */}
                <div className="flex flex-col gap-4">
                    {/* Health Score */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center items-center relative min-h-[390px]">
                        <h3 className="text-lg font-semibold absolute top-6 left-6 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            Health Score
                        </h3>
                        <div className="h-72 w-full mt-6 scale-110 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={healthChartData}
                                        innerRadius={70}
                                        outerRadius={90}
                                        startAngle={90}
                                        endAngle={-270}
                                        dataKey="value"
                                        stroke="none"
                                        paddingAngle={2}
                                        cornerRadius={5}
                                        onMouseEnter={(_, index) => setHoveredChartIndex(index)}
                                        onMouseLeave={() => setHoveredChartIndex(null)}
                                    >
                                        {healthChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-white font-bold" style={{ fontSize: '1.5rem' }}>
                                        {hoveredChartIndex !== null && healthChartData[hoveredChartIndex].name !== 'Potentials'
                                            ? healthChartData[hoveredChartIndex].name
                                            : `${healthScore}%`
                                        }
                                    </text>
                                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-500 dark:fill-gray-400 text-sm font-medium">
                                        {hoveredChartIndex !== null && healthChartData[hoveredChartIndex].name !== 'Potentials'
                                            ? `${healthChartData[hoveredChartIndex].value} pts`
                                            : 'Total Score'
                                        }
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 font-medium">
                            Overall Condition: <span style={{ color: scoreColor }}>
                                {healthScore >= 80 ? 'Excellent' : healthScore >= 50 ? 'Fair' : healthScore > 0 ? 'Needs Attention' : 'Unknown'}
                            </span>
                        </p>
                    </div>

                    {/* BMI Card (Moved here) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                        {/* Edit Button */}
                        <button
                            onClick={() => {
                                setManualBmiInput({ height: bmiData.height || '', weight: bmiData.weight || '' });
                                setShowBmiModal(true);
                            }}
                            className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg opacity-100 transition-opacity"
                        >
                            <Edit2 size={16} />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                                <Dumbbell size={18} />
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">BMI Analysis</span>
                        </div>

                        <div className="flex flex-col items-center justify-center py-2">
                            {bmiInfo ? (
                                <>
                                    <h3 className={`text-4xl font-bold ${bmiInfo.color} mb-1`}>{bmiInfo.value}</h3>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold tracking-wide uppercase ${bmiInfo.color.replace('text-', 'bg-').replace('-500', '-50')} ${bmiInfo.color}`}>
                                        {bmiInfo.category}
                                    </span>
                                </>
                            ) : (
                                <h3 className="text-4xl font-bold text-gray-300">--.-</h3>
                            )}
                        </div>

                        {/* Gauge */}
                        {bmiInfo && (
                            <div className="mt-6 relative">
                                <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 relative overflow-hidden flex">
                                    <div className="h-full bg-blue-400 w-[18.5%]"></div>
                                    <div className="h-full bg-green-500 w-[27%]"></div>
                                    <div className="h-full bg-orange-400 w-[17%]"></div>
                                    <div className="h-full bg-red-500 flex-1"></div>
                                </div>
                                <div className="flex justify-between text-[9px] text-gray-400 mt-2 font-mono px-1">
                                    <span>10</span>
                                    <span>40+</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Col - Stats & Trends */}
                <div className="md:col-span-2 grid grid-cols-1 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                                Glucose Trends <span className="text-xs font-normal text-gray-400 ml-2">(Before vs After Food)</span>
                            </h3>
                            <div className="px-3 py-1 bg-gray-50 rounded-lg text-xs text-gray-500 border border-gray-200">Weekly</div>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentHealthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBefore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorAfter" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: '500' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="beforeFood"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorBefore)"
                                        name="Before Food"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="afterFood"
                                        stroke="#F97316"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorAfter)"
                                        name="After Food"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {(() => {
                            const isPP = biologicalData.glucose_after > 0;
                            const displayVal = isPP ? biologicalData.glucose_after : (biologicalData.glucose_before || 0);
                            const metricType = isPP ? 'glucose_after' : 'glucose_before';
                            const status = getMetricStatus(displayVal, metricType);

                            return (
                                <div className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border ${status.color} dark:border-gray-700 shadow-sm relative group`}>
                                    <button
                                        onClick={() => {
                                            setManualBioInput({
                                                glucose_before: biologicalData.glucose_before || '',
                                                glucose_after: biologicalData.glucose_after || '',
                                                cholesterol: biologicalData.cholesterol || ''
                                            });
                                            setShowBioModal(true);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg opacity-100 transition-opacity"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Glucose Level</p>
                                    <h4 className={`text-2xl font-bold ${status.text} dark:text-white`}>
                                        {displayVal} <span className="text-sm text-gray-400 font-normal">{biologicalData.unit_gl}</span>
                                    </h4>
                                    <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block font-medium ${status.color.replace('border-', 'bg-').replace('-500', '-50')} ${status.text}`}>
                                        {isPP ? 'After Food' : (biologicalData.glucose_before ? 'Before Food' : 'No Data')}
                                    </span>
                                </div>
                            );
                        })()}
                        <div className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border ${getMetricStatus(biologicalData.cholesterol, 'cholesterol').color} dark:border-gray-700 shadow-sm relative group`}>
                            <button
                                onClick={() => {
                                    setManualBioInput({
                                        glucose_before: biologicalData.glucose_before || '',
                                        glucose_after: biologicalData.glucose_after || '',
                                        cholesterol: biologicalData.cholesterol || ''
                                    });
                                    setShowBioModal(true);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-gray-50 dark:bg-gray-700 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-lg opacity-100 transition-opacity"
                            >
                                <Edit2 size={14} />
                            </button>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Cholesterol</p>
                            <p className={`text-xl font-bold ${getMetricStatus(biologicalData.cholesterol, 'cholesterol').text} dark:text-white mt-1`}>{biologicalData.cholesterol || '--'} <span className="text-sm font-normal text-gray-400">{biologicalData.unit_ch}</span></p>
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block font-medium ${getMetricStatus(biologicalData.cholesterol, 'cholesterol').color.replace('border-', 'bg-').replace('-500', '-50')} ${getMetricStatus(biologicalData.cholesterol, 'cholesterol').text}`}>
                                {biologicalData.cholesterol > 0 ? getMetricStatus(biologicalData.cholesterol, 'cholesterol').label : 'No Data'}
                            </span>
                        </div>
                    </div>


                    {/* Suggestion Box (Right Bottom) */}
                    <div className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-gray-800 p-0 rounded-3xl border border-teal-100 dark:border-teal-800 shadow-sm relative overflow-hidden min-h-[180px] flex flex-row">
                        <div className="p-6 pr-2 flex-1 relative z-10 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-white dark:bg-teal-800 rounded-full text-teal-600 dark:text-teal-400 shadow-sm">
                                        <Lightbulb size={16} fill="currentColor" />
                                    </div>
                                    <span className="text-xs font-bold text-teal-600 dark:text-teal-300 uppercase tracking-wide">Suggested For You</span>
                                </div>

                                <p className="text-lg text-gray-700 dark:text-gray-200 font-medium leading-relaxed italic pr-4">
                                    "{currentSuggestion}"
                                </p>
                            </div>

                            <button
                                onClick={refreshSuggestion}
                                className="mt-4 p-2 bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-gray-600 rounded-full shadow-sm w-fit transition-all hover:rotate-180 duration-500"
                                title="Next Tip"
                            >
                                <RefreshCw size={18} />
                            </button>
                        </div>

                        {/* Image on Right Edge */}
                        <div className="w-[40%] relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-50 dark:from-gray-800 via-transparent to-transparent z-10"></div>
                            <img
                                src="/body_wireframe.png"
                                alt="Body Scan"
                                className="absolute right-0 bottom-0 h-full w-full object-contain object-right-bottom opacity-80"
                            />
                        </div>
                    </div>
                </div>



                {/* Bottom/Side - Quick Actions */}
                <div className="md:col-span-3">
                    <div className="md:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Dumbbell className="text-teal-600" size={24} /> Exercise
                            </h3>
                            <span className="text-sm text-teal-600 font-medium cursor-pointer hover:underline">View All</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* Workout 1: Morning Energy */}
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-2xl border border-orange-100 dark:border-orange-800 hover:shadow-md transition group cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-orange-500">
                                        <Sunrise size={24} />
                                    </div>
                                    <span className="bg-white dark:bg-gray-800 text-xs font-bold px-2 py-1 rounded-full text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">10 Min</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Morning Energy</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Wake up your body with light cardio.</p>

                                <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-400 mb-4">
                                    <span className="flex items-center gap-1"><Zap size={14} className="text-orange-500" /> Low Intensity</span>
                                    <span className="flex items-center gap-1"><Activity size={14} className="text-orange-500" /> 5 Exercises</span>
                                </div>

                                <button
                                    onClick={() => handleStartWorkout({
                                        title: 'Morning Energy',
                                        duration: 10,
                                        exercises: [
                                            { name: 'Jumping Jacks', duration: '2 min', pose: 'Stand feet together, jump feet apart and hands up.' },
                                            { name: 'High Knees', duration: '2 min', pose: 'Run in place lifting knees high to chest.' },
                                            { name: 'Arm Circles', duration: '2 min', pose: 'Extend arms and make circular motions.' },
                                            { name: 'Torso Twists', duration: '2 min', pose: 'Twist torso left and right standing firmly.' },
                                            { name: 'Spot Jogging', duration: '2 min', pose: 'Jog lightly in one spot.' }
                                        ]
                                    })}
                                    className="w-full py-2 bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 font-bold rounded-lg text-sm shadow-sm border border-orange-100 dark:border-orange-900/50 group-hover:bg-orange-600 group-hover:text-white dark:group-hover:text-white transition-colors">
                                    Start Now
                                </button>
                            </div>

                            {/* Workout 2: Calories Burn */}
                            <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-2xl border border-rose-100 dark:border-rose-800 hover:shadow-md transition group cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-rose-500">
                                        <Flame size={24} />
                                    </div>
                                    <span className="bg-white dark:bg-gray-800 text-xs font-bold px-2 py-1 rounded-full text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">20 Min</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Calories Burn</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Intense intervals to burn calories fast.</p>

                                <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-400 mb-4">
                                    <span className="flex items-center gap-1"><Zap size={14} className="text-rose-500" /> High Intensity</span>
                                    <span className="flex items-center gap-1"><Activity size={14} className="text-rose-500" /> 8 Exercises</span>
                                </div>

                                <button
                                    onClick={() => handleStartWorkout({
                                        title: 'Calories Burn',
                                        duration: 20,
                                        exercises: [
                                            { name: 'Burpees', duration: '3 min', pose: 'Squat, kick feet back, pushup, jump up.' },
                                            { name: 'Squat Jumps', duration: '3 min', pose: 'Squat down and jump up explosively.' },
                                            { name: 'Mountain Climbers', duration: '3 min', pose: 'Plank position, alternate knees to chest.' },
                                            { name: 'Lunge Jumps', duration: '3 min', pose: 'Lunge position, jump and switch legs.' },
                                            { name: 'Plank Jacks', duration: '3 min', pose: 'Plank position, jump feet in and out.' },
                                            { name: 'Side Skaters', duration: '3 min', pose: 'Hop side to side like skating.' },
                                            { name: 'Pushups', duration: '2 min', pose: 'Standard pushup form.' }
                                        ]
                                    })}
                                    className="w-full py-2 bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-sm shadow-sm border border-rose-100 dark:border-rose-900/50 group-hover:bg-rose-600 group-hover:text-white dark:group-hover:text-white transition-colors">
                                    Start Now
                                </button>
                            </div>

                            {/* Workout 3: Sleep Improve */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800 hover:shadow-md transition group cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-indigo-500">
                                        <Wind size={24} />
                                    </div>
                                    <span className="bg-white dark:bg-gray-800 text-xs font-bold px-2 py-1 rounded-full text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">15 Min</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sleep Improve</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Relax muscles and improve sleep quality.</p>

                                <div className="flex items-center gap-3 text-xs font-medium text-gray-600 dark:text-gray-400 mb-4">
                                    <span className="flex items-center gap-1"><Zap size={14} className="text-indigo-500" /> Low Intensity</span>
                                    <span className="flex items-center gap-1"><Activity size={14} className="text-indigo-500" /> 6 Poses</span>
                                </div>

                                <button
                                    onClick={() => handleStartWorkout({
                                        title: 'Sleep Improve',
                                        duration: 15,
                                        exercises: [
                                            { name: 'Child Pose', duration: '3 min', pose: 'Kneel, sit back on heels, stretch arms forward.' },
                                            { name: 'Cat-Cow', duration: '3 min', pose: 'Hands and knees, arch and round back.' },
                                            { name: 'Legs Up Wall', duration: '3 min', pose: 'Lie back, legs straight up against a wall.' },
                                            { name: 'Supine Twist', duration: '3 min', pose: 'Lie back, knees to chest, drop to one side.' },
                                            { name: 'Corpse Pose', duration: '3 min', pose: 'Lie flat, palms up, relax entire body.' }
                                        ]
                                    })}
                                    className="w-full py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-sm shadow-sm border border-indigo-100 dark:border-indigo-900/50 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:text-white transition-colors">
                                    Start Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {
                    showBmiModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update Body Metrics</h3>
                                    <button onClick={() => setShowBmiModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X size={20} />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveBMI} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Height (cm)</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            value={manualBmiInput.height}
                                            onChange={e => setManualBmiInput({ ...manualBmiInput, height: e.target.value })}
                                            placeholder="e.g. 175"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Weight (kg)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.1"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                            value={manualBmiInput.weight}
                                            onChange={e => setManualBmiInput({ ...manualBmiInput, weight: e.target.value })}
                                            placeholder="e.g. 70.5"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition">
                                        Update & Calculate
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Manual Biological Data Modal */}
                {
                    showBioModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Update Health Metrics</h3>
                                    <button onClick={() => setShowBioModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X size={20} />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveBiological} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Glucose Before Food (Fasting)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                                            value={manualBioInput.glucose_before}
                                            onChange={e => setManualBioInput({ ...manualBioInput, glucose_before: e.target.value })}
                                            placeholder="e.g. 90"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Glucose After Food</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                                            value={manualBioInput.glucose_after}
                                            onChange={e => setManualBioInput({ ...manualBioInput, glucose_after: e.target.value })}
                                            placeholder="e.g. 140"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Cholesterol (mg/dL)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                                            value={manualBioInput.cholesterol}
                                            onChange={e => setManualBioInput({ ...manualBioInput, cholesterol: e.target.value })}
                                            placeholder="e.g. 180"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 transition">
                                        Update Metrics
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}
