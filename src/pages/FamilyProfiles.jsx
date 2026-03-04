import React, { useState } from 'react';
import { useAuthState } from '../hooks/useAuth';
import { useProfile } from '../App';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Save, User, Users } from 'lucide-react';

export default function FamilyProfiles() {
    const { user } = useAuthState();
    const { familyMembers, setFamilyMembers } = useProfile();
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingMember, setEditingMember] = useState(null); // null = adding new
    const [formData, setFormData] = useState({
        name: '',
        relation: 'Family',
        age: '',
        gender: 'Male',
        bloodGroup: ''
    });

    // Local fetch is removed as we use Global Context. 
    // App.jsx fetches initial data, and we update Context manually on add/edit/delete.

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;

        const userRef = doc(db, "users", user.uid);

        if (editingMember) {
            // Edit Mode: Remove old, Add updated (simple way for array of objects in Firestore without unique keys matching easily)
            // Ideally we stick to ID.
            const updatedMembers = familyMembers.map(m =>
                m.id === editingMember.id ? { ...m, ...formData } : m
            );

            await updateDoc(userRef, { family: updatedMembers });
            setFamilyMembers(updatedMembers);
        } else {
            // Add Mode
            const newMember = {
                id: `${user.uid}_${Date.now()}`,
                health_score: 0,
                ...formData
            };
            await updateDoc(userRef, {
                family: arrayUnion(newMember)
            });
            setFamilyMembers([...familyMembers, newMember]);
        }

        resetForm();
    };

    const [deleteConfirmation, setDeleteConfirmation] = useState(null); // Member to delete

    const handleDelete = async (member) => {
        setDeleteConfirmation(member);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;

        try {
            const userRef = doc(db, "users", user.uid);
            const updatedMembers = familyMembers.filter(m => m.id !== deleteConfirmation.id);

            await updateDoc(userRef, { family: updatedMembers });
            setFamilyMembers(updatedMembers);
            setDeleteConfirmation(null);
        } catch (error) {
            console.error("Error deleting member:", error);
            alert("Failed to delete member");
        }
    };

    const startEdit = (member) => {
        setEditingMember(member);
        setFormData({
            name: member.name,
            relation: member.relation,
            age: member.age,
            gender: member.gender || 'Male',
            bloodGroup: member.bloodGroup || ''
        });
        setShowForm(true);
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingMember(null);
        setFormData({ name: '', relation: 'Family', age: '', gender: 'Male', bloodGroup: '' });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Profiles</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your family members and their health profiles.</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/20 active:scale-95 transition font-semibold"
                >
                    <Plus size={20} /> Add Member
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmation && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Member?</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            Are you sure you want to delete <span className="font-bold">{deleteConfirmation.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmation(null)}
                                className="px-4 py-2 text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-red-600/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingMember ? 'Edit Member' : 'Add New Member'}
                            </h3>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
                                    <input
                                        type="text" required
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 border border-gray-200 dark:border-gray-600"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Relation</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 border border-gray-200 dark:border-gray-600"
                                        value={formData.relation}
                                        onChange={e => setFormData({ ...formData, relation: e.target.value })}
                                    >
                                        <option>Family</option>
                                        <option>Spouse</option>
                                        <option>Child</option>
                                        <option>Parent</option>
                                        <option>Sibling</option>
                                        <option>Grandparent</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Age</label>
                                    <input
                                        type="number" required
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 border border-gray-200 dark:border-gray-600"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        placeholder="e.g. 30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 border border-gray-200 dark:border-gray-600"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Blood Group</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/20 border border-gray-200 dark:border-gray-600"
                                        value={formData.bloodGroup}
                                        onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                                        placeholder="Opt."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={resetForm} className="px-5 py-2.5 text-gray-500 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition">Cancel</button>
                                <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-600/20 flex items-center gap-2">
                                    <Save size={18} /> Save Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Table View */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-gray-700">
                                <th className="p-4 font-semibold">Name</th>
                                <th className="p-4 font-semibold">Relation</th>
                                <th className="p-4 font-semibold">Age</th>
                                <th className="p-4 font-semibold">Gender</th>
                                <th className="p-4 font-semibold">Blood Group</th>
                                <th className="p-4 font-semibold">Health Score</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {/* Main User Row */}
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">M</div>
                                        <span className="font-semibold text-gray-900 dark:text-white">Me</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">Self</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">-</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">-</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">-</td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">-</td>
                                <td className="p-4 text-right text-gray-400 italic text-sm">Primary</td>
                            </tr>

                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">Loading profiles...</td>
                                </tr>
                            ) : familyMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">No family members added yet.</td>
                                </tr>
                            ) : (
                                familyMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                                    {member.name[0]}
                                                </div>
                                                <span className="font-semibold text-gray-900 dark:text-white">{member.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">{member.relation}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">{member.age}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">{member.gender}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">{member.bloodGroup || '-'}</td>
                                        <td className="p-4">
                                            {member.health_score > 0 ? (
                                                <span className={`font-bold ${member.health_score >= 80 ? 'text-green-600' : member.health_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {member.health_score}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => startEdit(member)} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition" title="Edit">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(member)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
