import React from 'react';
import { User, Moon, Globe, ChevronRight } from 'lucide-react';
import { useSettings } from '../App';
import { useAuthState } from '../hooks/useAuth';

export default function Settings() {
    const { theme, setTheme, language, setLanguage } = useSettings();
    const { user } = useAuthState();

    const languages = [
        "English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati"
    ];

    return (
        <div className="max-w-3xl mx-auto dark:text-white">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Settings</h1>

            <div className="space-y-6">
                {/* User Profile Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account Info</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your profile details</p>
                        </div>
                    </div>

                    <div className="space-y-3 pl-16">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium">{user?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">User ID</label>
                            <p className="text-gray-900 dark:text-gray-200 font-medium font-mono text-sm opacity-75">{user?.uid || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Moon size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Appearance</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Customize how the app looks</p>
                        </div>
                    </div>

                    <div className="pl-16 flex items-center justify-between">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={theme === 'dark'}
                                onChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                        </label>
                    </div>
                </div>

                {/* Language Section */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Language & Region</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Select language for AI reports</p>
                        </div>
                    </div>

                    <div className="pl-16">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Primary Language</label>
                        <div className="relative">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white py-3 px-4 pr-8 focus:border-teal-500 focus:ring-teal-500 transition-shadow appearance-none"
                            >
                                {languages.map(lang => (
                                    <option key={lang} value={lang}>{lang}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                <ChevronRight className="rotate-90" size={16} />
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            AI analysis for Food Lens, Meds Query, and Reports will be provided in this language.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
