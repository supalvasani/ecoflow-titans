import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ccrService } from '../services/ccrService';
import { variantSetService } from '../services/variantSetService';
import { catalogItemService } from '../services/catalogItemService';
import type { CatalogChangeRequest } from '../types/ccr';
import type { VariantSet } from '../types/variantSet';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Plus, ArrowRight, AlertCircle } from 'lucide-react';

export const EngineeringDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [ccrs, setCcrs] = useState<CatalogChangeRequest[]>([]);
    const [variantSets, setVariantSets] = useState<VariantSet[]>([]);
    const [itemCount, setItemCount] = useState<number>(0);
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

                const ccrList = ccrData.ccrs || [];
                setCcrs(ccrList);
                setVariantSets((vsData.variantSets || []).slice(0, 5));
                setItemCount((itemsData.catalogItems || []).length);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load merchandiser workspace');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [token]);

    const draftCcrs = ccrs.filter(c => {
        const stage = (c.stage?.name || '').toUpperCase();
        return stage === 'DRAFT' || stage === 'NEW' || stage === 'WIP';
    });

    const pendingCcrs = ccrs.filter(c => {
        const stage = (c.stage?.name || '').toUpperCase();
        return stage === 'UNDER REVIEW' || stage === 'REVIEW' || stage === 'IN REVIEW';
    });

    const appliedCcrs = ccrs.filter(c => {
        const stage = (c.stage?.name || '').toUpperCase();
        return stage === 'APPLIED' || stage === 'IMPLEMENTED';
    });

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header with Page Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div>
                        <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            Merchandiser Console
                        </h1>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                            Catalog change authoring, draft staging, and version control workspace.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/products/create')}
                            className="font-sans text-xs h-8"
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New Item
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => navigate('/ccrs/new')}
                            className="font-sans text-xs h-8 text-white"
                            style={{ backgroundColor: 'var(--accent)' }}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            New Change Request
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

                {/* Key Metrics / Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            In-Flight Drafts
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : draftCcrs.length}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Unsubmitted work in progress</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Pending Approvals
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : pendingCcrs.length}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Awaiting category review</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Applied Version Bumps
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : appliedCcrs.length}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Promoted to live catalog</div>
                    </div>

                    <div className="bg-white border p-4 space-y-1" style={{ borderColor: 'var(--line)' }}>
                        <div className="text-[11px] font-sans font-medium uppercase tracking-wider" style={{ color: 'var(--ink-muted)' }}>
                            Catalog Master Items
                        </div>
                        <div className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            {loading ? '—' : itemCount}
                        </div>
                        <div className="text-[10px] font-sans" style={{ color: 'var(--ink-muted)' }}>Active SKU records</div>
                    </div>
                </div>

                {/* Main Content Grid: Recent CCRs & Variant Sets */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent CCRs Console Table (2 Cols) */}
                    <div className="lg:col-span-2 bg-white border" style={{ borderColor: 'var(--line)' }}>
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
                            <div>
                                <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                    Recent Change Requests
                                </h2>
                                <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                    Latest catalog modification proposals
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/ccrs')}
                                className="text-xs font-sans h-7"
                                style={{ color: 'var(--ink-muted)' }}
                            >
                                View All <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>

                        {loading ? (
                            <div className="p-8 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Loading change requests...
                            </div>
                        ) : ccrs.length === 0 ? (
                            <div className="p-8 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                No change requests found. Click "New Change Request" to create one.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted">Title / ID</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted">Type</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted">Stage</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted">Author</th>
                                            <th className="py-2.5 px-3 font-medium text-ink-muted text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {ccrs.slice(0, 5).map((ccr) => {
                                            const stage = (ccr.stage?.name || 'DRAFT').toUpperCase();
                                            const isApproved = stage === 'APPROVED';
                                            const isRejected = stage === 'REJECTED';

                                            return (
                                                <tr
                                                    key={ccr.id}
                                                    onClick={() => navigate(`/ccrs/${ccr.id}`)}
                                                    className="hover:bg-stone-50/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-medium text-ink">{ccr.title}</div>
                                                        <div className="font-mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                                            CCR-{ccr.id.substring(0, 8)}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-[11px] text-ink-muted">
                                                        {ccr.type}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span
                                                            className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
                                                            style={{
                                                                borderColor: isApproved ? 'var(--accent)' : isRejected ? 'var(--danger)' : 'var(--line)',
                                                                color: isApproved ? 'var(--accent)' : isRejected ? 'var(--danger)' : 'var(--ink)',
                                                                backgroundColor: isApproved ? '#EBF2EE' : isRejected ? '#FDF2F0' : '#FAFAFA',
                                                            }}
                                                        >
                                                            {stage}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-ink-muted text-[11px]">
                                                        {ccr.createdBy?.name || ccr.createdBy?.email || '—'}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/ccrs/${ccr.id}`); }}
                                                            className="h-6 text-[11px] px-2 font-sans"
                                                        >
                                                            Open
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

                    {/* Variant Sets Quick List (1 Col) */}
                    <div className="bg-white border space-y-0" style={{ borderColor: 'var(--line)' }}>
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--line)' }}>
                            <div>
                                <h2 className="text-sm font-serif font-normal" style={{ color: 'var(--ink)' }}>
                                    Active Variant Sets
                                </h2>
                                <p className="text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                    Multi-channel SKU bundles
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/variant-sets')}
                                className="text-xs font-sans h-7"
                                style={{ color: 'var(--ink-muted)' }}
                            >
                                All <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                        </div>

                        {loading ? (
                            <div className="p-6 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                Loading variant sets...
                            </div>
                        ) : variantSets.length === 0 ? (
                            <div className="p-6 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                                No variant sets configured yet.
                            </div>
                        ) : (
                            <div className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                {variantSets.map((vs) => (
                                    <div
                                        key={vs.id}
                                        onClick={() => navigate(`/variant-sets/${vs.id}`)}
                                        className="p-3.5 hover:bg-stone-50/50 cursor-pointer transition-colors space-y-1"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-xs font-sans text-ink">{vs.name}</span>
                                            <span className="font-mono text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'var(--line)' }}>
                                                {vs.activeVersion?.versionString || 'v1.0'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] font-sans" style={{ color: 'var(--ink-muted)' }}>
                                            <span>SKU: {vs.catalogItem?.sku || '—'}</span>
                                            <span>{vs.activeVersion?.variants?.length || 0} variants</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};
