import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ccrService } from '../../services/ccrService';
import type { CatalogChangeRequest } from '../../types/ccr';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Send,
    Play,
    Save,
    ShieldAlert,
    Check,
    Clock,
    FileText,
    History,
    Layers,
    Plus,
    Tag,
} from 'lucide-react';
import { Role } from '../../types/auth';
import { AuditLogViewer } from '../../components/audit/AuditLogViewer';

export default function CCRDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [ccr, setCcr] = useState<CatalogChangeRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState<'overview' | 'editor' | 'approvals' | 'audit'>('overview');

    // Draft Edit State for Catalog Item
    const [draftValues, setDraftValues] = useState<{
        name: string;
        salePrice: number;
        costPrice: number;
        currency: string;
    }>({
        name: '',
        salePrice: 0,
        costPrice: 0,
        currency: 'USD',
    });

    // Content Add State
    const [showAddContent, setShowAddContent] = useState(false);
    const [contentForm, setContentForm] = useState({
        filename: '',
        url: '',
        locale: 'en-US',
        contentType: 'TEXT',
        approved: false,
    });

    // Approval / Rejection dialog state
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [approvalComment, setApprovalComment] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Validation Results
    const [validationResult, setValidationResult] = useState<{
        valid: boolean;
        promotionConflictFlag: boolean;
        promotionConflictDetail: string | null;
        warnings: string[];
    } | null>(null);

    const fetchCCR = async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const data = await ccrService.getCCRById(token, id);
            const item = data.ccr;
            setCcr(item);

            // Populate draft values
            if (item) {
                setDraftValues({
                    name: item.draftName || item.catalogItemDraft?.name || item.catalogItemDraft?.catalogItem?.name || '',
                    salePrice: Number(item.draftSalePrice ?? item.catalogItemDraft?.salePrice ?? item.catalogItemDraft?.catalogItem?.versions?.[0]?.salePrice ?? 0),
                    costPrice: Number(item.draftCostPrice ?? item.catalogItemDraft?.costPrice ?? item.catalogItemDraft?.catalogItem?.versions?.[0]?.costPrice ?? 0),
                    currency: item.draftCurrency || item.catalogItemDraft?.currency || 'USD',
                });
            }
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to load CCR details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCCR();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, id]);

    const handleSaveDraft = async () => {
        if (!token || !ccr) return;
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.updateDraft(token, ccr.id, draftValues);
            setSuccessMessage('Draft changes saved successfully.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to save draft');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddContent = async () => {
        if (!token || !ccr || !contentForm.filename || !contentForm.url) return;
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.addDraftContent(token, ccr.id, {
                ...contentForm,
                action: 'ADD',
            });
            setShowAddContent(false);
            setContentForm({ filename: '', url: '', locale: 'en-US', contentType: 'TEXT', approved: false });
            setSuccessMessage('Content asset attached to draft.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to add draft content');
        } finally {
            setActionLoading(false);
        }
    };

    const handleValidate = async () => {
        if (!token || !ccr) return;
        try {
            setActionLoading(true);
            setError(null);
            const result = await ccrService.validateCCR(token, ccr.id);
            setValidationResult(result);
            if (result.valid) {
                setSuccessMessage(
                    result.promotionConflictFlag
                        ? 'Validation passed with promotion conflict warning.'
                        : 'Validation passed successfully. All schema constraints met.'
                );
            } else {
                setError(result.warnings.join(', ') || 'Validation failed');
            }
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Validation failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!token || !ccr) return;
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.submitForReview(token, ccr.id);
            setSuccessMessage('CCR submitted for review.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to submit CCR');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!token || !ccr) return;
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.approveCCR(token, ccr.id, approvalComment.trim() || undefined);
            setShowApproveDialog(false);
            setApprovalComment('');
            setSuccessMessage('Approval decision recorded.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to approve CCR');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!token || !ccr) return;
        if (!rejectionReason.trim()) {
            setError('Rejection reason is required.');
            return;
        }
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.rejectCCR(token, ccr.id, rejectionReason.trim());
            setShowRejectDialog(false);
            setRejectionReason('');
            setSuccessMessage('CCR rejected.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to reject CCR');
        } finally {
            setActionLoading(false);
        }
    };

    const handleApply = async () => {
        if (!token || !ccr) return;
        try {
            setActionLoading(true);
            setError(null);
            await ccrService.applyCCR(token, ccr.id);
            setSuccessMessage('CCR applied successfully! New immutable version created and published.');
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to apply CCR');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleMandatoryApproval = async () => {
        if (!token || !ccr || user?.role !== Role.ADMIN) return;
        try {
            setActionLoading(true);
            await ccrService.setMandatoryApproval(token, ccr.id, !ccr.mandatoryApproval);
            setSuccessMessage(`Mandatory approval ${!ccr.mandatoryApproval ? 'enabled' : 'disabled'}.`);
            await fetchCCR();
        } catch (err) {
            const e = err as Error;
            setError(e.message || 'Failed to update mandatory approval');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !ccr) {
        return (
            <DashboardLayout>
                <div className="py-20 text-center text-sm font-sans" style={{ color: 'var(--ink-muted)' }}>
                    Loading Change Request Console...
                </div>
            </DashboardLayout>
        );
    }

    if (!ccr) {
        return (
            <DashboardLayout>
                <div className="py-20 text-center">
                    <p className="text-base font-serif" style={{ color: 'var(--danger)' }}>Change Request not found.</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/ccrs')}>
                        Return to Requests
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const stageName = (ccr.stage?.name || 'DRAFT').toUpperCase();
    const isMerchandiserOrAdmin = user?.role === Role.MERCHANDISER || user?.role === Role.ADMIN;
    const isApproverOrAdmin = user?.role === Role.CATEGORY_APPROVER || user?.role === Role.ADMIN;

    const isDraftStage = stageName === 'DRAFT' || stageName === 'NEW' || stageName === 'WIP';
    const isUnderReview = stageName === 'UNDER REVIEW' || stageName === 'REVIEW' || stageName === 'IN REVIEW';
    const isApproved = stageName === 'APPROVED';
    const isApplied = stageName === 'APPLIED' || stageName === 'IMPLEMENTED';
    const isRejected = stageName === 'REJECTED';

    const canEdit = isDraftStage && isMerchandiserOrAdmin;
    const canSubmit = isDraftStage && isMerchandiserOrAdmin;
    const canValidate = (isDraftStage || isUnderReview) && isMerchandiserOrAdmin;
    const canApprove = isUnderReview && isApproverOrAdmin;
    const canApply = (isApproved || (!ccr.stage?.requiresApproval && !ccr.mandatoryApproval && !isDraftStage)) && isMerchandiserOrAdmin && !isApplied;

    // Approvals progress
    const approvalsList = ccr.approvals || [];
    const minApprovals = ccr.stage?.minApprovals || 1;
    const approvedCount = approvalsList.filter(a => a.decision === 'APPROVED').length;
    const hasCurrentUserApproved = approvalsList.some(a => a.approverId === user?.id && a.decision === 'APPROVED');

    // Current version values for comparison
    const currentName = ccr.catalogItemDraft?.catalogItem?.name || ccr.catalogItemDraft?.name || '—';
    const currentSalePrice = Number(ccr.catalogItemDraft?.catalogItem?.versions?.[0]?.salePrice ?? ccr.catalogItemDraft?.salePrice ?? 0);
    const currentCostPrice = Number(ccr.catalogItemDraft?.catalogItem?.versions?.[0]?.costPrice ?? ccr.catalogItemDraft?.costPrice ?? 0);
    const currentMargin = currentSalePrice > 0 ? ((currentSalePrice - currentCostPrice) / currentSalePrice) * 100 : 0;

    const proposedSalePrice = draftValues.salePrice;
    const proposedCostPrice = draftValues.costPrice;
    const proposedMargin = proposedSalePrice > 0 ? ((proposedSalePrice - proposedCostPrice) / proposedSalePrice) * 100 : 0;

    // Standard stage sequence for stepper
    const lifecycleStages = ['Draft', 'Under Review', 'Approved', 'Applied'];

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Top Navigation & Action Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/ccrs')}
                            className="font-sans text-xs -ml-2"
                            style={{ color: 'var(--ink-muted)' }}
                        >
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                            Back to Requests
                        </Button>
                        <span className="text-xs font-mono px-2 py-0.5 border" style={{ borderColor: 'var(--line)', color: 'var(--ink-muted)' }}>
                            CCR-{ccr.id.substring(0, 8)}
                        </span>
                        <span
                            className="text-xs font-mono font-medium uppercase px-2 py-0.5 border"
                            style={{
                                borderColor: isApproved ? 'var(--accent)' : isRejected ? 'var(--danger)' : 'var(--line)',
                                color: isApproved ? 'var(--accent)' : isRejected ? 'var(--danger)' : 'var(--ink)',
                                backgroundColor: isApproved ? '#EBF2EE' : isRejected ? '#FDF2F0' : 'transparent',
                            }}
                        >
                            {stageName}
                        </span>
                    </div>

                    {/* Operational Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {canValidate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleValidate}
                                disabled={actionLoading}
                                className="font-sans text-xs h-8"
                            >
                                <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                Validate Constraints
                            </Button>
                        )}

                        {canSubmit && (
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={actionLoading}
                                className="font-sans text-xs h-8 text-white"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <Send className="mr-1.5 h-3.5 w-3.5" />
                                Submit for Review
                            </Button>
                        )}

                        {canApprove && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRejectDialog(true)}
                                    disabled={actionLoading}
                                    className="font-sans text-xs h-8"
                                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                                >
                                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                    Reject
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setShowApproveDialog(true)}
                                    disabled={actionLoading || hasCurrentUserApproved}
                                    className="font-sans text-xs h-8 text-white"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                >
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                    {hasCurrentUserApproved ? 'Approved by You' : 'Record Approval'}
                                </Button>
                            </>
                        )}

                        {canApply && (
                            <Button
                                size="sm"
                                onClick={handleApply}
                                disabled={actionLoading}
                                className="font-sans text-xs h-8 text-white"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <Play className="mr-1.5 h-3.5 w-3.5" />
                                Apply & Version Bump
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications & Feedback */}
                {error && (
                    <div
                        className="p-3 border text-xs font-sans flex items-start gap-2"
                        style={{ backgroundColor: '#FDF2F0', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>{error}</div>
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

                {/* Promotion Conflict Alert Banner */}
                {(ccr.promotionConflictFlag || validationResult?.promotionConflictFlag) && (
                    <div
                        className="p-4 border flex items-start gap-3"
                        style={{
                            backgroundColor: '#FDF8E8',
                            borderColor: 'var(--warning)',
                            color: '#6B4F1D',
                        }}
                    >
                        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                        <div className="space-y-1 text-xs font-sans">
                            <div className="font-medium text-sm">Active Promotion Conflict Detected</div>
                            <p>
                                An active promotional campaign is currently scheduled or live for this item/variant set.
                                Applying pricing or margin changes during a live promotion may breach margin thresholds or violate channel SLA guarantees.
                            </p>
                        </div>
                    </div>
                )}

                {/* Title & Metadata Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                        {ccr.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                        <span>Type: <strong className="font-mono text-ink">{ccr.type}</strong></span>
                        <span>•</span>
                        <span>Author: <strong className="text-ink">{ccr.createdBy?.name || ccr.createdBy?.email || 'System'}</strong></span>
                        <span>•</span>
                        <span>Created: <strong className="font-mono text-ink">{new Date(ccr.createdAt).toLocaleDateString()}</strong></span>
                        {ccr.rollbackTargetVersionId && (
                            <>
                                <span>•</span>
                                <span className="font-mono" style={{ color: 'var(--danger)' }}>
                                    Rollback Target: {ccr.rollbackTargetVersionId.substring(0, 8)}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Lifecycle Stepper */}
                <div className="p-4 bg-white border" style={{ borderColor: 'var(--line)' }}>
                    <div className="text-xs font-sans font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--ink-muted)' }}>
                        Lifecycle Governance Progress
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {lifecycleStages.map((stageLabel, index) => {
                            const isPast =
                                (stageName === 'UNDER REVIEW' && index === 0) ||
                                (stageName === 'APPROVED' && index <= 1) ||
                                (stageName === 'APPLIED' && index <= 2);
                            const isCurrent =
                                (stageName === 'DRAFT' && index === 0) ||
                                (stageName === 'UNDER REVIEW' && index === 1) ||
                                (stageName === 'APPROVED' && index === 2) ||
                                (stageName === 'APPLIED' && index === 3);

                            return (
                                <div
                                    key={stageLabel}
                                    className="p-3 border flex flex-col justify-between"
                                    style={{
                                        borderColor: isCurrent ? 'var(--accent)' : 'var(--line)',
                                        backgroundColor: isCurrent ? '#F7F9F8' : isPast ? '#FFFFFF' : '#FAFAFA',
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-medium" style={{ color: isCurrent ? 'var(--accent)' : 'var(--ink-muted)' }}>
                                            0{index + 1}
                                        </span>
                                        {isPast && <Check className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
                                        {isCurrent && <Clock className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />}
                                    </div>
                                    <div className="mt-2 text-xs font-sans font-medium" style={{ color: isCurrent ? 'var(--accent)' : isPast ? 'var(--ink)' : 'var(--ink-muted)' }}>
                                        {stageLabel}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* N-of-M Approver Status Banner */}
                    {(ccr.stage?.requiresApproval || ccr.mandatoryApproval) && (
                        <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between text-xs font-sans" style={{ borderColor: 'var(--line)' }}>
                            <div className="flex items-center gap-2">
                                <span className="font-medium" style={{ color: 'var(--ink)' }}>
                                    Multi-Approver Quorum:
                                </span>
                                <span className="font-mono px-2 py-0.5 border" style={{ borderColor: 'var(--line)', backgroundColor: '#F7F6F3' }}>
                                    {approvedCount} of {minApprovals} required approvals recorded
                                </span>
                            </div>
                            {user?.role === Role.ADMIN && (
                                <button
                                    onClick={handleToggleMandatoryApproval}
                                    className="text-xs underline cursor-pointer"
                                    style={{ color: 'var(--ink-muted)' }}
                                >
                                    {ccr.mandatoryApproval ? 'Disable Mandatory Override' : 'Force Mandatory Approval'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Dialog / Card for Rejection */}
                {showRejectDialog && (
                    <Card style={{ borderColor: 'var(--danger)', backgroundColor: '#FDF2F0' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-serif font-normal" style={{ color: 'var(--danger)' }}>
                                Reject Change Request
                            </CardTitle>
                            <CardDescription className="text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Provide a mandatory governance reason explaining why this change is rejected.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="E.g., Margin violation for APAC market; missing local translation compliance..."
                                className="w-full text-xs font-sans p-2 border bg-white focus:outline-none min-h-20"
                                style={{ borderColor: 'var(--line)' }}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setShowRejectDialog(false); setRejectionReason(''); }}
                                    className="font-sans text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleReject}
                                    disabled={actionLoading || !rejectionReason.trim()}
                                    className="font-sans text-xs text-white"
                                    style={{ backgroundColor: 'var(--danger)' }}
                                >
                                    Confirm Rejection
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dialog / Card for Approval */}
                {showApproveDialog && (
                    <Card style={{ borderColor: 'var(--accent)', backgroundColor: '#F7F9F8' }}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-serif font-normal" style={{ color: 'var(--accent)' }}>
                                Authorize Change Request
                            </CardTitle>
                            <CardDescription className="text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Add an optional audit note for your sign-off.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                placeholder="Optional sign-off comment (e.g., Reviewed against Q3 catalog plan)..."
                                className="text-xs font-sans bg-white border"
                                style={{ borderColor: 'var(--line)' }}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setShowApproveDialog(false); setApprovalComment(''); }}
                                    className="font-sans text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleApprove}
                                    disabled={actionLoading}
                                    className="font-sans text-xs text-white"
                                    style={{ backgroundColor: 'var(--accent)' }}
                                >
                                    Authorize Sign-Off
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tab Navigation */}
                <div className="border-b flex items-center gap-6 text-xs font-sans font-medium" style={{ borderColor: 'var(--line)' }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'overview'
                                ? 'border-accent text-accent font-semibold'
                                : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                        style={{
                            borderColor: activeTab === 'overview' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        Changes & Diff
                    </button>

                    {canEdit && (
                        <button
                            onClick={() => setActiveTab('editor')}
                            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                                activeTab === 'editor'
                                    ? 'border-accent text-accent font-semibold'
                                    : 'border-transparent text-ink-muted hover:text-ink'
                            }`}
                            style={{
                                borderColor: activeTab === 'editor' ? 'var(--accent)' : 'transparent',
                                color: activeTab === 'editor' ? 'var(--accent)' : 'var(--ink-muted)',
                            }}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            Draft Editor
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'approvals'
                                ? 'border-accent text-accent font-semibold'
                                : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                        style={{
                            borderColor: activeTab === 'approvals' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'approvals' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approval Quorum ({approvalsList.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'audit'
                                ? 'border-accent text-accent font-semibold'
                                : 'border-transparent text-ink-muted hover:text-ink'
                        }`}
                        style={{
                            borderColor: activeTab === 'audit' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'audit' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <History className="h-3.5 w-3.5" />
                        Audit Trail
                    </button>
                </div>

                {/* TAB 1: OVERVIEW & DIFF */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Rollback Overview */}
                        {ccr.type === 'ROLLBACK' && (
                            <div className="p-4 bg-white border space-y-2" style={{ borderColor: 'var(--line)' }}>
                                <div className="text-xs font-medium uppercase font-sans tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                                    Rollback Directive
                                </div>
                                <p className="text-xs font-sans" style={{ color: 'var(--ink)' }}>
                                    This change request is configured to revert the catalog item to historical archived version{' '}
                                    <span className="font-mono font-medium">{ccr.rollbackTargetVersionId}</span>.
                                    Applying this will reactivate previous metadata and publish rules.
                                </p>
                            </div>
                        )}

                        {/* Catalog Item Changes Diff */}
                        {ccr.type === 'CATALOG_ITEM' && (
                            <div className="bg-white border p-5 space-y-6" style={{ borderColor: 'var(--line)' }}>
                                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
                                    <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                        Field Diff: Current Active vs Proposed Version
                                    </h2>
                                    {canEdit && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setActiveTab('editor')}
                                            className="text-xs font-sans h-7"
                                        >
                                            Edit Draft Values
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                                    {/* Item Name */}
                                    <div className="p-3 border space-y-2" style={{ borderColor: 'var(--line)' }}>
                                        <span className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>Item Name</span>
                                        <div className="space-y-1">
                                            <div className="text-ink-muted">Current: <span className="font-medium text-ink">{currentName}</span></div>
                                            <div className="text-accent font-medium">Proposed: <span>{draftValues.name || '—'}</span></div>
                                        </div>
                                    </div>

                                    {/* Sale Price */}
                                    <div className="p-3 border space-y-2" style={{ borderColor: 'var(--line)' }}>
                                        <span className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>Sale Price ({draftValues.currency})</span>
                                        <div className="space-y-1 font-mono">
                                            <div className="text-ink-muted">Current: ${currentSalePrice.toFixed(2)}</div>
                                            <div className="text-accent font-medium">Proposed: ${proposedSalePrice.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    {/* Cost Price */}
                                    <div className="p-3 border space-y-2" style={{ borderColor: 'var(--line)' }}>
                                        <span className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>Cost Price ({draftValues.currency})</span>
                                        <div className="space-y-1 font-mono">
                                            <div className="text-ink-muted">Current: ${currentCostPrice.toFixed(2)}</div>
                                            <div className="text-accent font-medium">Proposed: ${proposedCostPrice.toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Margin Impact Analysis */}
                                <div className="p-4 border bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: 'var(--line)' }}>
                                    <div className="space-y-0.5">
                                        <div className="text-xs font-medium font-sans" style={{ color: 'var(--ink)' }}>Financial Margin Impact</div>
                                        <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                            Calculated as ((Sale Price - Cost Price) / Sale Price) * 100
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs font-mono">
                                        <div>
                                            <span className="text-[10px] block uppercase" style={{ color: 'var(--ink-muted)' }}>Current Margin</span>
                                            <span className="font-semibold text-ink">{currentMargin.toFixed(1)}%</span>
                                        </div>
                                        <div className="text-base" style={{ color: 'var(--ink-muted)' }}>→</div>
                                        <div>
                                            <span className="text-[10px] block uppercase" style={{ color: 'var(--ink-muted)' }}>Proposed Margin</span>
                                            <span
                                                className="font-semibold"
                                                style={{ color: proposedMargin < 20 ? 'var(--warning)' : 'var(--accent)' }}
                                            >
                                                {proposedMargin.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Content & Locale Assets in Draft */}
                        <div className="bg-white border p-5 space-y-4" style={{ borderColor: 'var(--line)' }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                        Draft Content & Locale Assets
                                    </h3>
                                    <p className="text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                        Regional marketing copy and digital assets attached to this change request.
                                    </p>
                                </div>
                                {canEdit && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAddContent(!showAddContent)}
                                        className="text-xs font-sans h-7"
                                    >
                                        <Plus className="mr-1 h-3.5 w-3.5" />
                                        Attach Locale Content
                                    </Button>
                                )}
                            </div>

                            {/* Add Content Form Modal/Card */}
                            {showAddContent && (
                                <div className="p-4 border bg-stone-50 space-y-3 text-xs font-sans" style={{ borderColor: 'var(--line)' }}>
                                    <div className="font-medium text-ink">New Locale Asset</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <Label className="text-[11px]">Filename / Title</Label>
                                            <Input
                                                value={contentForm.filename}
                                                onChange={(e) => setContentForm({ ...contentForm, filename: e.target.value })}
                                                placeholder="e.g., hero_banner_de.webp"
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px]">Asset URL</Label>
                                            <Input
                                                value={contentForm.url}
                                                onChange={(e) => setContentForm({ ...contentForm, url: e.target.value })}
                                                placeholder="https://cdn.example.com/..."
                                                className="h-8 text-xs bg-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px]">Locale</Label>
                                            <select
                                                value={contentForm.locale}
                                                onChange={(e) => setContentForm({ ...contentForm, locale: e.target.value })}
                                                className="w-full h-8 px-2 border bg-white text-xs"
                                                style={{ borderColor: 'var(--line)' }}
                                            >
                                                <option value="en-US">en-US (United States)</option>
                                                <option value="de-DE">de-DE (Germany)</option>
                                                <option value="fr-FR">fr-FR (France)</option>
                                                <option value="ja-JP">ja-JP (Japan)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setShowAddContent(false)} className="text-xs h-7">
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleAddContent}
                                            disabled={actionLoading || !contentForm.filename || !contentForm.url}
                                            className="text-xs h-7 text-white"
                                            style={{ backgroundColor: 'var(--accent)' }}
                                        >
                                            Save Asset
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Draft content list */}
                            {(!ccr.draftContent || ccr.draftContent.length === 0) ? (
                                <div className="text-xs font-sans text-center py-6" style={{ color: 'var(--ink-muted)' }}>
                                    No draft locale assets attached.
                                </div>
                            ) : (
                                <div className="divide-y border" style={{ borderColor: 'var(--line)' }}>
                                    {ccr.draftContent.map((item: any, i: number) => (
                                        <div key={i} className="p-3 flex items-center justify-between text-xs font-sans bg-white">
                                            <div className="flex items-center gap-3">
                                                <Tag className="h-3.5 w-3.5" style={{ color: 'var(--ink-muted)' }} />
                                                <div>
                                                    <div className="font-medium text-ink">{item.filename}</div>
                                                    <div className="font-mono text-[11px]" style={{ color: 'var(--ink-muted)' }}>{item.url}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-[11px] px-2 py-0.5 border" style={{ borderColor: 'var(--line)' }}>
                                                    {item.locale || 'en-US'}
                                                </span>
                                                <span
                                                    className="text-[10px] font-mono px-1.5 py-0.5 border"
                                                    style={{
                                                        borderColor: item.approved ? 'var(--accent)' : 'var(--warning)',
                                                        color: item.approved ? 'var(--accent)' : 'var(--warning)',
                                                    }}
                                                >
                                                    {item.approved ? 'LOCALE APPROVED' : 'LOCALE PENDING'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: DRAFT EDITOR */}
                {activeTab === 'editor' && canEdit && (
                    <div className="bg-white border p-6 space-y-6" style={{ borderColor: 'var(--line)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
                            <div>
                                <h2 className="text-base font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                    Edit Catalog Change Proposal
                                </h2>
                                <p className="text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                    Changes will be staged into the draft until CCR is submitted for review.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleSaveDraft}
                                disabled={actionLoading}
                                className="font-sans text-xs h-8 text-white"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                Save Draft Changes
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Catalog Item Name</Label>
                                <Input
                                    value={draftValues.name}
                                    onChange={(e) => setDraftValues({ ...draftValues, name: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Currency</Label>
                                <Input
                                    value={draftValues.currency}
                                    onChange={(e) => setDraftValues({ ...draftValues, currency: e.target.value })}
                                    className="text-xs h-9 font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Target Sale Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={draftValues.salePrice}
                                    onChange={(e) => setDraftValues({ ...draftValues, salePrice: parseFloat(e.target.value) || 0 })}
                                    className="text-xs h-9 font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Cost Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={draftValues.costPrice}
                                    onChange={(e) => setDraftValues({ ...draftValues, costPrice: parseFloat(e.target.value) || 0 })}
                                    className="text-xs h-9 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: APPROVAL QUORUM & DECISIONS */}
                {activeTab === 'approvals' && (
                    <div className="bg-white border p-5 space-y-5" style={{ borderColor: 'var(--line)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
                            <div>
                                <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                    Governance Approvals & Sign-Offs
                                </h2>
                                <p className="text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                    Requires {minApprovals} Category Approver decision(s) before advancing to Applied status.
                                </p>
                            </div>
                            <span className="font-mono text-xs px-2.5 py-1 border" style={{ borderColor: 'var(--line)', backgroundColor: '#F7F6F3' }}>
                                {approvedCount} / {minApprovals} Approved
                            </span>
                        </div>

                        {approvalsList.length === 0 ? (
                            <div className="text-xs font-sans text-center py-8" style={{ color: 'var(--ink-muted)' }}>
                                No formal approval decisions recorded yet.
                            </div>
                        ) : (
                            <div className="divide-y border" style={{ borderColor: 'var(--line)' }}>
                                {approvalsList.map((approval) => (
                                    <div key={approval.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans bg-white">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-ink">
                                                    {approval.approver?.name || approval.approver?.email || 'Approver'}
                                                </span>
                                                <span
                                                    className="font-mono text-[10px] uppercase px-1.5 py-0.5 border"
                                                    style={{
                                                        borderColor: approval.decision === 'APPROVED' ? 'var(--accent)' : 'var(--danger)',
                                                        color: approval.decision === 'APPROVED' ? 'var(--accent)' : 'var(--danger)',
                                                        backgroundColor: approval.decision === 'APPROVED' ? '#EBF2EE' : '#FDF2F0',
                                                    }}
                                                >
                                                    {approval.decision}
                                                </span>
                                            </div>
                                            {approval.comment && (
                                                <p className="text-ink-muted italic">"{approval.comment}"</p>
                                            )}
                                        </div>
                                        <div className="text-right text-[11px] font-mono shrink-0" style={{ color: 'var(--ink-muted)' }}>
                                            {new Date(approval.decidedAt).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: AUDIT TRAIL */}
                {activeTab === 'audit' && token && (
                    <AuditLogViewer token={token} entity="CCR" entityId={ccr.id} />
                )}
            </div>
        </DashboardLayout>
    );
}
