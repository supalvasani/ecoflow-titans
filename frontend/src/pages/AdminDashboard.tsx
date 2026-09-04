import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ccrService } from '../services/ccrService';
import { variantSetService } from '../services/variantSetService';
import { catalogItemService } from '../services/catalogItemService';
import type { CatalogChangeRequest } from '../types/ccr';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { AlertCircle, Settings, Users, FileBarChart, ShieldCheck } from 'lucide-react';

export const AdminDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [ccrs, setCcrs] = useState<CatalogChangeRequest[]>([]);
    const [itemCount, setItemCount] = useState<number>(0);
    const [variantSetCount, setVariantSetCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!token) return;
            try {
                setLoading(true);
                const [ccrData, vsData, itemsData] = await Promise.all([
                    ccrService.getCCRs(token),
                    variantSetService.getVariantSets(token, true),
                    catalogItemService.getCatalogItems(token, true),
                ]);

                setCcrs(ccrData.ccrs || []);
                setVariantSetCount((vsData.variantSets || []).length);
                setItemCount((itemsData.catalogItems || []).length);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load governance administration metrics');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [token]);

    const draftCount = ccrs.filter(c => {
        const s = (c.stage?.name || '').toUpperCase();
        return s === 'DRAFT' || s === 'NEW' || s === 'WIP';
    }).length;

    const reviewCount = ccrs.filter(c => {
        const s = (c.stage?.name || '').toUpperCase();
        return s === 'UNDER REVIEW' || s === 'REVIEW' || s === 'IN REVIEW' || s === 'PENDING_REVIEW';
    }).length;

    const approvedCount = ccrs.filter(c => (c.stage?.name || '').toUpperCase() === 'APPROVED').length;
    const appliedCount = ccrs.filter(c => {
        const s = (c.stage?.name || '').toUpperCase();
        return s === 'APPLIED' || s === 'IMPLEMENTED';
    }).length;
    const rejectedCount = ccrs.filter(c => (c.stage?.name || '').toUpperCase() === 'REJECTED').length;

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div>
                        <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            Governance Administration Console
                        </h1>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                            Enterprise catalog control, stage workflow configurations, and cross-channel governance metrics.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/settings')}
                            className="font-sans text-xs h-8"
                        >
                            <Settings className="mr-1.5 h-3.5 w-3.5" />
                            Workflow Stages
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/reports')}
                            className="font-sans text-xs h-8"
                        >
                            <FileBarChart className="mr-1.5 h-3.5 w-3.5" />
                            Audit Reports
                        </Button>
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

                {/* Primary High-Level Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Total Change Requests
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : ccrs.length}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Lifecycle proposals</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--warning)' }}>
                            Under Review
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : reviewCount}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Quorum verification active</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Master Catalog SKUs
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : itemCount}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Published catalog items</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Variant Sets (Publish Rules)
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : variantSetCount}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Channel grids configured</div>
                    </div>
                </div>

                {/* Stage Funnel Distribution Grid */}
                <div className="bg-white border p-5 space-y-4" style={{ borderColor: 'var(--line)' }}>
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--line)' }}>
                        <div>
                            <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                CCR Lifecycle Distribution
                            </h2>
                            <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Current breakdown of all change requests across stage gates.
                            </p>
                        </div>
                        <span className="font-mono text-xs" style={{ color: 'var(--ink-muted)' }}>
                            Total: {ccrs.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                        <div className="p-3 border bg-stone-50/50" style={{ borderColor: 'var(--line)' }}>
                            <div className="text-[10px] uppercase font-sans font-medium" style={{ color: 'var(--ink-muted)' }}>Draft / WIP</div>
                            <div className="text-xl font-serif mt-1 font-normal text-ink">{draftCount}</div>
                        </div>
                        <div className="p-3 border bg-stone-50/50" style={{ borderColor: 'var(--warning)' }}>
                            <div className="text-[10px] uppercase font-sans font-medium" style={{ color: 'var(--warning)' }}>Under Review</div>
                            <div className="text-xl font-serif mt-1 font-normal" style={{ color: 'var(--warning)' }}>{reviewCount}</div>
                        </div>
                        <div className="p-3 border bg-stone-50/50" style={{ borderColor: 'var(--accent)' }}>
                            <div className="text-[10px] uppercase font-sans font-medium" style={{ color: 'var(--accent)' }}>Approved</div>
                            <div className="text-xl font-serif mt-1 font-normal" style={{ color: 'var(--accent)' }}>{approvedCount}</div>
                        </div>
                        <div className="p-3 border bg-stone-50/50" style={{ borderColor: 'var(--accent)' }}>
                            <div className="text-[10px] uppercase font-sans font-medium" style={{ color: 'var(--accent)' }}>Applied</div>
                            <div className="text-xl font-serif mt-1 font-normal" style={{ color: 'var(--accent)' }}>{appliedCount}</div>
                        </div>
                        <div className="p-3 border bg-stone-50/50" style={{ borderColor: 'var(--danger)' }}>
                            <div className="text-[10px] uppercase font-sans font-medium" style={{ color: 'var(--danger)' }}>Rejected</div>
                            <div className="text-xl font-serif mt-1 font-normal" style={{ color: 'var(--danger)' }}>{rejectedCount}</div>
                        </div>
                    </div>
                </div>

                {/* Quick Governance Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                        onClick={() => navigate('/settings')}
                        className="bg-white border p-4 cursor-pointer hover:border-accent transition-colors space-y-1"
                        style={{ borderColor: 'var(--line)' }}
                    >
                        <div className="flex items-center gap-2 font-medium text-xs font-sans text-ink">
                            <ShieldCheck className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            Stage Approval Settings
                        </div>
                        <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                            Configure approval requirement flags, sequence order, and N-of-M approver quorum thresholds.
                        </p>
                    </div>

                    <div
                        onClick={() => navigate('/admin/users')}
                        className="bg-white border p-4 cursor-pointer hover:border-accent transition-colors space-y-1"
                        style={{ borderColor: 'var(--line)' }}
                    >
                        <div className="flex items-center gap-2 font-medium text-xs font-sans text-ink">
                            <Users className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            User Directory & Roles
                        </div>
                        <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                            Manage user assignments for Merchandisers, Category Approvers, Storefront Viewers, and Admins.
                        </p>
                    </div>

                    <div
                        onClick={() => navigate('/reports')}
                        className="bg-white border p-4 cursor-pointer hover:border-accent transition-colors space-y-1"
                        style={{ borderColor: 'var(--line)' }}
                    >
                        <div className="flex items-center gap-2 font-medium text-xs font-sans text-ink">
                            <FileBarChart className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                            Audit & Governance Reports
                        </div>
                        <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                            Export CSV summaries of approval latencies, price version lineages, and change request audit logs.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
