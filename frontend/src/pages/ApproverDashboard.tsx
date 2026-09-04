import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ccrService } from '../services/ccrService';
import type { CatalogChangeRequest } from '../types/ccr';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { CheckCircle, AlertCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface CCRStats {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
}

export const ApproverDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<CCRStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [pendingCCRs, setPendingCCRs] = useState<CatalogChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = async () => {
        if (!token) return;
        try {
            setLoading(true);

            // Fetch statistics & pending items
            const [statsData, ccrsData] = await Promise.all([
                ccrService.getCCRStatistics(token),
                ccrService.getCCRs(token),
            ]);

            const statsArray = statsData.statistics || [];
            const pending = statsArray.find((s: any) => s.stageName === 'Under Review' || s.stageName === 'Pending Review')?.count || 0;
            const approved = statsArray.find((s: any) => s.stageName === 'Approved')?.count || 0;
            const rejected = statsArray.find((s: any) => s.stageName === 'Rejected')?.count || 0;
            const total = statsArray.reduce((sum: number, s: any) => sum + (s.count || 0), 0);

            setStats({ pending, approved, rejected, total });

            const allList = ccrsData.ccrs || [];
            const pendingList = allList.filter((c: any) => {
                const s = (c.stage?.name || '').toUpperCase();
                return s === 'UNDER REVIEW' || s === 'REVIEW' || s === 'IN REVIEW' || s === 'PENDING_REVIEW';
            });
            setPendingCCRs(pendingList);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load category approver queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, [token]);

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div>
                        <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            Category Approver Console
                        </h1>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                            Review pending catalog change proposals, audit margin thresholds, and record multi-approver quorum decisions.
                        </p>
                    </div>
                </div>

                {error && (
                    <div
                        className="p-3 border text-xs font-sans flex items-start gap-2"
                        style={{ backgroundColor: '#FDF2F0', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>{error}</div>
                    </div>
                )}

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--warning)' }}>
                            Awaiting Your Decision
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : stats.pending}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Under review queue</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                            Authorized Sign-Offs
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : stats.approved}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Approved and advanced</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--danger)' }}>
                            Rejected Proposals
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : stats.rejected}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Returned with feedback</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Total Lifecycle CCRs
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : stats.total}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>All stages recorded</div>
                    </div>
                </div>

                {/* Pending Approvals Table */}
                <div className="bg-white border" style={{ borderColor: 'var(--line)' }}>
                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
                        <div>
                            <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                Change Requests Awaiting Category Sign-Off
                            </h2>
                            <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Review proposed pricing, channel rules, and regional localization assets before approving.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/ccrs')}
                            className="text-xs font-sans h-7"
                            style={{ color: 'var(--ink-muted)' }}
                        >
                            All Requests <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                            Loading approval queue...
                        </div>
                    ) : pendingCCRs.length === 0 ? (
                        <div className="p-12 text-center text-xs font-sans space-y-2">
                            <CheckCircle className="h-6 w-6 mx-auto" style={{ color: 'var(--accent)' }} />
                            <div className="font-medium text-ink">Review Queue Clear</div>
                            <p style={{ color: 'var(--ink-muted)' }}>There are currently no change requests pending approval.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs font-sans text-left">
                                <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                    <tr>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted">Title / Request ID</th>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted">Type</th>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted">Quorum Progress</th>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted">Warnings</th>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted">Author</th>
                                        <th className="py-2.5 px-4 font-medium text-ink-muted text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                    {pendingCCRs.map((ccr) => {
                                        const approvals = ccr.approvals || [];
                                        const approvedCount = approvals.filter((a) => a.decision === 'APPROVED').length;
                                        const minReq = ccr.stage?.minApprovals || 1;

                                        return (
                                            <tr
                                                key={ccr.id}
                                                onClick={() => navigate(`/ccrs/${ccr.id}`)}
                                                className="hover:bg-stone-50/50 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-ink">{ccr.title}</div>
                                                    <div className="font-mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                                        CCR-{ccr.id.substring(0, 8)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-[11px] text-ink-muted">
                                                    {ccr.type}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-mono text-[11px] px-2 py-0.5 border" style={{ borderColor: 'var(--line)', backgroundColor: '#F7F6F3' }}>
                                                        {approvedCount} of {minReq} Approved
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {ccr.promotionConflictFlag ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 border"
                                                            style={{ borderColor: 'var(--warning)', color: '#6B4F1D', backgroundColor: '#FDF8E8' }}
                                                        >
                                                            <ShieldAlert className="h-3 w-3" />
                                                            PROMOTION CONFLICT
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-ink-muted">—</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-ink-muted text-[11px]">
                                                    {ccr.createdBy?.name || ccr.createdBy?.email || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/ccrs/${ccr.id}`); }}
                                                        className="h-7 text-xs font-sans px-3 text-white"
                                                        style={{ backgroundColor: 'var(--accent)' }}
                                                    >
                                                        Review & Decide
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};
