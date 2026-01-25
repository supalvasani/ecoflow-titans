import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ecoService } from '../../services/ecoService';
import type { ECO } from '../../types/eco';
import { ECOType } from '../../types/eco';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Send, Play, Save } from 'lucide-react';
import { Role } from '../../types/auth';
import { AuditLogViewer } from '../../components/audit/AuditLogViewer';
import { ProductChangesSummary, BOMChangesSummary } from '../../components/eco/ChangeComparison';
import { LifecycleStepper } from '../../components/eco/LifecycleStepper';
import { BOMDraftEditor } from '../../components/eco/BOMDraftEditor';
import { AttachmentsList } from '../../components/eco/AttachmentsList';

export default function ECODetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [eco, setEco] = useState<ECO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Draft Edit State
    const [draftValues, setDraftValues] = useState<{ name: string, salePrice: number, costPrice: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    const fetchECO = async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const data = await ecoService.getECOById(token, id);
            setEco(data.eco);

            // Initialize draft values if product draft exists
            if (data.eco.productDraft) {
                setDraftValues({
                    name: data.eco.productDraft.name || data.eco.productDraft.product?.name || '',
                    salePrice: Number(data.eco.productDraft.salePrice) || Number(data.eco.productDraft.product?.versions?.[0]?.salePrice) || 0,
                    costPrice: Number(data.eco.productDraft.costPrice) || Number(data.eco.productDraft.product?.versions?.[0]?.costPrice) || 0,
                });
            }
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Failed to load ECO details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchECO();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, id]);

    const handleSaveDraft = async () => {
        if (!token || !eco || !draftValues) return;
        try {
            setIsSaving(true);
            await ecoService.updateProductDraft(token, eco.id, draftValues);
            // Reload to get fresh state
            await fetchECO();
        } catch (err) {
            const error = err as Error;
            setError(error.message || 'Failed to save draft');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAction = async (action: 'submit' | 'approve' | 'reject' | 'apply' | 'validate') => {
        if (!token || !eco) return;

        // If rejecting, show dialog first
        if (action === 'reject' && !showRejectDialog) {
            setShowRejectDialog(true);
            return;
        }

        try {
            setLoading(true);
            if (action === 'submit') await ecoService.submitForReview(token, eco.id);
            if (action === 'approve') await ecoService.approveECO(token, eco.id);
            if (action === 'reject') {
                const reason = rejectionReason.trim() || "Rejected by approver";
                await ecoService.rejectECO(token, eco.id, reason);
                setShowRejectDialog(false);
                setRejectionReason('');
            }
            if (action === 'validate') await ecoService.validateECO(token, eco.id);
            if (action === 'apply') await ecoService.applyECO(token, eco.id);

            await fetchECO();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message || `Failed to ${action} ECO`);
            setLoading(false);
        }
    };


    const handleToggleMandatoryApproval = async () => {
        if (!token || !eco || user?.role !== Role.ADMIN) return;

        try {
            setLoading(true);
            await ecoService.setMandatoryApproval(token, eco.id, !eco.mandatoryApproval);
            await fetchECO();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message || 'Failed to update mandatory approval');
            setLoading(false);
        }
    };


    if (loading && !eco) return <div>Loading...</div>;
    if (!eco) return <div>ECO not found</div>;

    // Computed Permissions
    const stage = eco.stage.name.toUpperCase();
    const isApprover = user?.role === Role.APPROVER || user?.role === Role.ADMIN;
    const isEngineerOrAdmin = user?.role === Role.ENGINEERING_USER || user?.role === Role.ADMIN;

    // Actions Logic - Engineers can only Save Draft or Submit for Review
    const canEdit = (stage === 'DRAFT' || stage === 'WIP') && isEngineerOrAdmin;
    const canSubmit = (stage === 'DRAFT' || stage === 'WIP') && isEngineerOrAdmin;

    // Check if approval is required (either by stage or by admin flag)
    const requiresApproval = eco.stage.requiresApproval || eco.mandatoryApproval;
    const canApprove = requiresApproval && isApprover;
    const canValidate = !requiresApproval && isEngineerOrAdmin && stage !== 'DRAFT' && stage !== 'WIP';

    // Only admins can apply changes (removed engineer ability)
    const canApply = stage === 'APPROVED' && user?.role === Role.ADMIN;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <Button variant="ghost" onClick={() => navigate('/ecos')} className="-ml-4 text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to ECOs
                    </Button>
                    <div className="flex space-x-2">
                        {canSubmit && (
                            <Button onClick={() => handleAction('submit')} disabled={loading}>
                                <Send className="mr-2 h-4 w-4" /> Submit for Review
                            </Button>
                        )}
                        {canValidate && (
                            <Button onClick={() => handleAction('validate')} disabled={loading} variant="outline">
                                <CheckCircle className="mr-2 h-4 w-4" /> Validate & Advance
                            </Button>
                        )}
                        {canApprove && (
                            <>
                                <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
                                    <XCircle className="mr-2 h-4 w-4" /> Reject
                                </Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction('approve')} disabled={loading}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                </Button>
                            </>
                        )}
                        {canApply && (
                            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleAction('apply')} disabled={loading}>
                                <Play className="mr-2 h-4 w-4" /> Apply Changes
                            </Button>
                        )}
                    </div>
                </div>

                {/* Lifecycle Stepper */}
                <LifecycleStepper currentStage={eco.stage.name} stages={['New', 'Draft', 'Review', 'Approved', 'Applied']} />

                {/* Title & Stage */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">{eco.title}</h1>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>ID: {eco.id}</span>
                        <span>•</span>
                        <span>Created by {eco.createdBy.name}</span>
                        <span>•</span>
                        <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{stage}</span>
                        {eco.mandatoryApproval && (
                            <>
                                <span>•</span>
                                <span className="font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                    Mandatory Approval Required
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Admin: Mandatory Approval Toggle */}
                {user?.role === Role.ADMIN && (
                    <Card className="border-orange-200 bg-orange-50">
                        <CardHeader>
                            <CardTitle className="text-sm">Admin: Approval Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="mandatory-approval"
                                    checked={eco.mandatoryApproval}
                                    onChange={handleToggleMandatoryApproval}
                                    disabled={loading}
                                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <label htmlFor="mandatory-approval" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Require mandatory approval for this ECO (overrides stage settings)
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                When enabled, this ECO will require formal approval even if the current stage doesn't require it.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Error Banner */}
                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* Rejection Reason Dialog */}
                {showRejectDialog && (
                    <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                            <CardTitle className="text-red-900">Reject ECO</CardTitle>
                            <CardDescription>Please provide a reason for rejecting this Engineering Change Order.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="rejection-reason" className="block text-sm font-medium mb-2">
                                    Rejection Reason
                                </label>
                                <textarea
                                    id="rejection-reason"
                                    className="w-full min-h-25 rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    placeholder="Explain why this ECO is being rejected (e.g., technical concerns, missing information, cost impact)..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                />
                            </div>
                            <div className="flex space-x-2 justify-end">
                                <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(''); }}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => handleAction('reject')} disabled={loading}>
                                    <XCircle className="mr-2 h-4 w-4" /> Confirm Rejection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Product Draft Editor / Diff View */}
                {eco.type === ECOType.PRODUCT && eco.productDraft && draftValues && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Proposed Product Changes</CardTitle>
                            <CardDescription>
                                {canEdit
                                    ? "Edit the values below to define the changes for the next version."
                                    : "Review the changes proposed for the next version."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-8">
                                {/* Current Values (Read Only) */}
                                <div className="space-y-4 opacity-70">
                                    <h3 className="font-semibold text-sm uppercase tracking-wide border-b pb-2">Current Version</h3>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input value={eco.productDraft.product?.name || ''} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sale Price ($)</Label>
                                        <Input value={eco.productDraft.product?.versions?.[0]?.salePrice || ''} disabled />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cost Price ($)</Label>
                                        <Input value={eco.productDraft.product?.versions?.[0]?.costPrice || ''} disabled />
                                    </div>
                                </div>

                                {/* Proposed Values (Editable if Draft) */}
                                <div className="space-y-4 bg-muted/30 p-4 rounded-lg border border-dashed border-primary/20">
                                    <div className="flex justify-between items-center border-b pb-2 border-primary/20">
                                        <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">New Version (Draft)</h3>
                                        {canEdit && (
                                            <Button size="sm" variant="ghost" onClick={handleSaveDraft} disabled={isSaving}>
                                                <Save className="h-4 w-4 mr-2" /> Save Draft
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            className={draftValues.name !== eco.productDraft.product?.name ? "border-yellow-400 bg-yellow-50" : ""}
                                            value={draftValues.name}
                                            onChange={(e) => setDraftValues({ ...draftValues, name: e.target.value })}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sale Price ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className={draftValues.salePrice !== Number(eco.productDraft.product?.versions?.[0]?.salePrice) ? "border-yellow-400 bg-yellow-50" : ""}
                                            value={draftValues.salePrice}
                                            onChange={(e) => setDraftValues({ ...draftValues, salePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Cost Price ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className={draftValues.costPrice !== Number(eco.productDraft.product?.versions?.[0]?.costPrice) ? "border-yellow-400 bg-yellow-50" : ""}
                                            value={draftValues.costPrice}
                                            onChange={(e) => setDraftValues({ ...draftValues, costPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                                            disabled={!canEdit}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* BOM Draft Editor */}
                {eco.type === ECOType.BOM && eco.bomDraft && (
                    <BOMDraftEditor
                        ecoId={eco.id}
                        initialComponents={eco.bomDraft?.draftComponents || []}
                        canEdit={canEdit}
                        onSave={fetchECO}
                        token={token!}
                    />
                )}

                {/* Change Summary - Visual Diff */}
                {eco.type === ECOType.PRODUCT && eco.productDraft && draftValues && (
                    <ProductChangesSummary
                        currentProduct={{
                            name: eco.productDraft.product?.name || '',
                            salePrice: Number(eco.productDraft.product?.versions?.[0]?.salePrice) || 0,
                            costPrice: Number(eco.productDraft.product?.versions?.[0]?.costPrice) || 0,
                        }}
                        proposedChanges={{
                            name: draftValues.name,
                            salePrice: draftValues.salePrice,
                            costPrice: draftValues.costPrice,
                        }}
                    />
                )}

                {/* BOM Change Summary */}
                {(eco.type === ECOType.BOM || eco.type === ECOType.BOM_CHANGE) && eco.bomDraft?.draftComponents && (
                    <BOMChangesSummary
                        components={eco.bomDraft.draftComponents.map((c) => ({
                            name: c.componentVersion?.product?.name || 'Unknown',
                            quantity: c.quantity,
                            action: 'ADD' as const,
                            partNumber: c.componentVersion?.product?.name || ''
                        }))}
                    />
                )}

                {/* Attachments List */}
                <AttachmentsList
                    ecoId={eco.id}
                    initialAttachments={eco.draftAttachments || []}
                    canEdit={canEdit}
                    token={token!}
                    onUpdate={fetchECO}
                />

                {/* Audit Log Viewer */}
                {token && <AuditLogViewer token={token} entity="ECO" entityId={eco.id} />}
            </div>
        </DashboardLayout>
    );
}
