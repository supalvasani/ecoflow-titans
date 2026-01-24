// Approver Dashboard - EcoFlow Design System
import { DashboardLayout } from '../components/layout/DashboardLayout';

export const ApproverDashboard = () => {
    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight mb-6">Approver Dashboard</h2>

                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                    <p className="text-muted-foreground">
                        Welcome to the Approver Dashboard. Use the sidebar to review pending ECOs.
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
};
