import { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Settings as SettingsIcon, Shield, GitBranch } from 'lucide-react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<'stages' | 'approval'>('stages');

    const SettingsTab = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <SettingsIcon className="h-8 w-8" />
                        Settings
                    </h2>
                    <p className="text-muted-foreground">Configure system settings and workflows</p>
                </div>

                {/* Settings Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <SettingsTab id="stages" label="ECO Stages" icon={GitBranch} />
                        <SettingsTab id="approval" label="Approval Rules" icon={Shield} />
                    </nav>
                </div>

                {/* ECO Stages Management */}
                {activeTab === 'stages' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>ECO Stage Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="py-20 text-center">
                            <GitBranch className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                ECO Stage Management
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Configure ECO workflow stages, approval requirements, and sequencing.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                This feature requires backend API support and will be available in a future update.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Approval Rules */}
                {activeTab === 'approval' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Approval Rule Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="py-20 text-center">
                            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Approval Rules
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                Define role-based approval requirements for each ECO stage.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                This feature requires backend API support and will be available in a future update.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
