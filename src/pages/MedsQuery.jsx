import React, { useState, useEffect } from 'react';
import { Search, Loader2, Pill, Info, AlertOctagon, Clock, Baby, MessageCircle, Send, Upload, Camera } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { analyzeImage, getMedicineDetails, chatWithHealthAssistant } from '../services/aiService';
import { saveExpense } from '../services/dbService';
import { useAuthState } from '../hooks/useAuth';
import { useSettings } from '../App';
import ReactMarkdown from 'react-markdown';

export default function MedsQuery() {
    const { language } = useSettings();
    const { user } = useAuthState();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [searchParams] = useSearchParams();

    // Chat state
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
        const query = searchParams.get('q');
        if (query) {
            setSearchQuery(query);
            performSearch(query);
        }
    }, [searchParams]);

    const performSearch = async (query) => {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        setChatHistory([]);

        try {
            const data = await getMedicineDetails(query, language);
            setResult(data);
        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const PRESET_MEDICINES = [
        "Paracetamol",
        "Azithromycin",
        "Cetirizine",
        "Coldact",
        "Saridon"
    ];

    const handlePresetClick = async (medName) => {
        setLoading(true);
        setResult(null);
        setChatHistory([]);
        setSearchQuery('');

        try {
            const data = await getMedicineDetails(medName, language);
            setResult(data);
        } catch (err) {
            console.error(err);
            alert(`Error: ${err.message} `);
        } finally {
            setLoading(false);
        }
    };

    const handleTextSearch = async (e) => {
        e.preventDefault();
        performSearch(searchQuery);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setResult(null);
        setChatHistory([]);
        setSearchQuery(`Analyzing image...`);

        try {
            const data = await analyzeImage(file, 'meds', language);
            setResult(data);
            setSearchQuery(data.name || '');
        } catch (err) {
            console.error(err);
            alert(`Error analyzing image: ${err.message} `);
        } finally {
            setLoading(false);
        }
    };

    const handleAskFollowUp = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !result) return;

        const userMsg = chatInput;
        setChatInput('');
        setChatLoading(true);

        const newHistory = [...chatHistory, { role: 'user', text: userMsg }];
        setChatHistory(newHistory);

        try {
            // Context specific to this medicine
            const context = {
                medicine: result,
                task: "Answer questions about this specific medicine."
            };

            const geminiHistory = newHistory.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await chatWithHealthAssistant(geminiHistory, userMsg, context);
            setChatHistory(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            console.error(err);
            setChatHistory(prev => [...prev, { role: 'model', text: "Sorry, I couldn't get an answer right now." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleTrackExpense = async () => {
        if (!result || !result.estimated_cost_inr || !user) return;

        try {
            await saveExpense(user.uid, {
                title: result.name || "Medicine Purchase",
                amount: result.estimated_cost_inr,
                category: 'medicine',
                date: new Date().toISOString(),
                notes: 'Auto-tracked from Meds Query analysis'
            });
            alert(`Expense of ₹${result.estimated_cost_inr} added to your wallet!`);
        } catch (error) {
            console.error(error);
            alert("Failed to save expense.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Pill className="text-teal-600" /> Medicine Identifier & Cost
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    {/* Search & Presets Options */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">

                        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Select</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                            {PRESET_MEDICINES.map(med => (
                                <button
                                    key={med}
                                    onClick={() => handlePresetClick(med)}
                                    disabled={loading}
                                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-200 dark:hover:border-teal-700 transition text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 shadow-sm disabled:opacity-50"
                                >
                                    {med}
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-gray-800 px-2 text-sm text-gray-500">OR SEARCH</span>
                            </div>
                        </div>

                        <form onSubmit={handleTextSearch} className="relative mt-6">
                            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search medicine name..."
                                className="w-full bg-gray-50 dark:bg-gray-700 pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition text-gray-900 dark:text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading || !searchQuery}
                                className="absolute right-2 top-2 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Search"}
                            </button>
                        </form>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-white dark:bg-gray-800 px-2 text-sm text-gray-500">OR SCAN</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-teal-300 dark:border-teal-700 rounded-xl bg-teal-50 dark:bg-teal-900/10 hover:bg-teal-100 dark:hover:bg-teal-900/30 cursor-pointer transition group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                    disabled={loading}
                                />
                                <Camera className="text-teal-600 dark:text-teal-400 group-hover:scale-110 transition" size={24} />
                                <div className="text-left">
                                    <p className="font-semibold text-teal-800 dark:text-teal-200">Upload Medicine Sheet</p>
                                    <p className="text-xs text-teal-600 dark:text-teal-400">Identify pills & get info instantly</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div>
                    {/* Results Display */}
                    {result ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider">Medicine Name</p>
                                        <h2 className="text-3xl font-bold text-teal-600 dark:text-teal-400 mt-1">{result.name}</h2>
                                        {result.dosage_form && <span className="inline-block mt-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">{result.dosage_form}</span>}
                                    </div>
                                    <Pill size={32} className="text-teal-500 bg-teal-50 dark:bg-teal-900/20 p-1.5 rounded-lg box-content" />
                                </div>

                                {result.warning && (
                                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex gap-3 text-red-600 dark:text-red-400">
                                        <AlertOctagon className="shrink-0" />
                                        <p className="text-sm font-medium">{result.warning}</p>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2 text-sm">
                                                <Clock size={16} /> Best Intake Time
                                            </h3>
                                            <p className="text-blue-900 dark:text-blue-100 font-medium">{result.best_intake_time || "Consult Doctor"}</p>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                            <h3 className="font-semibold text-purple-800 dark:text-purple-300 flex items-center gap-2 mb-2 text-sm">
                                                <Baby size={16} /> Dosage by Age
                                            </h3>
                                            <p className="text-purple-900 dark:text-purple-100 font-medium text-sm">{result.dosage_by_age || "Consult Doctor"}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                            <Info size={16} className="text-gray-400" /> Usage
                                        </h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">{result.usage}</p>
                                    </div>

                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                                            <AlertOctagon size={16} className="text-orange-500" /> Side Effects
                                        </h3>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">{result.side_effects}</p>
                                    </div>
                                </div>
                            </div>

                            {result.estimated_cost_inr && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider">Estimated Price</p>
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">₹{result.estimated_cost_inr}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <a
                                            href={`https://www.google.com/search?q=${result.name} buy online`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2"
                                        >
                                            <Upload size={18} /> Buy Now
                                        </a >
                                        {user && (
                                            <button
                                                onClick={handleTrackExpense}
                                                className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition flex items-center gap-2"
                                            >
                                                <Pill size={18} /> Track Expense
                                            </button>
                                        )}
                                    </div >
                                </div >
                            )}

                            {/* Contextual Chat */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <MessageCircle size={20} className="text-teal-600" />
                                    Ask about {result.name}
                                </h3>

                                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-xl p-3 text-sm ${msg.role === 'user' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100' : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && <div className="text-sm text-gray-400 italic">AI is thinking...</div>}
                                </div>

                                <form onSubmit={handleAskFollowUp} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder={`e.g. Can I take ${result.name} with milk?`}
                                        className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 dark:text-white"
                                    />
                                    <button type="submit" disabled={!chatInput.trim() || chatLoading} className="bg-teal-600 text-white p-2 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition">
                                        <Send size={20} />
                                    </button>
                                </form>
                            </div>

                            <p className="text-center text-gray-400 text-xs mt-4">
                                Disclaimer: This tool is for informational purposes only. Do not rely on it for medical decisions. Always consult a doctor or pharmacist.
                            </p>
                        </div >
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 bg-white dark:bg-gray-800 min-h-[300px]">
                            <Pill size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="font-medium text-center">Select a medicine or search by name<br />to see details here</p>
                        </div>
                    )}
                </div >
            </div >
        </div >
    );
}
