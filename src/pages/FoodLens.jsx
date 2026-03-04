import React, { useState } from 'react';
import { useSettings } from '../App';
import { analyzeImage } from '../services/aiService';
import { Loader2, Upload, Utensils, Flame, Leaf, Droplet, Wheat, Info } from 'lucide-react';

export default function FoodLens() {
    const { language } = useSettings();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        setLoading(true);
        setResult(null);

        try {
            const data = await analyzeImage(file, 'food', language);
            setResult(data);
        } catch (err) {
            console.error(err);
            alert(`Error analyzing food: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white flex items-center gap-3">
                <Utensils className="text-orange-500" /> Food Lens
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Upload a photo of your meal to get instant nutritional insights.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-500 transition-colors group text-center shadow-sm relative overflow-hidden">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            disabled={loading}
                        />

                        {preview ? (
                            <div className="relative rounded-2xl overflow-hidden aspect-video shadow-md">
                                <img src={preview} alt="Food Preview" className="w-full h-full object-cover" />
                                {loading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                                        <div className="bg-white/90 p-4 rounded-full shadow-lg">
                                            <Loader2 className="animate-spin text-orange-500 w-8 h-8" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors">
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Upload size={32} className="text-orange-400 dark:text-orange-500" />
                                </div>
                                <p className="font-semibold text-lg text-gray-600 dark:text-gray-300">Click or Drag food photo here</p>
                                <p className="text-sm mt-2 opacity-70">Supports JPG, PNG</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Section */}
                <div>
                    {result ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            {/* Summary Card */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-orange-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nutrition Facts</h2>
                                    <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-4 py-1.5 rounded-full text-sm font-bold">
                                        {result.total_calories} kcal
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl">
                                        <div className="flex justify-center mb-2"><Leaf className="text-red-500" size={20} /></div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Carbs</p>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{result.total_carbs || "0g"}</p>
                                    </div>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
                                        <div className="flex justify-center mb-2"><Droplet className="text-blue-500" size={20} /></div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Protein</p>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{result.total_protein || "0g"}</p>
                                    </div>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl">
                                        <div className="flex justify-center mb-2"><Flame className="text-yellow-500" size={20} /></div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Fat</p>
                                        <p className="font-bold text-gray-900 dark:text-gray-100">{result.total_fat || "0g"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Food Items List */}
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Utensils size={18} className="text-gray-400" /> Found Items
                                </h3>
                                <div className="space-y-3">
                                    {/* Handle dynamic list of items if structure allows, assumed structure from earlier prompts */}
                                    {/* Assuming structure: items: [{name, portion, calories}] */}
                                    {result.items && result.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-200">{item.name}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{item.portion}</p>
                                            </div>
                                            <span className="font-medium text-orange-600 dark:text-orange-400">{item.calories} kcal</span>
                                        </div>
                                    ))}
                                    {!result.items && (
                                        <p className="text-sm text-gray-500 italic">Breakdown not available.</p>
                                    )}
                                </div>
                            </div>

                            {/* Analysis/Tips */}
                            {result.analysis && (
                                <div className="bg-teal-50 dark:bg-teal-900/20 p-5 rounded-2xl border border-teal-100 dark:border-teal-800">
                                    <h3 className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-2 mb-2">
                                        <Info size={18} /> Dietician's Note
                                    </h3>
                                    <p className="text-teal-900 dark:text-teal-100 text-sm leading-relaxed">
                                        {result.analysis}
                                    </p>
                                </div>
                            )}

                        </div>
                    ) : (
                        /* Initial Empty State / Guidelines */
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 text-center h-full flex flex-col justify-center items-center">
                            <Wheat size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">How it works</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto">
                                Take a clear photo of your meal. Our AI will identify the food items and estimate the nutritional values for you.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
