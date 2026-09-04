import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    GitBranch,
    FileSpreadsheet,
    BarChart2,
    Settings,
    LogOut,
    Users
} from 'lucide-react';

interface DashboardLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    action?: ReactNode;
}

interface NavItemProps {
    to: string;
    icon: any;
    label: string;
    active: boolean;
    badge?: number;
}

function NavItem({ to, icon: Icon, label, active, badge }: NavItemProps) {
    return (
        <Link
            to={to}
            className={`flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                active
                    ? 'bg-[#EAE7DF] text-[#1C1B19] font-semibold'
                    : 'text-[#6B6862] hover:text-[#1C1B19] hover:bg-[#EFECE5]'
            }`}
        >
            <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#2F4B3C]' : 'text-[#6B6862]'}`} />
                <span>{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#DEDBD4] text-[#1C1B19] rounded">
                    {badge}
                </span>
            )}
        </Link>
    );
}

export const DashboardLayout = ({ children, title, subtitle, action }: DashboardLayoutProps) => {
    const { user, logout } = useAuth();
    const location = useLocation();

    if (!user) return null;

    const role = user.role;
    const isMerchandiser = role === 'MERCHANDISER';
    const isApprover = role === 'CATEGORY_APPROVER';
    const isStorefront = role === 'STOREFRONT_VIEWER';
    const isAdmin = role === 'ADMIN';

    const getRoleLabel = () => {
        if (isAdmin) return 'Administrator';
        if (isApprover) return 'Category Approver';
        if (isMerchandiser) return 'Merchandiser';
        return 'Storefront Viewer';
    };

    return (
        <div className="min-h-screen bg-[#F7F6F3] text-[#1C1B19] flex">
            {/* Left Sidebar */}
            <aside className="w-56 bg-[#F7F6F3] border-r border-[#DEDBD4] flex flex-col justify-between shrink-0 select-none">
                <div>
                    {/* App Header */}
                    <div className="px-4 py-4 border-b border-[#DEDBD4] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-[#2F4B3C] rounded-[2px]" />
                            <span className="font-serif font-semibold text-sm tracking-tight text-[#1C1B19]">
                                SynchroShift
                            </span>
                        </div>
                        <span className="font-mono text-[10px] text-[#6B6862] border border-[#DEDBD4] px-1 py-0.5 rounded-[2px]">
                            v2.4
                        </span>
                    </div>

                    {/* Navigation Links */}
                    <nav className="p-2 space-y-0.5">
                        <div className="px-2.5 pt-2 pb-1 text-[10px] font-mono text-[#6B6862] uppercase tracking-wider">
                            Console
                        </div>

                        {/* 1. Dashboard */}
                        <NavItem
                            to="/"
                            icon={LayoutDashboard}
                            label="Dashboard"
                            active={location.pathname === '/' || location.pathname === '/merchandiser' || location.pathname === '/approver' || location.pathname === '/storefront' || location.pathname === '/admin'}
                        />

                        {/* 2. Catalog */}
                        <NavItem
                            to="/products"
                            icon={Package}
                            label="Catalog Items"
                            active={location.pathname.startsWith('/products') || location.pathname.startsWith('/catalog')}
                        />

                        {/* 3. Variant Sets */}
                        <NavItem
                            to="/variant-sets"
                            icon={GitBranch}
                            label="Variant Sets"
                            active={location.pathname.startsWith('/variant-sets')}
                        />

                        {/* 4. Change Requests (CCRs) - Hidden for Storefront */}
                        {!isStorefront && (
                            <NavItem
                                to="/ccrs"
                                icon={FileSpreadsheet}
                                label="Change Requests"
                                active={location.pathname.startsWith('/ccrs')}
                            />
                        )}

                        {/* 5. Reports - Hidden for Storefront */}
                        {!isStorefront && (
                            <NavItem
                                to="/reports"
                                icon={BarChart2}
                                label="Reports"
                                active={location.pathname.startsWith('/reports')}
                            />
                        )}

                        {/* 6. Settings & Users - Admin Only */}
                        {isAdmin && (
                            <>
                                <div className="px-2.5 pt-4 pb-1 text-[10px] font-mono text-[#6B6862] uppercase tracking-wider">
                                    Governance
                                </div>
                                <NavItem
                                    to="/settings"
                                    icon={Settings}
                                    label="Stage Rules"
                                    active={location.pathname.startsWith('/settings')}
                                />
                                <NavItem
                                    to="/admin/users"
                                    icon={Users}
                                    label="User Directory"
                                    active={location.pathname.startsWith('/admin/users')}
                                />
                            </>
                        )}
                    </nav>
                </div>

                {/* Footer User Info & Sign Out */}
                <div className="p-3 border-t border-[#DEDBD4] bg-[#F7F6F3]">
                    <div className="flex items-center justify-between mb-2">
                        <div className="truncate">
                            <div className="text-xs font-medium text-[#1C1B19] truncate">{user.name || user.email}</div>
                            <div className="text-[10px] text-[#6B6862] flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2F4B3C]" />
                                {getRoleLabel()}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-1.5 py-1 text-[11px] text-[#6B6862] hover:text-[#8C3B2E] border border-[#DEDBD4] hover:border-[#8C3B2E] rounded transition-colors bg-white"
                    >
                        <LogOut className="w-3 h-3" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Header Context Bar */}
                {(title || action) && (
                    <header className="px-6 py-4 border-b border-[#DEDBD4] bg-white flex items-center justify-between shrink-0">
                        <div>
                            {title && <h1 className="text-lg font-serif font-medium text-[#1C1B19]">{title}</h1>}
                            {subtitle && <p className="text-xs text-[#6B6862] mt-0.5">{subtitle}</p>}
                        </div>
                        {action && <div className="flex items-center gap-2">{action}</div>}
                    </header>
                )}

                {/* Main Content Body */}
                <main className="p-6 flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
};
