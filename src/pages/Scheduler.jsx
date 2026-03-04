import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, CheckCircle, Bell, Sparkles, Loader2, X, ChevronRight, Repeat } from 'lucide-react';
import { saveReminder, getReminders, deleteReminder, updateReminder } from '../services/dbService';
import { generateSmartSchedule } from '../services/aiService';
import { useAuthState } from '../hooks/useAuth';
import { useProfile, useSettings } from '../App';

export default function Scheduler() {
    const { user } = useAuthState();
    const { currentProfile } = useProfile();
    const { language } = useSettings();
    const [reminders, setReminders] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);

    // Form State
    const [newReminder, setNewReminder] = useState({
        title: '',
        time: '',
        type: 'medication',
        days: [], // Array of integers 0-6 (Sun-Sat)
        isActive: true
    });

    const [toast, setToast] = useState(null);

    // AI State
    const [aiGoal, setAiGoal] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (user && currentProfile) loadReminders();
    }, [user, currentProfile]);

    const loadReminders = async () => {
        if (!user) return;
        const profileId = currentProfile?.id || user.uid;
        const data = await getReminders(profileId);
        setReminders(data);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!user || !newReminder.title || !newReminder.time) return;

        const profileId = currentProfile?.id || user.uid;

        // If no days selected, assume repeated daily or just today? 
        // For an alarm app, typically if you don't select days, it runs once (Tomorrow/Today).
        // Let's default to Daily if empty? Or just save as is.
        // Let's assume empty days = One-off, but we won't handle one-off logic strictly here yet, just save it.

        await saveReminder(profileId, newReminder);

        setNewReminder({
            title: '',
            time: '',
            type: 'medication',
            days: [],
            isActive: true
        });

        setShowForm(false);
        showToast("Alarm saved successfully!");
        loadReminders();
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm("Delete this alarm?")) {
            await deleteReminder(id);
            loadReminders();
        }
    };

    const handleToggle = async (id, currentStatus) => {
        // Optimistic update
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));

        try {
            await updateReminder(id, { isActive: !currentStatus });
        } catch (error) {
            console.error("Failed to toggle reminder", error);
            loadReminders(); // Revert on error
        }
    };

    const handleGenerateSmartSchedule = async (e) => {
        e.preventDefault();
        if (!aiGoal.trim()) return;
        setAiLoading(true);

        try {
            const profileData = currentProfile || {};
            const schedule = await generateSmartSchedule(aiGoal, profileData, language);

            // Expected AI output: valid array of objects with { title, time, days: 'Daily' | ['Mon'] | 'Mon', type }
            // modifying generateSmartSchedule might be needed if it returns strict dates. 
            // Assuming we update the prompt or handle valid legacy output here.

            const daysMap = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };

            const profileId = currentProfile?.id || user.uid;
            const promises = [];

            schedule.forEach(item => {
                let targetDays = [];
                if (Array.isArray(item.days)) targetDays = item.days;
                else if (item.days === 'Daily') targetDays = Object.keys(daysMap);
                else targetDays = [item.days];

                // Convert string days to integers
                const integerDays = targetDays.map(d => daysMap[d?.toLowerCase()]).filter(d => d !== undefined);

                // Remove duplicates
                const uniqueDays = [...new Set(integerDays)];

                promises.push(saveReminder(profileId, {
                    title: item.title,
                    time: item.time,
                    days: uniqueDays.length > 0 ? uniqueDays : [new Date().getDay()], // Default to today if parse fails
                    type: item.type,
                    aiGenerated: true,
                    isActive: true
                }));
            });

            await Promise.all(promises);
            showToast(`Created ${promises.length} smart alarms!`);
            setShowAIModal(false);
            setAiGoal('');
            loadReminders();

        } catch (error) {
            console.error(error);
            alert("Failed to generate schedule. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const toggleDay = (dayIndex) => {
        setNewReminder(prev => {
            const days = prev.days.includes(dayIndex)
                ? prev.days.filter(d => d !== dayIndex)
                : [...prev.days, dayIndex];
            return { ...prev, days };
        });
    };

    const formatDays = (days) => {
        if (!days || days.length === 0) return "Once";
        if (days.length === 7) return "Every day";
        if (days.length === 2 && days.includes(0) && days.includes(6)) return "Weekends";
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return "Weekdays";

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days.sort().map(d => dayNames[d]).join(', ');
    };

    return (
        <div className="relative min-h-[calc(100vh-100px)]">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-20 right-4 bg-teal-600 text-white px-6 py-3 rounded-xl shadow-xl z-50 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={20} />
                        <span className="font-medium">{toast}</span>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Alarms</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your health schedule</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAIModal(true)}
                        className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 p-3 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
                        title="AI Auto-Schedule"
                    >
                        <Sparkles size={24} />
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-xl hover:opacity-80 transition shadow-lg"
                        title="Add Alarm"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            {/* AI Modal */}
            {showAIModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="text-purple-500 fill-current" /> Auto-Schedule
                            </h3>
                            <button onClick={() => setShowAIModal(false)} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 dark:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
                            Describe your health routine (e.g., "Remind me to drink water every 2 hours" or "Medicine at 8 AM daily"), and AI will set it up.
                        </p>
                        <form onSubmit={handleGenerateSmartSchedule}>
                            <textarea
                                className="w-full bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white p-4 rounded-2xl border border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition h-32 mb-6 resize-none font-medium"
                                placeholder="E.g., I need to take Metformin every morning..."
                                value={aiGoal}
                                onChange={(e) => setAiGoal(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!aiGoal.trim() || aiLoading}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold text-lg flex justify-center items-center gap-2 transition shadow-lg shadow-purple-600/20"
                            >
                                {aiLoading ? <Loader2 className="animate-spin" /> : "Generate Alarms"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Reminder Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
                    <form onSubmit={handleAdd} className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">New Alarm</h2>
                                <p className="text-gray-500 text-sm mt-1">Set a time and repeat days</p>
                            </div>
                            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-500 dark:text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-8 flex justify-center">
                            <input
                                type="time"
                                className="text-6xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none text-center w-full focus:ring-0 p-0 [time-input-webkit-clear-button:display:none]"
                                value={newReminder.time}
                                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                                required
                            />
                        </div>

                        <div className="mb-8">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Repeat</label>
                            <div className="flex justify-between">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleDay(i)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${newReminder.days.includes(i)
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Label</label>
                                <input
                                    type="text"
                                    placeholder="Alarm name"
                                    className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-4 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/50 font-medium placeholder-gray-400"
                                    value={newReminder.title}
                                    onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['medication', 'checkup', 'diet', 'workout'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewReminder({ ...newReminder, type })}
                                            className={`p-2 rounded-lg text-xs font-bold capitalize transition ${newReminder.type === type
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border border-transparent'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-95 transition">
                            Save Alarm
                        </button>
                    </form>
                </div>
            )}

            {/* Reminder List */}
            <div className="space-y-4">
                {reminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Bell size={64} className="text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-400 dark:text-gray-500 font-medium text-lg">No alarms set</p>
                    </div>
                ) : (
                    reminders.map(rem => (
                        <div
                            key={rem.id}
                            className={`group relative overflow-hidden bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 ${!rem.isActive && 'opacity-60 grayscale-[0.5]'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-light text-gray-900 dark:text-white tracking-tighter">
                                        {rem.time.split(':')[0]}<span className="animate-pulse">:</span>{rem.time.split(':')[1]}
                                    </span>
                                    {/* <span className="text-lg text-gray-400 font-medium lowercase">am</span>  Time input is 24h usually, logic to format AM/PM could be added */}
                                </div>
                                <div onClick={() => handleToggle(rem.id, rem.isActive)} className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${rem.isActive ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${rem.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-gray-900 dark:text-white font-medium text-lg flex items-center gap-2">
                                        {rem.title}
                                        {rem.aiGenerated && <Sparkles size={14} className="text-purple-500" />}
                                    </p>
                                    <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mt-1 flex items-center gap-1">
                                        <Repeat size={12} />
                                        {rem.days && rem.days.length > 0 ? formatDays(rem.days) : (rem.date ? `Date: ${rem.date}` : 'One-time')}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(rem.id, e)}
                                    className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100 active:scale-95"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
