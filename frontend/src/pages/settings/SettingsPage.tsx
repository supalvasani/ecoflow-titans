import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsService } from '../../services/settingsService';
import type { CCRStage, ApprovalRules } from '../../services/settingsService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AlertCircle, Check, Save, Plus, Trash2, GitBranch, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'stages' | 'approval'>('stages');

    // CCR Stages state
    const [stages, setStages] = useState<CCRStage[]>([]);
    const [stagesLoading, setStagesLoading] = useState(true);
    const [stagesError, setStagesError] = useState<string | null>(null);
    const [stagesSaving, setStagesSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
            setStagesError(err.message || 'Failed to load CCR stages');
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
            setSuccessMessage(null);
            setStagesError(null);
            await settingsService.updateStages(token, stages);
            setSuccessMessage('CCR stage sequence updated successfully.');
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
            setSuccessMessage(null);
            setRulesError(null);
            await settingsService.updateApprovalRules(token, approvalRules);
            setSuccessMessage('Approval permissions and quorum rules updated.');
            await fetchApprovalRules();
        } catch (err: any) {
            setRulesError(err.message || 'Failed to save approval rules');
        } finally {
            setRulesSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div>
                        <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            Governance & Workflow Settings
                        </h1>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                            Configure CCR lifecycle stages, mandatory sign-off thresholds, and role-based authority.
                        </p>
                    </div>

                    <Button
                        size="sm"
                        onClick={activeTab === 'stages' ? handleSaveStages : handleSaveRules}
                        disabled={stagesSaving || rulesSaving}
                        className="font-sans text-xs h-8 text-white"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {stagesSaving || rulesSaving ? 'Saving Changes...' : 'Save Workflow Changes'}
                    </Button>
                </div>

                {/* Notifications */}
                {(stagesError || rulesError) && (
                    <div
                        className="p-3 border text-xs font-sans flex items-start gap-2"
                        style={{ backgroundColor: '#FDF2F0', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>{stagesError || rulesError}</div>
                    </div>
                )}
                {successMessage && (
                    <div
                        className="p-3 border text-xs font-sans flex items-start gap-2"
                        style={{ backgroundColor: '#EBF2EE', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    >
                        <Check className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>{successMessage}</div>
                    </div>
                )}

                {/* Settings Tab Navigation */}
                <div className="border-b flex items-center gap-6 text-xs font-sans font-medium" style={{ borderColor: 'var(--line)' }}>
                    <button
                        onClick={() => { setActiveTab('stages'); setSuccessMessage(null); }}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'stages' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'stages' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'stages' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <GitBranch className="h-3.5 w-3.5" />
                        CCR Lifecycle Stages ({stages.length})
                    </button>

                    <button
                        onClick={() => { setActiveTab('approval'); setSuccessMessage(null); }}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'approval' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'approval' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'approval' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Role Authority & Quorum Rules
                    </button>
                </div>

                {/* TAB 1: CCR STAGES */}
                {activeTab === 'stages' && (
                    <div className="bg-white border p-5 space-y-4" style={{ borderColor: 'var(--line)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
                            <div>
                                <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                    Sequential Stage Pipeline
                                </h2>
                                <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                    Define the required lifecycle stages each Change Request must progress through.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setStages([
                                        ...stages,
                                        {
                                            id: `stage-${Date.now()}`,
                                            name: 'New Stage',
                                            sequence: stages.length + 1,
                                            requiresApproval: false,
                                            isFinal: false,
                                        },
                                    ]);
                                }}
                                className="text-xs font-sans h-7"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Add Stage
                            </Button>
                        </div>

                        {stagesLoading ? (
                            <div className="p-8 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Loading stage configurations...
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted w-16">Seq</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted">Stage Name</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted text-center">Requires Approval</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted text-center">Is Final State</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted text-right w-16">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {stages.map((stage, index) => (
                                            <tr key={stage.id || index} className="hover:bg-stone-50/50">
                                                <td className="py-2.5 px-3">
                                                    <Input
                                                        type="number"
                                                        value={stage.sequence}
                                                        onChange={(e) => {
                                                            const updated = [...stages];
                                                            updated[index].sequence = parseInt(e.target.value) || 0;
                                                            setStages(updated);
                                                        }}
                                                        className="h-7 w-14 text-xs font-mono"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Input
                                                        type="text"
                                                        value={stage.name}
                                                        onChange={(e) => {
                                                            const updated = [...stages];
                                                            updated[index].name = e.target.value;
                                                            setStages(updated);
                                                        }}
                                                        className="h-7 text-xs max-w-sm"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={stage.requiresApproval}
                                                        onChange={(e) => {
                                                            const updated = [...stages];
                                                            updated[index].requiresApproval = e.target.checked;
                                                            setStages(updated);
                                                        }}
                                                        className="h-4 w-4 cursor-pointer accent-stone-700"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={stage.isFinal}
                                                        onChange={(e) => {
                                                            const updated = [...stages];
                                                            updated[index].isFinal = e.target.checked;
                                                            setStages(updated);
                                                        }}
                                                        className="h-4 w-4 cursor-pointer accent-stone-700"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setStages(stages.filter((_, i) => i !== index))}
                                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: APPROVAL RULES */}
                {activeTab === 'approval' && (
                    <div className="bg-white border p-5 space-y-6" style={{ borderColor: 'var(--line)' }}>
                        <div>
                            <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                Role-Based Approval Permissions
                            </h2>
                            <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Control which roles are empowered to approve or reject change requests during review gates.
                            </p>
                        </div>

                        {rulesLoading ? (
                            <div className="p-8 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Loading approval authority rules...
                            </div>
                        ) : approvalRules && (
                            <div className="space-y-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs font-sans text-left">
                                        <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                            <tr>
                                                <th className="py-2.5 px-3 font-medium text-ink-muted">Enterprise Role</th>
                                                <th className="py-2.5 px-3 font-medium text-ink-muted text-center">Can Authorize Approval</th>
                                                <th className="py-2.5 px-3 font-medium text-ink-muted text-center">Can Reject Proposal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                            {approvalRules.rules.map((rule, idx) => (
                                                <tr key={rule.role} className="hover:bg-stone-50/50">
                                                    <td className="py-3 px-3 font-mono text-[11px] font-medium text-ink">
                                                        {rule.role}
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.canApprove}
                                                            onChange={(e) => {
                                                                const updated = { ...approvalRules };
                                                                updated.rules[idx].canApprove = e.target.checked;
                                                                setApprovalRules(updated);
                                                            }}
                                                            className="h-4 w-4 cursor-pointer accent-stone-700"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={rule.canReject}
                                                            onChange={(e) => {
                                                                const updated = { ...approvalRules };
                                                                updated.rules[idx].canReject = e.target.checked;
                                                                setApprovalRules(updated);
                                                            }}
                                                            className="h-4 w-4 cursor-pointer accent-stone-700"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-4 border bg-stone-50 space-y-1 text-xs font-sans" style={{ borderColor: 'var(--line)' }}>
                                    <div className="font-medium text-ink">Stages Requiring Mandatory Approval Gate</div>
                                    <p style={{ color: 'var(--ink-muted)' }}>
                                        {approvalRules.requiresApprovalStages?.join(', ') || 'Under Review, Review'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
