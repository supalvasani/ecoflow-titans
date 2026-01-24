// Operations Dashboard - EcoFlow Design System
import { DashboardLayout } from '../components/layout/DashboardLayout';

export const OperationsDashboard = () => {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight mb-6">Operations Dashboard</h2>

                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <p className="text-muted-foreground">
                        Welcome to the Operations Dashboard. Use the sidebar to view active products and inventory.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};
