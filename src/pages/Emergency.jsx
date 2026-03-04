import React, { useState, useEffect } from 'react';
import { Phone, ShieldAlert, Ambulance, Flame, Siren, User, HeartPulse, Droplet } from 'lucide-react';
import { useAuthState } from '../hooks/useAuth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Emergency() {
    const { user } = useAuthState();
    const [contacts, setContacts] = useState([]);

    useEffect(() => {
        if (user) {
            const fetchContacts = async () => {
                try {
                    const docRef = doc(db, "users", user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setContacts(docSnap.data().family || []);
                    }
                } catch (error) {
                    console.error("Error fetching contacts:", error);
                }
            };
            fetchContacts();
        }
    }, [user]);

    const helplines = [
        { number: '112', title: 'All-in-One Emergency', icon: <ShieldAlert className="text-white" size={24} />, color: 'bg-red-600', hover: 'hover:bg-red-700' },
        { number: '108', title: 'Emergency Ambulance', icon: <Ambulance className="text-white" size={24} />, color: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
        { number: '102', title: 'Ambulance Service', icon: <Ambulance className="text-white" size={24} />, color: 'bg-green-600', hover: 'hover:bg-green-700' },
        { number: '100', title: 'Police', icon: <Siren className="text-white" size={24} />, color: 'bg-blue-800', hover: 'hover:bg-blue-900' },
        { number: '101', title: 'Fire', icon: <Flame className="text-white" size={24} />, color: 'bg-orange-600', hover: 'hover:bg-orange-700' },
        { number: '181', title: 'Women Helpline', icon: <User className="text-white" size={24} />, color: 'bg-pink-600', hover: 'hover:bg-pink-700' },
        { number: '1091', title: 'Women Police', icon: <ShieldAlert className="text-white" size={24} />, color: 'bg-indigo-600', hover: 'hover:bg-indigo-700' },
        { number: '1098', title: 'Child Helpline', icon: <User className="text-white" size={24} />, color: 'bg-cyan-600', hover: 'hover:bg-cyan-700' },
        { number: '104', title: 'Health Helpline', icon: <HeartPulse className="text-white" size={24} />, color: 'bg-teal-600', hover: 'hover:bg-teal-700' },
        { number: '1800-11-6117', title: 'Poison Helpline (AIIMS)', icon: <ShieldAlert className="text-white" size={24} />, color: 'bg-purple-600', hover: 'hover:bg-purple-700', wide: true },
        { number: '1070', title: 'Disaster Control', icon: <Siren className="text-white" size={24} />, color: 'bg-slate-600', hover: 'hover:bg-slate-700' },
        { number: '1910', title: 'Blood Bank', icon: <Droplet className="text-white" size={24} />, color: 'bg-red-500', hover: 'hover:bg-red-600' },
    ];

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-8">
            {/* Header Banner */}
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-6 rounded-r-xl flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
                <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={28} />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Assistance</h1>
                    <p className="font-bold text-red-600 dark:text-red-400 mt-1">Use only in emergencies. Stay calm and follow instructions.</p>
                </div>
            </div>

            {/* Helplines Grid */}
            <section>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <Phone className="text-teal-600" size={20} /> National Helplines
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {helplines.map((item, idx) => (
                        <a
                            key={idx}
                            href={`tel:${item.number}`}
                            className={`${item.color} ${item.hover} ${item.wide ? 'sm:col-span-2 lg:col-span-2' : ''} text-white p-4 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-between transition transform hover:scale-[1.02] active:scale-95`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    {item.icon}
                                </div>
                                <div>
                                    <div className="text-2xl font-bold tracking-tight">{item.number}</div>
                                    <div className="text-sm font-medium opacity-90">{item.title}</div>
                                </div>
                            </div>
                            <div className="bg-white/20 p-2 rounded-full">
                                <Phone size={20} className="fill-current" />
                            </div>
                        </a>
                    ))}
                </div>
            </section>

            {/* Saved Emergency Contacts */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="text-teal-600" size={20} /> Saved Emergency Contacts
                    </h2>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        {contacts.length} Contacts
                    </span>
                </div>

                {contacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center font-bold text-teal-700 dark:text-teal-300">
                                        {contact.name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{contact.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{contact.relation}</p>
                                    </div>
                                </div>
                                <a
                                    href={`tel:${contact.phone || ''}`} // Assuming phone number might be added later, or just mock action
                                    className="bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-full hover:bg-teal-600 dark:hover:bg-teal-500 transition"
                                    onClick={(e) => {
                                        if (!contact.phone) {
                                            e.preventDefault();
                                            alert(`No phone number saved for ${contact.name}. (This field can be added in Family Profile)`);
                                        }
                                    }}
                                >
                                    <Phone size={18} />
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 mb-2">No emergency contacts saved.</p>
                        <a href="/family" className="text-teal-600 font-bold hover:underline">Add Family Members</a>
                    </div>
                )}
            </section>
        </div>
    );
}
