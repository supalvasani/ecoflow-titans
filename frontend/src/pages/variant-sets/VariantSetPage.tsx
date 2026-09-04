import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { variantSetService } from '../../services/variantSetService';
import type { VariantSet } from '../../types/variantSet';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function VariantSetPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [variantSets, setVariantSets] = useState<VariantSet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const role = user?.role;
    const isStorefront = role === 'STOREFRONT_VIEWER';

    const fetchSets = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await variantSetService.getVariantSets(token, includeArchived);
            setVariantSets(data.variantSets || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load variant sets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSets();
    }, [token, includeArchived]);

    const filteredSets = useMemo(() => {
        return variantSets.filter(s => {
            const item = s.catalogItem;
            if (!searchQuery) return true;
            return (
                item?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item?.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.id.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [variantSets, searchQuery]);

    return (
        <DashboardLayout
            title="Variant Sets & Channel Distribution"
            subtitle="Manage color/size SKU structures and regional multi-channel rollout rules"
        >
            <div className="space-y-4">
                {/* Control bar */}
                <div className="bg-white border border-[#DEDBD4] p-3 rounded flex items-center justify-between gap-4">
                    <input
                        type="text"
                        placeholder="Search by parent item name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="text-xs px-2.5 py-1.5 bg-[#F7F6F3] border border-[#DEDBD4] rounded w-80 text-[#1C1B19] placeholder:text-[#6B6862] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                    />

                    {!isStorefront && (
                        <label className="flex items-center gap-2 text-xs text-[#6B6862] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={includeArchived}
                                onChange={(e) => setIncludeArchived(e.target.checked)}
                                className="rounded border-[#DEDBD4] text-[#2F4B3C] focus:ring-0"
                            />
                            Show archived revisions
                        </label>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                        {error}
                    </div>
                )}

                {/* Variant Set Table */}
                <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                    <table className="table-console">
                        <thead>
                            <tr>
                                <th>Catalog Item</th>
                                <th className="w-28 font-mono">Parent SKU</th>
                                <th className="w-20 text-center">Version</th>
                                <th className="w-28 text-center">Variants</th>
                                <th>Active Live Channels</th>
                                <th className="w-24 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[#6B6862]">
                                        Loading variant structures...
                                    </td>
                                </tr>
                            ) : filteredSets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[#6B6862]">
                                        No variant sets registered.
                                    </td>
                                </tr>
                            ) : (
                                filteredSets.map((set) => {
                                    const item = set.catalogItem;
                                    const activeVer = set.versions?.find(v => v.status === 'ACTIVE') || set.versions?.[0];
                                    const variants = activeVer?.variants || [];
                                    const rules = activeVer?.channelPublishRules || [];
                                    const liveRules = rules.filter((r: any) => r.isLive);

                                    return (
                                        <tr
                                            key={set.id}
                                            onClick={() => navigate(`/variant-sets/${set.id}`)}
                                            className="hover:bg-[#F7F6F3] cursor-pointer transition-colors"
                                        >
                                            <td className="font-medium text-[#1C1B19]">
                                                {item?.name || 'Unnamed Item'}
                                            </td>
                                            <td className="font-mono text-xs text-[#1C1B19]">
                                                {item?.sku || '—'}
                                            </td>
                                            <td className="text-center font-mono text-xs">
                                                v{activeVer?.version || 1}
                                            </td>
                                            <td className="text-center font-mono text-xs">
                                                {variants.length} variant{variants.length !== 1 ? 's' : ''}
                                            </td>
                                            <td className="text-xs">
                                                {liveRules.length === 0 ? (
                                                    <span className="text-[#6B6862]">All channels offline</span>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {liveRules.map((r: any) => (
                                                            <span
                                                                key={r.id}
                                                                className="px-1.5 py-0.2 bg-[#EAEFEA] text-[#2F4B3C] font-mono text-[10px] rounded"
                                                            >
                                                                {r.channel} ({r.region})
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                                                        activeVer?.status === 'ARCHIVED'
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

                <div className="text-xs text-[#6B6862] px-1 font-mono text-[11px]">
                    Showing {filteredSets.length} variant set definition(s)
                </div>
            </div>
        </DashboardLayout>
    );
}
