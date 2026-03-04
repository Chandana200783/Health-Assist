import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, Square, CheckCircle, Timer, Dumbbell, Activity } from 'lucide-react';

export default function WorkoutTimer({ workout, onClose }) {
    const [timeLeft, setTimeLeft] = useState(workout.duration * 60); // Convert min to sec
    const [isActive, setIsActive] = useState(false); // Start paused
    const [hasStarted, setHasStarted] = useState(false); // To show overview first
    const [isCompleted, setIsCompleted] = useState(false);
    const intervalRef = useRef(null);

    // Timer Logic
    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        setIsCompleted(true);
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }

        return () => clearInterval(intervalRef.current);
    }, [isActive, timeLeft]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStart = () => {
        setHasStarted(true);
        setIsActive(true);
    };

    const toggleTimer = () => setIsActive(!isActive);

    const stopWorkout = () => {
        if (window.confirm("Stop this workout?")) {
            setIsActive(false);
            clearInterval(intervalRef.current);
            onClose();
        }
    };

    if (!workout) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className={`bg-white dark:bg-gray-800 w-full ${hasStarted ? 'max-w-md' : 'max-w-3xl'} mx-4 p-8 rounded-3xl shadow-2xl relative border border-gray-200 dark:border-gray-700 transition-all duration-500`}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition z-10"
                >
                    <X size={20} className="text-gray-600 dark:text-gray-300" />
                </button>

                {/* Overview Mode */}
                {!hasStarted && !isCompleted && (
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left: Exercise List */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <span className="inline-block px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                                    Workout Plan
                                </span>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{workout.title}</h2>
                                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Timer size={16} /> Total Duration: {workout.duration} Mins
                                </p>
                            </div>

                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                {workout.exercises && workout.exercises.map((ex, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-900 dark:text-white">{ex.name}</h4>
                                            <span className="text-xs font-semibold bg-white dark:bg-gray-600 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500">
                                                {ex.duration}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pose: {ex.pose}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: Start Action */}
                        <div className="md:w-1/3 flex flex-col justify-center items-center bg-teal-50 dark:bg-teal-900/10 rounded-2xl p-6 border border-teal-100 dark:border-teal-800/30">
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-6 text-teal-600">
                                <Dumbbell size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-teal-900 dark:text-teal-100 mb-2">Ready?</h3>
                            <p className="text-center text-teal-700 dark:text-teal-300 text-sm mb-6">
                                Prepare your space and water bottle. Let's get moving!
                            </p>
                            <button
                                onClick={handleStart}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition flex items-center justify-center gap-2"
                            >
                                <Play size={20} fill="currentColor" /> Start Workout
                            </button>
                        </div>
                    </div>
                )}

                {/* Timer Mode */}
                {hasStarted && !isCompleted && (
                    <div className="text-center space-y-8 animate-in fade-in zoom-in-95">
                        <div>
                            <span className="inline-block px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
                                In Progress
                            </span>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{workout.title}</h2>
                        </div>

                        {/* Timer Display */}
                        <div className="relative inline-flex items-center justify-center">
                            <div className={`text-8xl font-mono font-bold tracking-widest tabular-nums transition-colors ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6">
                            <button
                                onClick={stopWorkout}
                                className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30 transition shadow-sm"
                                title="Stop Workout"
                            >
                                <Square size={24} fill="currentColor" />
                            </button>

                            <button
                                onClick={toggleTimer}
                                className="p-6 rounded-full bg-teal-600 text-white hover:bg-teal-700 transition shadow-xl shadow-teal-600/30 transform hover:scale-110 active:scale-95"
                                title={isActive ? "Pause" : "Resume"}
                            >
                                {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>

                            <div className="w-14" />
                        </div>

                        {/* Mini List of Exercises under Timer */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-left max-h-[150px] overflow-y-auto">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sequence</p>
                            <div className="space-y-2">
                                {workout.exercises && workout.exercises.map((ex, idx) => (
                                    <div key={idx} className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                        <span>{idx + 1}. {ex.name}</span>
                                        <span className="font-mono">{ex.duration}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Completion Mode - Same as before */}
                {isCompleted && (
                    <div className="text-center py-10 space-y-6 animate-in fade-in zoom-in-95">
                        <div className="inline-flex p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full mb-2">
                            <CheckCircle size={64} />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Great Job!</h2>
                        <p className="text-gray-500 dark:text-gray-400">You completed the <span className="font-bold text-teal-600">{workout.title}</span> session.</p>
                        <button
                            onClick={onClose}
                            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 transition transform hover:scale-105"
                        >
                            Finish
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
