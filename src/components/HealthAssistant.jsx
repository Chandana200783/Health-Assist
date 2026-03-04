import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { chatWithHealthAssistant } from '../services/aiService';
import { useAuthState } from '../hooks/useAuth';
import { useProfile } from '../App';
import ReactMarkdown from 'react-markdown';

export default function HealthAssistant() {
    const { user } = useAuthState();
    const { currentProfile } = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'model', text: "Hi! I'm your personal Health Assistant. How can I help you today?" }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            // Context for the AI
            const context = {
                userCheck: user ? 'Authenticated' : 'Guest',
                profileName: currentProfile?.name || 'User',
                profileData: currentProfile || {}
            };

            // Format history for Gemini (excluding the very first greeting if needed, 
            // but Gemini SDK handles history array well if formatted as { role: 'user'|'model', parts: [{ text: ... }] })
            // Here we just pass the raw list and let the service handle formatting if needed, 
            // OR distinct history management inside the component.
            // Let's refine the service call: we pass a "history" array compatible with Gemini.

            const geminiHistory = messages.slice(1).map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const responseText = await chatWithHealthAssistant(geminiHistory, userMsg, context);

            setMessages(prev => [...prev, { role: 'model', text: responseText }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, I am having trouble connecting. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-50 transition-all duration-300 hover:scale-105 ${isOpen ? 'bg-red-500 text-white rotate-90' : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white'}`}
            >
                {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <Bot className="text-white" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Health Assistant</h3>
                        <p className="text-teal-100 text-xs flex items-center gap-1">
                            <Sparkles size={10} /> AI Powered
                        </p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                ? 'bg-teal-600 text-white rounded-tr-none'
                                : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-600 shadow-sm'
                                }`}>
                                {/* <ReactMarkdown
                                    className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown> */}
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-600 shadow-sm flex gap-2 items-center">
                                <Loader2 className="animate-spin text-teal-600 dark:text-teal-400" size={16} />
                                <span className="text-gray-400 text-xs">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask anything about health..."
                        className="flex-1 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white p-2 rounded-xl transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </>
    );
}
