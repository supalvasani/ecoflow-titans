// Login Page - SynchroShift Production UI
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleBasedPath } from '../utils/routing';
import { Button } from '../components/ui/button';
import { Mail, Lock, Eye, EyeOff, Layers } from 'lucide-react';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectPath = getRoleBasedPath(user.role);
            navigate(redirectPath, { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email and password are required');
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            await login(email, password);
            const currentUser = user;

            if (currentUser) {
                const redirectPath = getRoleBasedPath(currentUser.role);
                navigate(redirectPath, { replace: true });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid credentials');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans text-slate-900">
            <div className="w-full max-w-md space-y-6">
                
                {/* Brand Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-white shadow-sm mb-1">
                        <Layers className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SynchroShift</h1>
                    <p className="text-sm text-slate-500 font-medium">Catalog & Merchandising Governance Platform</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Enter your organization credentials</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setError('');
                                    }}
                                    required
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                                    placeholder="name@company.com"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
                                    placeholder="••••••••"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Notice */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-medium">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-sm transition shadow-sm"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-400">
                    © 2026 SynchroShift Enterprise Governance. All rights reserved.
                </p>
            </div>
        </div>
    );
};
