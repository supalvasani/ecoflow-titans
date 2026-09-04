import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ccrService } from '../../services/ccrService';

import { CCRType } from '../../types/ccr';
import type { CatalogChangeRequest } from '../../types/ccr';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function CCRListPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [ccrs, setCcrs] = useState<CatalogChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const role = user?.role;
    const isApprover = role === 'CATEGORY_APPROVER';

    const fetchCCRs = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const filters: any = {};
            if (filterType !== 'ALL') filters.type = filterType;

            const data = await ccrService.getCCRs(token, filters);
            let list = data.ccrs || [];

            // If Approver, prioritize in-review items
            if (isApprover) {
                list = list.filter(c => {
                    const stage = c.stage?.name?.toUpperCase() || '';
                    return stage !== 'DRAFT';
                });
            }

            setCcrs(list);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load change requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCCRs();
    }, [token, filterType, isApprover]);

    const filteredCCRs = useMemo(() => {
        return ccrs.filter(c => {
            if (!searchQuery) return true;
            return (
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.stage?.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [ccrs, searchQuery]);

    const getTypeBadge = (type: CCRType) => {
        switch (type) {
            case 'ROLLBACK':
                return <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#F9EBE8] text-[#8C3B2E] font-medium">ROLLBACK</span>;
            case 'VARIANT_SET':
            case 'VARIANT_SET_CHANGE':
                return <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#EBE8E1] text-[#1C1B19]">VARIANT SET</span>;
            default:
                return <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#EAEFEA] text-[#2F4B3C]">CATALOG ITEM</span>;
        }
    };

    return (
        <DashboardLayout
            title="Catalog Change Requests"
            subtitle="Staging queue, multi-approver workflows, and promotion conflict reviews"
            action={
                <button
                    onClick={() => navigate('/ccrs/new')}
                    className="px-3 py-1.5 bg-[#2F4B3C] text-white text-xs font-medium rounded hover:bg-[#263D31] transition-colors"
                >
                    Create Change Request
                </button>
            }
        >
            <div className="space-y-4">
                {/* Filters */}
                <div className="bg-white border border-[#DEDBD4] p-3 rounded flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <input
                            type="text"
                            placeholder="Filter requests by title or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-xs px-2.5 py-1.5 bg-[#F7F6F3] border border-[#DEDBD4] rounded w-72 text-[#1C1B19] placeholder:text-[#6B6862] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                        />

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-xs px-2.5 py-1.5 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                        >
                            <option value="ALL">All CCR Types</option>
                            <option value="CATALOG_ITEM">Catalog Item Price/Metadata</option>
                            <option value="VARIANT_SET">Variant Set & Channels</option>
                            <option value="ROLLBACK">Version Rollback</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                    <table className="table-console">
                        <thead>
                            <tr>
                                <th>CCR Title</th>
                                <th className="w-28 text-center">Type</th>
                                <th className="w-36">Current Stage</th>
                                <th className="w-32">Proposer</th>
                                <th className="w-28 font-mono">Date</th>
                                <th className="w-24 text-center">Conflict</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[#6B6862]">
                                        Loading change requests...
                                    </td>
                                </tr>
                            ) : filteredCCRs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[#6B6862]">
                                        No catalog change requests found in this queue.
                                    </td>
                                </tr>
                            ) : (
                                filteredCCRs.map((ccr) => (
                                    <tr
                                        key={ccr.id}
                                        onClick={() => navigate(`/ccrs/${ccr.id}`)}
                                        className="hover:bg-[#F7F6F3] cursor-pointer transition-colors"
                                    >
                                        <td className="font-medium text-[#1C1B19]">
                                            {ccr.title}
                                        </td>
                                        <td className="text-center">
                                            {getTypeBadge(ccr.type)}
                                        </td>
                                        <td className="text-xs">
                                            <span className="font-medium text-[#1C1B19]">
                                                {ccr.stage?.name || 'Draft'}
                                            </span>
                                            {ccr.approvalProgress && ccr.approvalProgress.minApprovals > 1 && (
                                                <span className="block text-[10px] font-mono text-[#6B6862]">
                                                    {ccr.approvalProgress.approvedCount}/{ccr.approvalProgress.minApprovals} approvals
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-xs text-[#6B6862]">
                                            {ccr.createdBy?.name || ccr.createdBy?.email || '—'}
                                        </td>
                                        <td className="font-mono text-xs text-[#6B6862]">
                                            {new Date(ccr.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="text-center">
                                            {ccr.promotionConflictFlag ? (
                                                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#FBF5E8] text-[#A67C2E] font-medium" title="Overlaps active promotional discount">
                                                    PROMO CONFLICT
                                                </span>
                                            ) : (
                                                <span className="text-[#6B6862] text-[10px] font-mono">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="text-xs text-[#6B6862] px-1 font-mono text-[11px]">
                    Showing {filteredCCRs.length} change request(s)
                </div>
            </div>
        </DashboardLayout>
    );
}
