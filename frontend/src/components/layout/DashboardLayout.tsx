import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, Settings, LogOut, BarChart3, History, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { Button } from '../ui/button';

interface DashboardLayoutProps {
    children: ReactNode;
}

const EcoFlowLogo = ({ className = "" }: { className?: string }) => (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="8" fill="url(#gradient)" />
        <path d="M12 14h16M12 20h12M12 26h16" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="28" cy="20" r="2" fill="white" />
        <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6B9FD4" />
                <stop offset="1" stopColor="#5A8EC3" />
            </linearGradient>
        </defs>
    </svg>
);

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const mainContent = document.querySelector('main');
            if (mainContent && mainContent.scrollTop > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        const mainContent = document.querySelector('main');
        mainContent?.addEventListener('scroll', handleScroll);
        return () => mainContent?.removeEventListener('scroll', handleScroll);
    }, []);

    if (!user) return null;

    const isActive = (path: string) => location.pathname === path;

    const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <Link
            to={to}
            className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 group relative ${isActive(to)
                ? 'bg-primary-soft text-primary font-semibold shadow-sm'
                : 'text-gray-700 hover:text-primary hover:bg-accent'
                }`}
            title={isSidebarCollapsed ? label : undefined}
        >
            <Icon className={`h-4 w-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
            <span className={`truncate transition-all duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                {label}
            </span>
            {isSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {label}
                </div>
            )}
        </Link>
    );

    const getDashboardLink = () => {
        switch (user.role) {
            case Role.ENGINEERING_USER: return '/engineering';
            case Role.APPROVER: return '/approver';
            case Role.OPERATIONS_USER: return '/operations';
            case Role.ADMIN: return '/admin';
            default: return '/';
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Bar */}
            <header className={`bg-white border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 transition-all duration-300 ${
                isScrolled ? 'h-14 shadow-lg' : 'h-16 shadow-soft'
            }`}>
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="md:hidden hover:bg-primary-soft hover:text-primary"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                    
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isScrolled ? 'scale-95' : 'scale-100'}`}>
                        <EcoFlowLogo className={`transition-all duration-300 ${isScrolled ? 'h-8 w-8' : 'h-10 w-10'}`} />
                        <span className={`font-bold text-gray-900 transition-all duration-300 ${isScrolled ? 'text-lg' : 'text-xl'}`}>
                            EcoFlow
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-semibold text-gray-900">{user.name || 'User'}</div>
                        <div className="text-xs text-gray-600">{user.email}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout} title="Sign Out" className="hover:bg-primary-soft hover:text-primary">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={`bg-white border-r border-border hidden md:flex md:flex-col shadow-soft transition-all duration-300 ease-in-out ${
                    isSidebarCollapsed ? 'w-16' : 'w-64'
                }`}>
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {/* Menu Header with Toggle */}
                        <div className="flex items-center justify-between mb-3 px-3">
                            {!isSidebarCollapsed && (
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    MENU
                                </div>
                            )}
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className={`text-gray-500 hover:text-primary transition-colors ${isSidebarCollapsed ? 'mx-auto' : ''}`}
                                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            >
                                {isSidebarCollapsed ? (
                                    <ChevronRight className="h-4 w-4" />
                                ) : (
                                    <ChevronLeft className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        <NavLink to={getDashboardLink()} icon={LayoutDashboard} label="Dashboard" />

                        {/* Information Architecture: Everyone sees Products */}
                        <NavLink to="/products" icon={Package} label="Products" />

                        {/* Engineering & Admin Links */}
                        {(user.role === Role.ENGINEERING_USER || user.role === Role.ADMIN) && (
                            <>
                                <NavLink to="/ecos" icon={FileText} label="ECOs" />
                                <NavLink to="/boms" icon={Package} label="BOMs" />
                            </>
                        )}

                        {/* Operations User - BOMs (Read-Only) */}
                        {user.role === Role.OPERATIONS_USER && (
                            <NavLink to="/boms" icon={Package} label="BOMs (Active)" />
                        )}

                        {/* Approver Links - Only show if not admin */}
                        {user.role === Role.APPROVER && (
                            <NavLink to="/ecos" icon={FileText} label="Pending Approvals" />
                        )}

                        {/* Operations Links - Removed production and inventory */}
                        {/* Operations users now only access BOMs through their dashboard */}

                        {/* Reports & Audit - Available to all except Operations */}
                        {user.role !== Role.OPERATIONS_USER && (
                            <>
                                {!isSidebarCollapsed && (
                                    <div className="pt-4 pb-2">
                                        <div className="h-px bg-border mx-3" />
                                    </div>
                                )}
                                <NavLink to="/reports" icon={BarChart3} label="Reports" />
                                <NavLink to="/audit" icon={History} label="Audit Logs" />
                            </>
                        )}

                        {/* Admin Only */}
                        {user.role === Role.ADMIN && (
                            <>
                                {!isSidebarCollapsed && (
                                    <>
                                        <div className="pt-4 pb-2">
                                            <div className="h-px bg-border mx-3" />
                                        </div>
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                                            ADMIN
                                        </div>
                                    </>
                                )}
                                <NavLink to="/settings" icon={Settings} label="Settings" />
                            </>
                        )}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-background">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};
