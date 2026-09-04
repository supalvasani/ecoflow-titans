import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { catalogItemService } from '../../services/catalogItemService';
import type { CatalogItem, CatalogItemVersion } from '../../types/catalogItem';

import { DashboardLayout } from '../../components/layout/DashboardLayout';


export default function CatalogItemDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [item, setItem] = useState<CatalogItem | null>(null);
    const [activeVersion, setActiveVersion] = useState<CatalogItemVersion | null>(null);
    const [versions, setVersions] = useState<CatalogItemVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'content'>('overview');

    const role = user?.role;
    const isStorefront = role === 'STOREFRONT_VIEWER';
    const canPropose = role === 'ADMIN' || role === 'MERCHANDISER';

    useEffect(() => {
        const fetchData = async () => {
            if (!token || !id) return;
            try {
                setLoading(true);
                const itemRes = await catalogItemService.getCatalogItemById(token, id);
                setItem(itemRes.catalogItem);

                try {
                    const activeRes = await catalogItemService.getActiveVersion(token, id);
                    setActiveVersion(activeRes.version);
                } catch {
                    // No active version found
                }

                if (!isStorefront) {
                    const versRes = await catalogItemService.getCatalogItemVersions(token, id);
                    setVersions(versRes.versions || []);
                }
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load catalog item details');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, id, isStorefront]);

    const handleProposeChange = () => {
        navigate(`/ccrs/new?catalogItemId=${id}&type=CATALOG_ITEM`);
    };

    const handleProposeRollback = (targetVersionId: string) => {
        navigate(`/ccrs/new?type=ROLLBACK&rollbackTargetVersionId=${targetVersionId}&catalogItemId=${id}`);
    };

    if (loading) {
        return (
            <DashboardLayout title="Catalog Item">
                <div className="p-8 text-center text-xs text-[#6B6862]">
                    Loading item specifications...
                </div>
            </DashboardLayout>
        );
    }

    if (error || !item) {
        return (
            <DashboardLayout title="Catalog Item">
                <div className="p-4 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                    {error || 'Catalog item not found.'}
                </div>
            </DashboardLayout>
        );
    }

    const allContent = versions.flatMap(v => (v.content || []).map(c => ({ ...c, versionNum: v.version })))
        .concat((activeVersion?.content || []).map(c => ({ ...c, versionNum: activeVersion?.version || 1 })));


    // Deduplicate content by ID
    const uniqueContent = Array.from(new Map(allContent.map(c => [c.id, c])).values());

    return (
        <DashboardLayout
            title={item.name}
            subtitle={`SKU ${item.sku} • Brand ${item.brand || 'Unbranded'} • Category ${item.category || 'General'}`}
            action={
                <div className="flex items-center gap-2">
                    <Link
                        to="/products"
                        className="px-2.5 py-1.5 border border-[#DEDBD4] bg-white text-xs text-[#1C1B19] rounded hover:bg-[#F7F6F3] transition-colors"
                    >
                        Back to List
                    </Link>
                    {canPropose && (
                        <button
                            onClick={handleProposeChange}
                            className="px-3 py-1.5 bg-[#2F4B3C] text-white text-xs font-medium rounded hover:bg-[#263D31] transition-colors"
                        >
                            Propose CCR Change
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-4">
                {/* Navigation Tabs */}
                <div className="border-b border-[#DEDBD4] flex gap-6 text-xs">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === 'overview'
                                ? 'border-[#2F4B3C] text-[#2F4B3C]'
                                : 'border-transparent text-[#6B6862] hover:text-[#1C1B19]'
                        }`}
                    >
                        Item Specifications
                    </button>
                    {!isStorefront && (
                        <button
                            onClick={() => setActiveTab('versions')}
                            className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
                                activeTab === 'versions'
                                    ? 'border-[#2F4B3C] text-[#2F4B3C]'
                                    : 'border-transparent text-[#6B6862] hover:text-[#1C1B19]'
                            }`}
                        >
                            Version Lineage ({versions.length})
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`pb-2 font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === 'content'
                                ? 'border-[#2F4B3C] text-[#2F4B3C]'
                                : 'border-transparent text-[#6B6862] hover:text-[#1C1B19]'
                        }`}
                    >
                        Locale Content & Media
                    </button>
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#DEDBD4] p-4 rounded space-y-3">
                            <h2 className="font-serif text-sm font-medium text-[#1C1B19] border-b border-[#DEDBD4] pb-2">
                                Active Catalog Version (v{activeVersion?.version || 1})
                            </h2>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <div className="text-[#6B6862]">SKU Code:</div>
                                <div className="font-mono text-[#1C1B19]">{item.sku}</div>

                                <div className="text-[#6B6862]">Active Sale Price:</div>
                                <div className="font-mono font-medium text-[#1C1B19]">
                                    ${activeVersion?.salePrice ? parseFloat(String(activeVersion.salePrice)).toFixed(2) : '—'} {activeVersion?.currency || 'USD'}
                                </div>

                                {!isStorefront && (
                                    <>
                                        <div className="text-[#6B6862]">Base Cost Price:</div>
                                        <div className="font-mono text-[#6B6862]">
                                            ${activeVersion?.costPrice ? parseFloat(String(activeVersion.costPrice)).toFixed(2) : '—'}
                                        </div>
                                    </>
                                )}

                                <div className="text-[#6B6862]">Lifecycle Status:</div>
                                <div>
                                    <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#EAEFEA] text-[#2F4B3C]">
                                        {activeVersion?.status || 'ACTIVE'}
                                    </span>
                                </div>

                                {activeVersion?.effectiveFrom && (
                                    <>
                                        <div className="text-[#6B6862]">Effective From:</div>
                                        <div className="font-mono text-[#A67C2E]">
                                            {new Date(activeVersion.effectiveFrom).toLocaleDateString()}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-white border border-[#DEDBD4] p-4 rounded space-y-3">
                            <h2 className="font-serif text-sm font-medium text-[#1C1B19] border-b border-[#DEDBD4] pb-2">
                                Classification & Metadata
                            </h2>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <div className="text-[#6B6862]">Primary Brand:</div>
                                <div className="text-[#1C1B19]">{item.brand || 'None specified'}</div>

                                <div className="text-[#6B6862]">Category Domain:</div>
                                <div className="text-[#1C1B19]">{item.category || 'General Catalog'}</div>

                                <div className="text-[#6B6862]">System Identifier:</div>
                                <div className="font-mono text-[11px] text-[#6B6862] truncate" title={item.id}>{item.id}</div>

                                <div className="text-[#6B6862]">Created Timestamp:</div>
                                <div className="font-mono text-[#6B6862]">{new Date(item.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Version History */}
                {activeTab === 'versions' && !isStorefront && (
                    <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                        <table className="table-console">
                            <thead>
                                <tr>
                                    <th className="w-20 font-mono">Rev</th>
                                    <th className="w-28 text-right">Sale Price</th>
                                    <th className="w-24 text-right">Cost</th>
                                    <th className="w-24 text-center">Currency</th>
                                    <th className="w-24 text-center">Status</th>
                                    <th className="w-40 font-mono">Effective Date</th>
                                    <th className="w-32 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map((ver) => {
                                    const isCurrentActive = ver.isCurrent && ver.status === 'ACTIVE';
                                    const isArchived = ver.status === 'ARCHIVED';

                                    return (
                                        <tr key={ver.id} className={isCurrentActive ? 'bg-[#F9F9F8]' : ''}>
                                            <td className="font-mono font-medium">
                                                v{ver.version} {isCurrentActive && <span className="text-[10px] text-[#2F4B3C] font-normal">(Current)</span>}
                                            </td>
                                            <td className="text-right font-mono font-medium text-[#1C1B19]">
                                                ${parseFloat(String(ver.salePrice)).toFixed(2)}
                                            </td>
                                            <td className="text-right font-mono text-[#6B6862]">
                                                ${parseFloat(String(ver.costPrice)).toFixed(2)}
                                            </td>
                                            <td className="text-center font-mono text-xs">
                                                {ver.currency || 'USD'}
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                                                        isArchived
                                                            ? 'bg-[#F9EBE8] text-[#8C3B2E]'
                                                            : 'bg-[#EAEFEA] text-[#2F4B3C]'
                                                    }`}
                                                >
                                                    {ver.status}
                                                </span>
                                            </td>
                                            <td className="font-mono text-xs text-[#6B6862]">
                                                {ver.effectiveFrom
                                                    ? new Date(ver.effectiveFrom).toLocaleDateString()
                                                    : new Date(ver.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="text-right">
                                                {canPropose && isArchived && (
                                                    <button
                                                        onClick={() => handleProposeRollback(ver.id)}
                                                        className="px-2 py-1 text-[11px] border border-[#DEDBD4] text-[#8C3B2E] hover:border-[#8C3B2E] rounded transition-colors bg-white"
                                                        title="Create a Rollback CCR to restore this version's pricing"
                                                    >
                                                        Propose Rollback
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Tab: Locale Content */}
                {activeTab === 'content' && (
                    <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                        <table className="table-console">
                            <thead>
                                <tr>
                                    <th className="w-24 font-mono">Locale</th>
                                    <th className="w-32">Content Type</th>
                                    <th>File Descriptor / Name</th>
                                    <th className="w-48 font-mono">Asset URL</th>
                                    <th className="w-32 text-center">Regional Approval</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniqueContent.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-[#6B6862]">
                                            No localized media or attachments registered for this item.
                                        </td>
                                    </tr>
                                ) : (
                                    uniqueContent.map((c: any) => (
                                        <tr key={c.id}>
                                            <td className="font-mono text-xs font-medium text-[#1C1B19]">
                                                {c.locale || 'en-US'}
                                            </td>
                                            <td className="text-xs text-[#6B6862]">
                                                {c.contentType}
                                            </td>
                                            <td className="text-xs text-[#1C1B19] font-medium">
                                                {c.filename}
                                            </td>
                                            <td className="font-mono text-xs text-[#6B6862] truncate max-w-xs">
                                                <a
                                                    href={c.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[#2F4B3C] hover:underline"
                                                >
                                                    {c.url}
                                                </a>
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                                                        c.approved
                                                            ? 'bg-[#EAEFEA] text-[#2F4B3C]'
                                                            : 'bg-[#FBF5E8] text-[#A67C2E]'
                                                    }`}
                                                >
                                                    {c.approved ? 'Approved' : 'Pending Approval'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
