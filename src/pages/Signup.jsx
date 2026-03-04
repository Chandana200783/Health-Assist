import React, { useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';

export default function Signup() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleSignup = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // Firestore profile creation handled by App.jsx or trigger if needed, 
            // but for now simple redirect is fine as main hook handles user check
            navigate('/');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!name || !email || !password) {
            setError("All fields are required.");
            setLoading(false);
            return;
        }

        try {
            // 1. Create User
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Update Profile Name
            await updateProfile(user, { displayName: name });

            // 3. Create Firestore User Document
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: name,
                createdAt: new Date(),
                family: [] // Initialize empty family array
            });

            // 4. Force Logout so user must sign in again
            await auth.signOut();

            alert("Account created successfully! Please log in.");
            navigate('/login');
        } catch (error) {
            console.error("Signup Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setError("Email already in use. Try logging in.");
            } else if (error.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen bg-white flex overflow-hidden">
            {/* Left Side - Form */}
            <div className="w-full md:w-1/2 h-full flex flex-col justify-center items-center p-8 z-20 bg-white">
                <div className="w-full max-w-sm lg:max-w-md space-y-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
                        <p className="text-gray-500">Start your health journey today</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-900 block">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white text-gray-900 placeholder:text-gray-400"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-900 block">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white text-gray-900 placeholder:text-gray-400"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-900 block">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-teal-600 focus:ring-2 focus:ring-teal-100 outline-none transition bg-white text-gray-900 placeholder:text-gray-400"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition shadow-lg active:scale-[0.98]">
                                {loading ? "Creating Account..." : "Sign Up"}
                            </button>

                            <button
                                type="button"
                                onClick={handleGoogleSignup}
                                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl border border-gray-300 flex justify-center items-center gap-2 transition active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign up with Google
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-sm text-gray-500">
                        Already have an account? <Link to="/login" className="font-bold text-teal-600 hover:underline">Log in</Link>
                    </p>

                    {error && <p className="text-red-500 text-center text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
                </div>
            </div>

            {/* Right Side - Same Arc Pattern */}
            <div className="hidden md:block absolute top-0 right-0 bottom-0 w-1/2 overflow-hidden pointer-events-none z-10">
                <div className="absolute top-1/2 right-0 translate-x-[20%] -translate-y-1/2 h-[130vh] w-[130vh] bg-white rounded-full border-[20px] border-white overflow-hidden shadow-none">
                    {/* Reusing login background or could be different */}
                    <img
                        src="/login-bg.png"
                        alt="Medical Background"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
}
