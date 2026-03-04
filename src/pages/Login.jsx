import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/');
        } catch (error) {
            setError(error.message);
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError("Please enter both email and password.");
            setLoading(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/');
        } catch (error) {
            console.error("Login Error:", error);
            if (error.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else if (error.code === 'auth/user-not-found') {
                setError("No account found with this email. Please sign up.");
            } else if (error.code === 'auth/wrong-password') {
                setError("Incorrect password.");
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
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back</h1>
                        <p className="text-gray-500">Please enter your details</p>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-5">
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

                        <div className="flex justify-between items-center text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                Remember for 30 days
                            </label>
                            <a href="#" className="text-teal-600 font-bold hover:underline">Forgot password</a>
                        </div>

                        <div className="space-y-3 pt-2">
                            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg active:scale-[0.98]">
                                Sign In
                            </button>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-bold py-3.5 rounded-xl border border-gray-300 flex justify-center items-center gap-2 transition active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </button>
                        </div>
                    </form>

                    <p className="text-center text-sm text-gray-500">
                        Don't have an account? <Link to="/signup" className="font-bold text-teal-600 hover:underline">Sign up</Link>
                    </p>

                    {error && <p className="text-red-500 text-center text-sm bg-red-50 p-2 rounded-lg">{error}</p>}
                </div>
            </div>

            {/* Right Side - Arc Pattern */}
            <div className="hidden md:block absolute top-0 right-0 bottom-0 w-1/2 overflow-hidden pointer-events-none z-10">
                {/* Positioned Arc */}
                <div className="absolute top-1/2 right-0 translate-x-[20%] -translate-y-1/2 h-[130vh] w-[130vh] bg-white rounded-full border-[20px] border-white overflow-hidden shadow-none">
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
