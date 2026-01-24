// Login Page - EcoFlow Design System
import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRoleBasedPath } from '../utils/routing';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    if (user) {
        const redirectPath = getRoleBasedPath(user.role);
        navigate(redirectPath, { replace: true });
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        // Client-side validation
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
            const currentUser = user; // Get the updated user after login

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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-surface border border-border rounded p-8">
                    {/* Logo/Branding */}
                    <div className="mb-6">
                        <h1 className="text-page-title text-text-primary">EcoFlow</h1>
                        <p className="text-meta mt-2">Engineering Change Order System</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="field-spacing">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(''); // Clear error on input
                                }}
                                required
                                autoFocus
                                className="w-full h-10 px-3 text-sm text-text-primary bg-surface border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="you@company.com"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError(''); // Clear error on input
                                }}
                                required
                                className="w-full h-10 px-3 text-sm text-text-primary bg-surface border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="••••••••"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="px-3 py-2 bg-error-soft border border-error-strong/20 rounded">
                                <p className="text-sm text-error-strong">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                backgroundColor: '#1F3D3A',
                                color: 'white'
                            }}
                            className="w-full h-10 font-medium text-sm rounded transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-xs text-text-muted text-center mt-6">
                    © 2026 EcoFlow. All rights reserved.
                </p>
            </div>
        </div>
    );
};
