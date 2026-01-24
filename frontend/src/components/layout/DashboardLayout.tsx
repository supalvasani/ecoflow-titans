import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types/auth';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FileText, Settings, LogOut, Users, Activity, BarChart3, History } from 'lucide-react';
import { Button } from '../ui/button';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const isActive = (path: string) => location.pathname === path;

    const NavLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
        <Link
            to={to}
            className={`flex items-center px-3 py-2 text-sm rounded transition-colors ${isActive(to)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            <Icon className="mr-3 h-4 w-4" />
            {label}
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
            <header className="bg-card border-b border-border h-16 flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">
                        E
                    </div>
                    <span className="text-lg font-bold">EcoFlow</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-medium">{user.name || 'User'}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={logout} title="Sign Out">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-64 bg-card border-r border-border hidden md:block">
                    <nav className="p-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">
                            Menu
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

                        {/* Approver Links */}
                        {(user.role === Role.APPROVER || user.role === Role.ADMIN) && (
                            <NavLink to="/ecos" icon={FileText} label="Pending Approvals" />
                        )}

                        {/* Operations Links */}
                        {(user.role === Role.OPERATIONS_USER || user.role === Role.ADMIN) && (
                            <>
                                <NavLink to="/production" icon={Activity} label="Production" />
                                <NavLink to="/inventory" icon={Package} label="Inventory" />
                            </>
                        )}

                        {/* Reports & Audit - Available to all */}
                        <div className="pt-4 pb-2">
                            <div className="h-px bg-border mx-3" />
                        </div>
                        <NavLink to="/reports" icon={BarChart3} label="Reports" />
                        <NavLink to="/audit" icon={History} label="Audit Logs" />

                        {/* Admin Only */}
                        {user.role === Role.ADMIN && (
                            <>
                                <div className="pt-4 pb-2">
                                    <div className="h-px bg-border mx-3" />
                                </div>
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                                    Admin
                                </div>
                                <NavLink to="/users" icon={Users} label="Users" />
                                <NavLink to="/settings" icon={Settings} label="Settings" />
                            </>
                        )}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
