import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Utensils, LogOut, Pill, Calendar, Settings as SettingsIcon, Users, HeartPulse, Siren, Wallet, Search } from 'lucide-react';
import { auth } from '../firebase';
import HealthAssistant from './HealthAssistant';

export default function AppLayout() {
    const navigate = useNavigate();

    const handleLogout = () => {
        auth.signOut();
        navigate('/login');
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Sidebar - hidden on mobile, simplified for now */}
            <aside className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col hidden md:flex sticky top-0 h-screen transition-colors duration-300">
                <h2 className="text-2xl font-bold mb-10 text-teal-600 dark:text-teal-400 flex items-center gap-2">
                    {/* Optional Logo Icon could go here */}
                    Health Assist
                </h2>

                <nav className="flex-1 space-y-2">
                    <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <LayoutDashboard size={20} />
                        Dashboard
                    </NavLink>
                    <NavLink to="/family" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <Users size={20} />
                        Family
                    </NavLink>
                    <NavLink to="/report" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <FileText size={20} />
                        Scan Report
                    </NavLink>

                    <NavLink to="/meds" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-semibold shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-teal-600 dark:hover:text-teal-400'}`}>
                        <Search size={20} strokeWidth={1.5} />
                        <span className="font-medium">Meds Query</span>
                    </NavLink>
                    <NavLink to="/expenses" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-semibold shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-teal-600 dark:hover:text-teal-400'}`}>
                        <Wallet size={20} strokeWidth={1.5} />
                        <span className="font-medium">Health Expenses</span>
                    </NavLink>
                    <NavLink to="/food" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <Utensils size={20} />
                        Food Lens
                    </NavLink>
                    <NavLink to="/scheduler" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <Calendar size={20} />
                        Scheduler
                    </NavLink>
                    <NavLink to="/first-aid" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <HeartPulse size={20} />
                        First Aid
                    </NavLink>
                    <NavLink to="/emergency" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <Siren size={20} />
                        Emergency
                    </NavLink>

                    <div className="my-4 border-t border-gray-100 dark:border-gray-700"></div>

                    <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 p-3.5 rounded-xl transition-all font-medium ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                        <SettingsIcon size={20} />
                        Settings
                    </NavLink>
                </nav>

                <button onClick={handleLogout} className="flex items-center gap-3 p-3.5 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl mt-auto transition-colors font-medium">
                    <LogOut size={20} />
                    Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav - Visible only on small screens */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex justify-around z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl' : 'text-gray-400 dark:text-gray-500 p-2'}>
                    <LayoutDashboard size={24} />
                </NavLink>
                <NavLink to="/report" className={({ isActive }) => isActive ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl' : 'text-gray-400 dark:text-gray-500 p-2'}>
                    <FileText size={24} />
                </NavLink>

                <NavLink to="/meds" className={({ isActive }) => isActive ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl' : 'text-gray-400 dark:text-gray-500 p-2'}>
                    <Pill size={24} />
                </NavLink>
                <NavLink to="/scheduler" className={({ isActive }) => isActive ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 p-2 rounded-xl' : 'text-gray-400 dark:text-gray-500 p-2'}>
                    <Calendar size={24} />
                </NavLink>
            </nav>

            {/* Global Health Assistant Chatbot */}
            <HealthAssistant />
        </div>
    );
}
