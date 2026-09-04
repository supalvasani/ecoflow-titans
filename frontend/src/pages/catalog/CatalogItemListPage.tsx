import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { catalogItemService } from '../../services/catalogItemService';
import type { CatalogItem } from '../../types/catalogItem';

import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function CatalogItemListPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [items, setItems] = useState<CatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    const role = user?.role;
    const isStorefront = role === 'STOREFRONT_VIEWER';
    const canCreate = role === 'ADMIN' || role === 'MERCHANDISER';

    const fetchItems = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await catalogItemService.getCatalogItems(token, includeArchived);
            setItems(data.catalogItems || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load catalog items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [token, includeArchived]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        items.forEach(i => { if (i.category) set.add(i.category); });
        return ['ALL', ...Array.from(set)];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
            const matchesQuery = !searchQuery ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.brand && item.brand.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesQuery;
        });
    }, [items, categoryFilter, searchQuery]);

    const getItemActiveVersion = (item: CatalogItem) => {
        const versions = item.versions || [];
        const current = versions.find(v => v.isCurrent) || versions[0];
        return current;
    };

    return (
        <DashboardLayout
            title="Catalog Master"
            subtitle="Authoritative repository of SKU definitions, pricing, and version lineage"
            action={
                canCreate ? (
                    <button
                        onClick={() => navigate('/products/new')}
                        className="px-3 py-1.5 bg-[#2F4B3C] text-white text-xs font-medium rounded hover:bg-[#263D31] transition-colors"
                    >
                        Create Catalog Item
                    </button>
                ) : undefined
            }
        >
            <div className="space-y-4">
                {/* Filter and Control Bar */}
                <div className="bg-white border border-[#DEDBD4] p-3 rounded flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <input
                            type="text"
                            placeholder="Filter by SKU, item name, or brand..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs px-2.5 py-1.5 bg-[#F7F6F3] border border-[#DEDBD4] rounded w-72 text-[#1C1B19] placeholder:text-[#6B6862] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                        />

                        {categories.length > 1 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="text-xs px-2.5 py-1.5 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {!isStorefront && (
                        <label className="flex items-center gap-2 text-xs text-[#6B6862] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={includeArchived}
                                onChange={(e) => setIncludeArchived(e.target.checked)}
                                className="rounded border-[#DEDBD4] text-[#2F4B3C] focus:ring-0"
                            />
                            Show archived versions
                        </label>
                    )}
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="p-3 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                        {error}
                    </div>
                )}

                {/* Catalog Table */}
                <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                    <table className="table-console">
                        <thead>
                            <tr>
                                <th className="w-28 font-mono">SKU</th>
                                <th>Item Name</th>
                                <th className="w-32">Brand</th>
                                <th className="w-32">Category</th>
                                <th className="w-24 text-center">Version</th>
                                <th className="w-28 text-right">Sale Price</th>
                                <th className="w-24 text-right">Cost</th>
                                <th className="w-24 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-[#6B6862]">
                                        Loading catalog definitions...
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-[#6B6862]">
                                        No catalog items found matching the current filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => {
                                    const activeVer = getItemActiveVersion(item);
                                    const isArchived = activeVer?.status === 'ARCHIVED';

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => navigate(`/products/${item.id}`)}
                                            className="hover:bg-[#F7F6F3] cursor-pointer transition-colors"
                                        >
                                            <td className="font-mono text-xs text-[#1C1B19]">
                                                {item.sku}
                                            </td>
                                            <td className="font-medium text-[#1C1B19]">
                                                {item.name}
                                            </td>
                                            <td className="text-[#6B6862] text-xs">
                                                {item.brand || '—'}
                                            </td>
                                            <td className="text-[#6B6862] text-xs">
                                                {item.category || '—'}
                                            </td>
                                            <td className="text-center font-mono text-xs">
                                                v{activeVer?.version || 1}
                                            </td>
                                            <td className="text-right font-mono text-xs text-[#1C1B19]">
                                                {activeVer?.salePrice ? `$${parseFloat(String(activeVer.salePrice)).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="text-right font-mono text-xs text-[#6B6862]">
                                                {!isStorefront && activeVer?.costPrice ? `$${parseFloat(String(activeVer.costPrice)).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className={`inline-block px-1.5 py-0.5 text-[10px] font-mono rounded ${isArchived
                                                            ? 'bg-[#F9EBE8] text-[#8C3B2E]'
                                                            : 'bg-[#EAEFEA] text-[#2F4B3C]'
                                                        }`}
                                                >
                                                    {activeVer?.status || 'ACTIVE'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer Stats */}
                <div className="flex justify-between items-center text-xs text-[#6B6862] px-1">
                    <div>
                        Showing <span className="font-mono font-medium text-[#1C1B19]">{filteredItems.length}</span> of <span className="font-mono">{items.length}</span> items
                    </div>
                    <div className="font-mono text-[11px]">
                        Last synchronized: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
