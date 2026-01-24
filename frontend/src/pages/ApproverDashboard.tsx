// Approver Dashboard - EcoFlow Design System
import { useAuth } from '../contexts/AuthContext';

export const ApproverDashboard = () => {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <header className="bg-surface border-b border-border h-16 flex items-center justify-between px-8">
                <h1 className="text-page-title text-text-primary">EcoFlow</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">{user?.email}</span>
                    <button
                        onClick={logout}
                        className="h-10 px-4 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-60 bg-sidebar border-r border-border min-h-[calc(100vh-4rem)] p-4">
                    <nav className="space-y-2">
                        <div className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">
                            Navigation
                        </div>
                        <a href="#" className="block px-3 py-2 text-sm text-text-primary bg-primary-soft border-l-2 border-primary rounded">
                            Dashboard
                        </a>
                        <a href="#" className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar/50 rounded">
                            Pending Approvals
                        </a>
                        <a href="#" className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar/50 rounded">
                            Approved ECOs
                        </a>
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-page-title text-text-primary mb-6">Approver Dashboard</h2>

                        <div className="bg-surface border border-border rounded card-spacing">
                            <p className="text-sm text-text-secondary">
                                Welcome to the Approver Dashboard. This is a placeholder page.
                            </p>
                            <p className="text-sm text-text-muted mt-4">
                                Role: Approver
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
