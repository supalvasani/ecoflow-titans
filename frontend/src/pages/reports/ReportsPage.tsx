import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Download, Layers, History, Trash2, ShieldCheck, AlertCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

type TabType = 'ccr' | 'catalog-versions' | 'variant-history' | 'archived' | 'matrix';

export default function ReportsPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('ccr');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Report data states
    const [ccrHistory, setCcrHistory] = useState<any[]>([]);
    const [catalogVersions, setCatalogVersions] = useState<any[]>([]);
    const [variantHistory, setVariantHistory] = useState<any[]>([]);
    const [archivedItems, setArchivedItems] = useState<any[]>([]);
    const [activeMatrix, setActiveMatrix] = useState<{ items: any[]; variantSets: any[] }>({ items: [], variantSets: [] });

    const fetchData = async (tab: TabType) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            switch (tab) {
                case 'ccr': {
                    const res = await reportService.getCCRHistory(token);
                    setCcrHistory(res.history || []);
                    break;
                }
                case 'catalog-versions': {
                    const res = await reportService.getCatalogItemVersions(token);
                    setCatalogVersions(res.versions || []);
                    break;
                }
                case 'variant-history': {
                    const res = await reportService.getVariantSetHistory(token);
                    setVariantHistory(res.history || []);
                    break;
                }
                case 'archived': {
                    const res = await reportService.getArchivedCatalogItems(token);
                    setArchivedItems(res.archived || []);
                    break;
                }
                case 'matrix': {
                    const res = await reportService.getActiveMatrix(token);
                    setActiveMatrix({
                        items: res.catalogItems || [],
                        variantSets: res.variantSets || [],
                    });
                    break;
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, token]);

    const handleExportCSV = () => {
        let headers: string[] = [];
        let rows: string[][] = [];
        const filename = `synchroshift_${activeTab}_report.csv`;

        if (activeTab === 'ccr') {
            headers = ['CCR Title', 'Type', 'Proposer', 'Stage', 'Date Proposed'];
            rows = ccrHistory.map(h => [
                h.title || '',
                h.type || '',
                h.createdBy?.name || h.createdBy?.email || 'System',
                h.stage?.name || 'Draft',
                new Date(h.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'catalog-versions') {
            headers = ['Catalog Item', 'Version', 'Sale Price', 'Cost Price', 'Status', 'Date Created'];
            rows = catalogVersions.map(pv => [
                pv.catalogItem?.name || 'Unknown',
                (pv.version || pv.versionString || '').toString(),
                String(pv.salePrice || 0),
                String(pv.costPrice || 0),
                pv.status || '',
                new Date(pv.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'variant-history') {
            headers = ['Variant Set ID', 'Version', 'Variants Count', 'Channel Rules Count', 'Status', 'Date Proposed'];
            rows = variantHistory.map(b => [
                b.variantSetId || b.id || '',
                (b.version || '').toString(),
                (b.variants?.length || 0).toString(),
                (b.channelPublishRules?.length || 0).toString(),
                b.status || '',
                new Date(b.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'archived') {
            headers = ['Catalog Item Name', 'SKU', 'Total Archived Versions'];
            rows = archivedItems.map(a => [
                a.name || '',
                a.sku || '',
                (a.versions?.length || 0).toString()
            ]);
        } else if (activeTab === 'matrix') {
            headers = ['Item Name', 'SKU', 'Live Version', 'Sale Price', 'Cost Price', 'Active Variant Sets'];
            rows = activeMatrix.items.map(p => {
                const currentV = p.versions?.find((v: any) => v.isCurrent) || p.versions?.[0];
                const matchingSets = activeMatrix.variantSets.filter((b: any) => b.catalogItemId === p.id || b.productId === p.id);
                return [
                    p.name,
                    p.sku,
                    (currentV?.version || '1.0').toString(),
                    String(currentV?.salePrice || 0),
                    String(currentV?.costPrice || 0),
                    matchingSets.map((b: any) => b.name || b.id).join('; ')
                ];
            });
        }

        const csvContent = 'data:text/csv;charset=utf-8,' +
            [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--line)' }}>
                    <div>
                        <h1 className="text-2xl font-serif font-normal" style={{ color: 'var(--ink)' }}>
                            Catalog Governance & Audit Reports
                        </h1>
                        <p className="text-xs font-sans mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                            Enterprise version audit trails, multi-channel release logs, and pricing lineage reports.
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        disabled={loading}
                        className="font-sans text-xs h-8"
                    >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export Report (.CSV)
                    </Button>
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

                {/* Tabs */}
                <div className="border-b flex flex-wrap items-center gap-6 text-xs font-sans font-medium" style={{ borderColor: 'var(--line)' }}>
                    <button
                        onClick={() => setActiveTab('ccr')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'ccr' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'ccr' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'ccr' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        CCR Lifecycle Log
                    </button>

                    <button
                        onClick={() => setActiveTab('catalog-versions')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'catalog-versions' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'catalog-versions' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'catalog-versions' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <History className="h-3.5 w-3.5" />
                        Item Version Lineage
                    </button>

                    <button
                        onClick={() => setActiveTab('variant-history')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'variant-history' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'variant-history' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'variant-history' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Variant Set Releases
                    </button>

                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'archived' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'archived' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'archived' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Archived / Rollback Candidates
                    </button>

                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
                            activeTab === 'matrix' ? 'border-accent text-accent font-semibold' : 'border-transparent text-ink-muted'
                        }`}
                        style={{
                            borderColor: activeTab === 'matrix' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'matrix' ? 'var(--accent)' : 'var(--ink-muted)',
                        }}
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Live Matrix Snapshot
                    </button>
                </div>

                {/* Report Table Container */}
                <div className="bg-white border" style={{ borderColor: 'var(--line)' }}>
                    {loading ? (
                        <div className="p-12 text-center text-xs font-sans" style={{ color: 'var(--ink-muted)' }}>
                            Generating report dataset...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            {/* CCR Report Table */}
                            {activeTab === 'ccr' && (
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Title / CCR ID</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Type</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Author</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Stage</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Proposed At</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {ccrHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-stone-50/50">
                                                <td className="py-2.5 px-4">
                                                    <div className="font-medium text-ink">{item.title}</div>
                                                    <div className="font-mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                                        CCR-{item.id.substring(0, 8)}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-4 font-mono text-[11px] text-ink-muted">{item.type}</td>
                                                <td className="py-2.5 px-4 text-ink-muted">{item.createdBy?.name || item.createdBy?.email || 'System'}</td>
                                                <td className="py-2.5 px-4">
                                                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 border" style={{ borderColor: 'var(--line)' }}>
                                                        {item.stage?.name || 'DRAFT'}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 font-mono text-[11px] text-ink-muted">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-2.5 px-4 text-right">
                                                    <Link to={`/ccrs/${item.id}`} className="text-xs font-sans text-accent hover:underline">
                                                        View Console
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Catalog Versions Lineage Table */}
                            {activeTab === 'catalog-versions' && (
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Catalog Item</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Version</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Sale Price</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Cost Price</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Margin</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Status</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Effective Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {catalogVersions.map((v) => {
                                            const sale = Number(v.salePrice || 0);
                                            const cost = Number(v.costPrice || 0);
                                            const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;

                                            return (
                                                <tr key={v.id} className="hover:bg-stone-50/50">
                                                    <td className="py-2.5 px-4">
                                                        <div className="font-medium text-ink">{v.catalogItem?.name || 'Unknown'}</div>
                                                        <div className="font-mono text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                                                            {v.catalogItem?.sku || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-ink">v{v.version || v.versionString || '1.0'}</td>
                                                    <td className="py-2.5 px-4 font-mono text-ink">${sale.toFixed(2)}</td>
                                                    <td className="py-2.5 px-4 font-mono text-ink-muted">${cost.toFixed(2)}</td>
                                                    <td className="py-2.5 px-4 font-mono text-accent font-medium">{margin.toFixed(1)}%</td>
                                                    <td className="py-2.5 px-4">
                                                        <span className="font-mono text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'var(--line)' }}>
                                                            {v.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 font-mono text-[11px] text-ink-muted">
                                                        {new Date(v.createdAt).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {/* Variant Set Releases Table */}
                            {activeTab === 'variant-history' && (
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Variant Set ID</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Version</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Variants</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Channel Rules</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Status</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Released</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {variantHistory.map((b) => (
                                            <tr key={b.id} className="hover:bg-stone-50/50">
                                                <td className="py-2.5 px-4 font-mono text-ink">{b.variantSetId || b.id}</td>
                                                <td className="py-2.5 px-4 font-mono text-ink">v{b.version || '1.0'}</td>
                                                <td className="py-2.5 px-4 font-mono text-ink-muted">{b.variants?.length || 0}</td>
                                                <td className="py-2.5 px-4 font-mono text-ink-muted">{b.channelPublishRules?.length || 0}</td>
                                                <td className="py-2.5 px-4">
                                                    <span className="font-mono text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'var(--line)' }}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-4 font-mono text-[11px] text-ink-muted">
                                                    {new Date(b.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Archived Table */}
                            {activeTab === 'archived' && (
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Catalog Item Name</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">SKU</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Archived Versions</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {archivedItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-stone-50/50">
                                                <td className="py-2.5 px-4 font-medium text-ink">{item.name}</td>
                                                <td className="py-2.5 px-4 font-mono text-ink-muted">{item.sku}</td>
                                                <td className="py-2.5 px-4 font-mono text-ink">{item.versions?.length || 0}</td>
                                                <td className="py-2.5 px-4 text-right">
                                                    <Link to={`/products/${item.id}`} className="text-xs font-sans text-accent hover:underline">
                                                        Inspect Lineage
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {/* Active Matrix Table */}
                            {activeTab === 'matrix' && (
                                <table className="w-full text-xs font-sans text-left">
                                    <thead className="border-b" style={{ borderColor: 'var(--line)', backgroundColor: '#FBFBFA' }}>
                                        <tr>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Item Name</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">SKU</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Active Version</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Active Price</th>
                                            <th className="py-2.5 px-4 font-medium text-ink-muted">Linked Variant Sets</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'var(--line)' }}>
                                        {activeMatrix.items.map((item) => {
                                            const currentV = item.versions?.find((v: any) => v.isCurrent) || item.versions?.[0];
                                            const matchingSets = activeMatrix.variantSets.filter((b: any) => b.catalogItemId === item.id || b.productId === item.id);

                                            return (
                                                <tr key={item.id} className="hover:bg-stone-50/50">
                                                    <td className="py-2.5 px-4 font-medium text-ink">{item.name}</td>
                                                    <td className="py-2.5 px-4 font-mono text-ink-muted">{item.sku}</td>
                                                    <td className="py-2.5 px-4 font-mono text-ink">v{currentV?.version || '1.0'}</td>
                                                    <td className="py-2.5 px-4 font-mono text-ink">${Number(currentV?.salePrice || 0).toFixed(2)}</td>
                                                    <td className="py-2.5 px-4 text-ink-muted">
                                                        {matchingSets.length > 0 ? (
                                                            <span className="font-mono text-xs">{matchingSets.map((b: any) => b.name).join(', ')}</span>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
