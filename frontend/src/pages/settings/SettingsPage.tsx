import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import type { ECOStage, ApprovalRules } from '../../services/settingsService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Settings as SettingsIcon, Shield, GitBranch, AlertCircle, Save, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'stages' | 'approval'>('stages');

    // ECO Stages state
    const [stages, setStages] = useState<ECOStage[]>([]);
    const [stagesLoading, setStagesLoading] = useState(true);
    const [stagesError, setStagesError] = useState<string | null>(null);
    const [stagesSaving, setStagesSaving] = useState(false);

    // Approval Rules state
    const [approvalRules, setApprovalRules] = useState<ApprovalRules | null>(null);
    const [rulesLoading, setRulesLoading] = useState(true);
    const [rulesError, setRulesError] = useState<string | null>(null);
    const [rulesSaving, setRulesSaving] = useState(false);

    useEffect(() => {
        if (activeTab === 'stages') {
            fetchStages();
        } else {
            fetchApprovalRules();
        }
    }, [activeTab, token]);

    const fetchStages = async () => {
        if (!token) return;
        try {
            setStagesLoading(true);
            const { stages: fetchedStages } = await settingsService.getStages(token);
            setStages(fetchedStages);
            setStagesError(null);
        } catch (err: any) {
            setStagesError(err.message || 'Failed to load stages');
        } finally {
            setStagesLoading(false);
        }
    };

    const fetchApprovalRules = async () => {
        if (!token) return;
        try {
            setRulesLoading(true);
            const rules = await settingsService.getApprovalRules(token);
            setApprovalRules(rules);
            setRulesError(null);
        } catch (err: any) {
            setRulesError(err.message || 'Failed to load approval rules');
        } finally {
            setRulesLoading(false);
        }
    };

    const handleSaveStages = async () => {
        if (!token) return;
        try {
            setStagesSaving(true);
            await settingsService.updateStages(token, stages);
            await fetchStages();
        } catch (err: any) {
            setStagesError(err.message || 'Failed to save stages');
        } finally {
            setStagesSaving(false);
        }
    };

    const handleSaveRules = async () => {
        if (!token || !approvalRules) return;
        try {
            setRulesSaving(true);
            await settingsService.updateApprovalRules(token, approvalRules);
            await fetchApprovalRules();
        } catch (err: any) {
            setRulesError(err.message || 'Failed to save approval rules');
        } finally {
            setRulesSaving(false);
        }
    };

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
                            <div className="flex justify-between items-center">
                                <CardTitle>ECO Stage Configuration</CardTitle>
                                <Button onClick={handleSaveStages} disabled={stagesSaving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {stagesSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {stagesError && (
                                <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    {stagesError}
                                </div>
                            )}

                            {stagesLoading ? (
                                <div className="text-center py-10">Loading stages...</div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 font-semibold text-sm text-gray-600 pb-2 border-b">
                                        <div className="col-span-1">Order</div>
                                        <div className="col-span-4">Stage Name</div>
                                        <div className="col-span-3">Requires Approval</div>
                                        <div className="col-span-3">Is Final</div>
                                        <div className="col-span-1"></div>
                                    </div>

                                    {stages.map((stage, index) => (
                                        <div key={stage.id} className="grid grid-cols-12 gap-4 items-center">
                                            <div className="col-span-1">
                                                <input
                                                    type="number"
                                                    value={stage.sequence}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[index].sequence = parseInt(e.target.value);
                                                        setStages(newStages);
                                                    }}
                                                    className="w-full px-2 py-1 border rounded"
                                                />
                                            </div>
                                            <div className="col-span-4">
                                                <input
                                                    type="text"
                                                    value={stage.name}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[index].name = e.target.value;
                                                        setStages(newStages);
                                                    }}
                                                    className="w-full px-3 py-2 border rounded"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="checkbox"
                                                    checked={stage.requiresApproval}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[index].requiresApproval = e.target.checked;
                                                        setStages(newStages);
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input
                                                    type="checkbox"
                                                    checked={stage.isFinal}
                                                    onChange={(e) => {
                                                        const newStages = [...stages];
                                                        newStages[index].isFinal = e.target.checked;
                                                        setStages(newStages);
                                                    }}
                                                    className="h-4 w-4"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setStages(stages.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setStages([...stages, {
                                                id: '',
                                                name: 'New Stage',
                                                sequence: stages.length + 1,
                                                requiresApproval: false,
                                                isFinal: false,
                                            }]);
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Stage
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Approval Rules */}
                {activeTab === 'approval' && (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Approval Rule Configuration</CardTitle>
                                <Button onClick={handleSaveRules} disabled={rulesSaving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {rulesSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {rulesError && (
                                <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    {rulesError}
                                </div>
                            )}

                            {rulesLoading ? (
                                <div className="text-center py-10">Loading approval rules...</div>
                            ) : approvalRules && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Role-Based Permissions</h3>
                                        <div className="grid grid-cols-3 gap-4 font-semibold text-sm text-gray-600 pb-2 border-b">
                                            <div>Role</div>
                                            <div>Can Approve</div>
                                            <div>Can Reject</div>
                                        </div>

                                        {approvalRules.rules.map((rule, index) => (
                                            <div key={rule.role} className="grid grid-cols-3 gap-4 items-center py-3 border-b">
                                                <div className="font-medium">{rule.role}</div>
                                                <div>
                                                    <input
                                                        type="checkbox"
                                                        checked={rule.canApprove}
                                                        onChange={(e) => {
                                                            const newRules = { ...approvalRules };
                                                            newRules.rules[index].canApprove = e.target.checked;
                                                            setApprovalRules(newRules);
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="checkbox"
                                                        checked={rule.canReject}
                                                        onChange={(e) => {
                                                            const newRules = { ...approvalRules };
                                                            newRules.rules[index].canReject = e.target.checked;
                                                            setApprovalRules(newRules);
                                                        }}
                                                        className="h-4 w-4"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Stages Requiring Approval</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Current stages: {approvalRules.requiresApprovalStages.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
