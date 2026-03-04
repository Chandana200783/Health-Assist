import React, { useState, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuth';
import { getExpenses, saveExpense } from '../services/dbService';
import { Wallet, TrendingUp, Plus, ShoppingBag, FileText, Activity, Calendar } from 'lucide-react';

export default function HealthExpenses() {
    const { user } = useAuthState();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Summary Stats
    const [totalSpent, setTotalSpent] = useState(0);
    const [categoryBreakdown, setCategoryBreakdown] = useState({ medicines: 0, tests: 0, bills: 0 });

    useEffect(() => {
        if (user) loadExpenses();
    }, [user]);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const data = await getExpenses(user.uid);
            setExpenses(data);
            calculateSummary(data);
        } catch (error) {
            console.error("Failed to load expenses", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        let total = 0;
        let breakdown = { medicines: 0, tests: 0, bills: 0 };
        const currentMonth = new Date().getMonth();

        data.forEach(item => {
            const price = Number(item.amount) || 0;
            const expensesDate = item.date ? new Date(item.date) : new Date();
            // Simple monthly filter for summary
            if (expensesDate.getMonth() === currentMonth) {
                total += price;
                if (item.category === 'medicine') breakdown.medicines += price;
                else if (item.category === 'test') breakdown.tests += price;
                else breakdown.bills += price;
            }
        });

        setTotalSpent(total);
        setCategoryBreakdown(breakdown);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newExpense = {
            title: formData.get('title'),
            amount: Number(formData.get('amount')),
            category: formData.get('category'),
            date: formData.get('date') || new Date().toISOString(),
            notes: formData.get('notes')
        };

        await saveExpense(user.uid, newExpense);
        setShowAddModal(false);
        loadExpenses();
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Wallet className="text-teal-600" /> Health Expenses
                </h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-teal-600/20 transition"
                >
                    <Plus size={18} /> Add Expense
                </button>
            </div>

            {/* Smart Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-5 rounded-2xl shadow-md">
                    <p className="text-teal-100 text-sm font-medium mb-1">Total Spent (This Month)</p>
                    <h3 className="text-3xl font-bold">₹{totalSpent.toLocaleString()}</h3>
                    <div className="mt-3 flex items-center gap-2 text-xs bg-white/20 w-fit px-2 py-1 rounded-lg">
                        <TrendingUp size={14} /> Tracking active
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                            <ShoppingBag size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400">MEDICINES</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{categoryBreakdown.medicines.toLocaleString()}</h3>
                    <p className="text-xs text-gray-500 mt-1">Pharmacy bills</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400">TESTS</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{categoryBreakdown.tests.toLocaleString()}</h3>
                    <p className="text-xs text-gray-500 mt-1">Lab reports & scans</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                            <FileText size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400">OTHER BILLS</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">₹{categoryBreakdown.bills.toLocaleString()}</h3>
                    <p className="text-xs text-gray-500 mt-1">Consultations & etc.</p>
                </div>
            </div>

            {/* Expense List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-white">Transaction History</h3>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-400">Loading...</div>
                ) : expenses.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                        <Wallet size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No expenses recorded yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {expenses.map((expense) => (
                            <div key={expense.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${expense.category === 'medicine' ? 'bg-blue-100 text-blue-600' :
                                            expense.category === 'test' ? 'bg-purple-100 text-purple-600' :
                                                'bg-orange-100 text-orange-600'
                                        }`}>
                                        {expense.category === 'medicine' ? <ShoppingBag size={18} /> :
                                            expense.category === 'test' ? <Activity size={18} /> : <FileText size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{expense.title}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <Calendar size={12} />
                                            {new Date(expense.date).toLocaleDateString()}
                                            {expense.notes && <span>• {expense.notes}</span>}
                                        </div>
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    - ₹{Number(expense.amount).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Manual Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">Add Expense</h2>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input name="title" required placeholder="e.g. Paracetamol Strip" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                                    <input name="amount" type="number" required placeholder="0" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select name="category" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                                        <option value="medicine">Medicine</option>
                                        <option value="test">Lab Test</option>
                                        <option value="bill">Hospital Bill</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                                <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                                <textarea name="notes" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rows-2" placeholder="Dr. Smith consultation..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium dark:text-gray-200">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-lg shadow-teal-600/20">Save Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
