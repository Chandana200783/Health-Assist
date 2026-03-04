import React, { useState } from 'react';
import { HeartPulse, Activity, AlertTriangle, Flame, Droplet, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';

export default function FirstAid() {
    const [expandedTopic, setExpandedTopic] = useState(null);

    const toggleTopic = (id) => {
        setExpandedTopic(expandedTopic === id ? null : id);
    };

    const topics = [
        {
            id: 'cpr',
            title: 'CPR (Cardiopulmonary Resuscitation)',
            icon: <HeartPulse className="w-6 h-6 text-red-500" />,
            color: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
            description: 'Emergency lifesaving procedure performed when the heart stops beating.',
            steps: [
                'Check responsiveness: Shake the person and shout "Are you okay?".',
                'Call Emergency (108/911) immediately.',
                'Check breathing: Look for chest motion preferably for no more than 10 seconds.',
                'Start Compressions: Place heel of hand on center of chest. Interlock fingers.',
                'Push Hard & Fast: Push down 2 inches at a rate of 100-120 compressions per minute.',
                'Allow chest recoil: Let chest return to normal position after each push.',
                'Continue until help arrives or person breathes.'
            ],
            warning: 'Hands-only CPR is recommended for untrained bystanders.'
        },
        {
            id: 'heart-attack',
            title: 'Heart Attack',
            icon: <Activity className="w-6 h-6 text-blue-500" />,
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800',
            description: 'Occurs when blood flow to the heart is blocked. Quick action saves lives.',
            steps: [
                'Call Emergency immediately.',
                'Have the person sit down, rest, and try to keep calm.',
                'Loosen tight clothing.',
                'If person is not allergic to aspirin, have them chew and swallow one baby aspirin (325mg).',
                'If person has prescribed nitroglycerin, help them take it.',
                'Start CPR if person becomes unconscious and stops breathing.'
            ],
            symptoms: 'Chest pain/pressure, Shortness of breath, Cold sweat, Nausea.'
        },
        {
            id: 'snake-bite',
            title: 'Snake Bite',
            icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
            color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
            description: 'Immediate care for venomous and non-venomous snake bites.',
            steps: [
                'Move safely away from the snake.',
                'Keep the bitten area STILL and BELOW the heart level to slow venom spread.',
                'Remove jewelry or tight clothing before swelling starts.',
                'Clean the wound gently, but DO NOT flush with water.',
                'Cover with a clean, dry dressing.',
                'Transport to hospital immediately.'
            ],
            donts: [
                'DO NOT apply a tourniquet.',
                'DO NOT cut the wound or try to suck out venom.',
                'DO NOT apply ice or cold packs.'
            ]
        },
        {
            id: 'accident',
            title: 'Road Accident / Bleeding',
            icon: <UserMinus className="w-6 h-6 text-slate-500" />,
            color: 'bg-slate-50 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800',
            description: 'Managing trauma and severe bleeding until help arrives.',
            steps: [
                'Ensure scene safety before approaching.',
                'Apply direct pressure to the wound with a clean cloth/bandage.',
                'Keep pressure applied constantly; do not peek to see if bleeding stopped.',
                'Add more layers if blood soaks through.',
                'If bleeding is severe on a limb, a tourniquet may be used as last resort by trained personnel.',
                'Keep the person warm (treat for shock).'
            ]
        },
        {
            id: 'burns',
            title: 'Burns & Scalds',
            icon: <Flame className="w-6 h-6 text-orange-500" />,
            color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800',
            description: 'First aid for thermal or chemical burns.',
            steps: [
                'Cool the burn under cool (not cold) running water for 10-20 minutes.',
                'Remove rings or tight items from burned area before swelling.',
                'Do not break blisters.',
                'Cover loosely with sterile, non-stick bandage.',
                'Seek medical help for severe burns or chemical burns.'
            ]
        },
        {
            id: 'choking',
            title: 'Choking',
            icon: <Droplet className="w-6 h-6 text-cyan-500" />,
            color: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-100 dark:border-cyan-800',
            description: 'Helping someone who cannot breathe due to blocked airway.',
            steps: [
                'Encourage coughing if they can cough effectively.',
                'Give 5 back blows: Lean person forward, hit between shoulder blades.',
                'Heimlich Maneuver: Stand behind, wrap arms around waist.',
                'Make a fist above navel, grab with other hand.',
                'Perform 5 quick, upward abdominal thrusts.',
                'Repeat back blows and thrusts until object clears or person becomes unconscious.'
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <HeartPulse className="text-red-600" size={32} /> First Aid & Emergency
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quick guides for medical emergencies. Call emergency services immediately in critical situations.</p>
                </div>

            </div>

            <div className="grid gap-4">
                {topics.map(topic => (
                    <div
                        key={topic.id}
                        className={`border rounded-2xl transition-all duration-300 overflow-hidden ${expandedTopic === topic.id ? 'shadow-md ring-2 ring-teal-500/20' : 'shadow-sm hover:shadow-md'} ${topic.color} bg-opacity-50`}
                    >
                        <button
                            onClick={() => toggleTopic(topic.id)}
                            className="w-full flex items-center justify-between p-5 text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm">
                                    {topic.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{topic.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">{topic.description}</p>
                                </div>
                            </div>
                            {expandedTopic === topic.id ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                        </button>

                        {expandedTopic === topic.id && (
                            <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2">
                                <div className="h-px w-full bg-gray-200 dark:bg-gray-700/50 mb-4"></div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        Immediate Steps:
                                    </h4>
                                    <ol className="space-y-3 list-decimal list-inside text-gray-700 dark:text-gray-300 ml-1">
                                        {topic.steps.map((step, idx) => (
                                            <li key={idx} className="pl-2 marker:font-bold marker:text-teal-600">{step}</li>
                                        ))}
                                    </ol>

                                    {topic.warning && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm font-medium flex gap-2">
                                            <AlertTriangle size={18} className="shrink-0" /> {topic.warning}
                                        </div>
                                    )}

                                    {topic.donts && (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm uppercase tracking-wide">Critical Don'ts:</h4>
                                            <ul className="space-y-1">
                                                {topic.donts.map((dont, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="text-red-500 font-bold">×</span> {dont}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="text-center text-xs text-gray-400 mt-8 p-4 border-t border-gray-100 dark:border-gray-800">
                DISCLAIMER: This information is for educational purposes only and not a substitute for professional medical advice.
                Always call emergency services in critical situations.
            </div>
        </div>
    );
}
