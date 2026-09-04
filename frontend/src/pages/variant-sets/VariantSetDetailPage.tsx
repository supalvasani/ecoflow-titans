import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { variantSetService } from '../../services/variantSetService';
import type { VariantSet, VariantSetVersion, ChannelPublishRule, Variant } from '../../types/variantSet';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

const CHANNELS = ['WEB', 'MOBILE_APP', 'MARKETPLACE'] as const;
const REGIONS = ['US', 'EU', 'APAC'] as const;

export default function VariantSetDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();

    const [variantSet, setVariantSet] = useState<VariantSet | null>(null);
    const [activeVersion, setActiveVersion] = useState<VariantSetVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const role = user?.role;
    const canManageRules = role === 'ADMIN' || role === 'MERCHANDISER';

    const fetchSetData = async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const data = await variantSetService.getVariantSetById(token, id);
            const setObj = data.variantSet;
            setVariantSet(setObj);

            // Active or first version
            const active = setObj.versions?.find((v: any) => v.status === 'ACTIVE' && v.isCurrent) || setObj.versions?.[0];
            setActiveVersion(active || null);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load variant set');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSetData();
    }, [token, id]);

    const handleToggleRule = async (rule: ChannelPublishRule) => {
        if (!token || !canManageRules) return;
        const newLiveState = !rule.isLive;
        try {
            setActionLoadingId(rule.id);
            setError(null);
            setStatusMessage(null);

            await variantSetService.toggleChannelPublishRule(token, rule.id, newLiveState);

            setStatusMessage(`Channel rule ${rule.channel} (${rule.region}) set to ${newLiveState ? 'LIVE' : 'OFFLINE'}.`);
            // Refresh data
            await fetchSetData();
        } catch (err: any) {
            setError(err.message || 'Failed to update channel publish rule');
        } finally {
            setActionLoadingId(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Variant Set">
                <div className="p-8 text-center text-xs text-[#6B6862]">
                    Loading variant structure & distribution rules...
                </div>
            </DashboardLayout>
        );
    }

    if (error && !variantSet) {
        return (
            <DashboardLayout title="Variant Set">
                <div className="p-4 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                    {error}
                </div>
            </DashboardLayout>
        );
    }

    const item = variantSet?.catalogItem;
    const variants: Variant[] = activeVersion?.variants || [];
    const channelRules: ChannelPublishRule[] = activeVersion?.channelPublishRules || [];

    // Map rules into Channel x Region lookup
    const ruleLookup = new Map<string, ChannelPublishRule>();
    channelRules.forEach(r => {
        ruleLookup.set(`${r.channel}_${r.region}`, r);
    });

    return (
        <DashboardLayout
            title={`Variant Set: ${item?.name || 'Catalog Item'}`}
            subtitle={`Parent SKU ${item?.sku || '—'} • Version v${activeVersion?.version || 1} • ${variants.length} SKU Variants`}
            action={
                <Link
                    to="/variant-sets"
                    className="px-2.5 py-1.5 border border-[#DEDBD4] bg-white text-xs text-[#1C1B19] rounded hover:bg-[#F7F6F3] transition-colors"
                >
                    Back to Sets
                </Link>
            }
        >
            <div className="space-y-6">
                {/* Alerts */}
                {error && (
                    <div className="p-3 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-[10px] underline">Dismiss</button>
                    </div>
                )}
                {statusMessage && (
                    <div className="p-3 bg-[#EAEFEA] border border-[#2F4B3C] text-[#2F4B3C] text-xs rounded flex justify-between items-center">
                        <span>{statusMessage}</span>
                        <button onClick={() => setStatusMessage(null)} className="text-[10px] underline">Dismiss</button>
                    </div>
                )}

                {/* Section 1: Multi-Channel Staggered Publish Grid */}
                <div className="bg-white border border-[#DEDBD4] rounded p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-[#DEDBD4] pb-2">
                        <div>
                            <h2 className="font-serif text-sm font-medium text-[#1C1B19]">
                                Multi-Channel Staggered Publish Grid
                            </h2>
                            <p className="text-[11px] text-[#6B6862] mt-0.5">
                                Granular per-channel and per-region live controls. Regional rollout is gated by approved localized content.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#2F4B3C]" /> Live Now</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#A67C2E]" /> Scheduled</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#DEDBD4]" /> Offline</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table-console border border-[#DEDBD4]">
                            <thead>
                                <tr>
                                    <th className="w-36 bg-[#F7F6F3]">Channel \ Region</th>
                                    {REGIONS.map(reg => (
                                        <th key={reg} className="text-center font-mono text-xs w-48 bg-[#F7F6F3]">
                                            {reg} Region
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {CHANNELS.map(chan => (
                                    <tr key={chan}>
                                        <td className="font-mono text-xs font-semibold bg-[#F7F6F3] border-r border-[#DEDBD4]">
                                            {chan}
                                        </td>
                                        {REGIONS.map(reg => {
                                            const rule = ruleLookup.get(`${chan}_${reg}`);
                                            if (!rule) {
                                                return (
                                                    <td key={reg} className="text-center text-xs text-[#6B6862] bg-[#FAFAF8] p-3 border-r border-[#DEDBD4]">
                                                        <span className="text-[11px] italic">Not configured</span>
                                                    </td>
                                                );
                                            }

                                            const isLive = rule.isLive;
                                            const isScheduled = !isLive && rule.goLiveAt && new Date(rule.goLiveAt) > new Date();
                                            const isPendingAction = actionLoadingId === rule.id;

                                            return (
                                                <td
                                                    key={reg}
                                                    className={`p-3 border-r border-[#DEDBD4] text-center transition-colors ${
                                                        isLive
                                                            ? 'bg-[#F4F7F4]'
                                                            : isScheduled
                                                            ? 'bg-[#FBF9F2]'
                                                            : 'bg-white'
                                                    }`}
                                                >
                                                    <div className="space-y-1.5">
                                                        {/* Status Pill */}
                                                        <div>
                                                            {isLive ? (
                                                                <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-[#EAEFEA] text-[#2F4B3C] font-semibold">
                                                                    ● LIVE NOW
                                                                </span>
                                                            ) : isScheduled ? (
                                                                <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-[#FBF5E8] text-[#A67C2E] font-medium">
                                                                    SCHEDULED: {new Date(rule.goLiveAt!).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-[#EBE8E1] text-[#6B6862]">
                                                                    OFFLINE
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Lead time buffer */}
                                                        <div className="text-[10px] text-[#6B6862] font-mono">
                                                            Lead Buffer: {rule.publishLeadMinutes || 0}m
                                                        </div>

                                                        {/* Toggle action button */}
                                                        {canManageRules && (
                                                            <div>
                                                                <button
                                                                    disabled={isPendingAction}
                                                                    onClick={() => handleToggleRule(rule)}
                                                                    className={`px-2 py-0.5 text-[10px] font-medium rounded border transition-colors ${
                                                                        isLive
                                                                            ? 'border-[#DEDBD4] text-[#8C3B2E] hover:border-[#8C3B2E] bg-white'
                                                                            : 'border-[#2F4B3C] bg-[#2F4B3C] text-white hover:bg-[#263D31]'
                                                                    } disabled:opacity-50`}
                                                                >
                                                                    {isPendingAction ? 'Updating...' : isLive ? 'Take Offline' : 'Set Live'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Section 2: Variant Matrix Table */}
                <div className="bg-white border border-[#DEDBD4] rounded overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#DEDBD4] flex justify-between items-center bg-[#F7F6F3]">
                        <h2 className="font-serif text-sm font-medium text-[#1C1B19]">
                            Variant SKU Matrix ({variants.length} Sub-SKUs)
                        </h2>
                        <span className="text-[11px] text-[#6B6862]">
                            Attributes & Inventory Allocations
                        </span>
                    </div>

                    <table className="table-console">
                        <thead>
                            <tr>
                                <th className="w-32">Attribute</th>
                                <th className="w-36">Option Value</th>
                                <th className="w-32 text-right">Stock Quantity</th>
                                <th>Linked SKU / Revision</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-6 text-[#6B6862]">
                                        No variant attribute rows defined for this version.
                                    </td>
                                </tr>
                            ) : (
                                variants.map((v) => {
                                    const linkedItem = v.variantVersion?.catalogItem;
                                    const linkedVersion = v.variantVersion;

                                    return (
                                        <tr key={v.id}>
                                            <td className="font-medium text-xs text-[#1C1B19]">
                                                {v.attributeName}
                                            </td>
                                            <td className="font-mono text-xs text-[#1C1B19]">
                                                {v.attributeValue}
                                            </td>
                                            <td className="text-right font-mono text-xs text-[#1C1B19]">
                                                {(v.stockQty ?? 0).toLocaleString()} units
                                            </td>
                                            <td className="text-xs text-[#6B6862]">
                                                {linkedItem ? (
                                                    <span>
                                                        <span className="font-mono text-[#1C1B19]">{linkedItem.sku || linkedItem.name}</span> (v{linkedVersion?.version || 1})
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-[11px] text-[#6B6862]">{v.variantVersionId}</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </DashboardLayout>
    );
}
