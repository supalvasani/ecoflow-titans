import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ccrService } from '../../services/ccrService';
import { catalogItemService } from '../../services/catalogItemService';
import { variantSetService } from '../../services/variantSetService';
import { CCRType } from '../../types/ccr';
import type { CatalogItem } from '../../types/catalogItem';
import type { VariantSet } from '../../types/variantSet';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function CCRCreatePage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialType = (searchParams.get('type') as CCRType) || 'CATALOG_ITEM';
    const initialItemId = searchParams.get('catalogItemId') || '';
    const initialRollbackTarget = searchParams.get('rollbackTargetVersionId') || '';

    const [title, setTitle] = useState('');
    const [type, setType] = useState<CCRType>(initialType);
    const [selectedItemId, setSelectedItemId] = useState(initialItemId);
    const [selectedVariantSetId, setSelectedVariantSetId] = useState('');
    const [rollbackTargetVersionId, setRollbackTargetVersionId] = useState(initialRollbackTarget);
    const [effectiveDate, setEffectiveDate] = useState('');

    // Draft fields
    const [draftName, _setDraftName] = useState('');
    const [draftSalePrice, setDraftSalePrice] = useState('');
    const [draftCostPrice, setDraftCostPrice] = useState('');
    const [draftNotes, _setDraftNotes] = useState('');

    const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
    const [variantSets, setVariantSets] = useState<VariantSet[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        catalogItemService.getCatalogItems(token, true).then(res => {
            setCatalogItems(res.catalogItems || []);
        });
        variantSetService.getVariantSets(token, true).then(res => {
            setVariantSets(res.variantSets || []);
        });
    }, [token]);

    const selectedItem = catalogItems.find(i => i.id === selectedItemId);
    const archivedVersions = selectedItem?.versions?.filter(v => v.status === 'ARCHIVED') || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!title.trim()) {
            setError('Change request title is required.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const initialChanges: any = {};
            if (type === 'CATALOG_ITEM') {
                if (draftName.trim()) initialChanges.name = draftName.trim();
                if (draftSalePrice) initialChanges.salePrice = parseFloat(draftSalePrice);
                if (draftCostPrice) initialChanges.costPrice = parseFloat(draftCostPrice);
            } else if (type === 'VARIANT_SET') {
                if (draftNotes.trim()) initialChanges.notes = draftNotes.trim();
            }

            const res = await ccrService.createCCR(token, {
                title: title.trim(),
                type,
                catalogItemId: type === 'CATALOG_ITEM' || type === 'ROLLBACK' ? selectedItemId : undefined,
                variantSetId: type === 'VARIANT_SET' ? selectedVariantSetId : undefined,
                rollbackTargetVersionId: type === 'ROLLBACK' ? rollbackTargetVersionId : undefined,
                effectiveDate: effectiveDate || undefined,
                initialChanges: Object.keys(initialChanges).length > 0 ? initialChanges : undefined,
            });

            const createdId = res.ccr?.id;
            navigate(createdId ? `/ccrs/${createdId}` : '/ccrs');
        } catch (err: any) {
            setError(err.message || 'Failed to create change request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout
            title="Create Change Request"
            subtitle="Stage draft modifications, price adjustments, or version rollbacks into the governance workflow."
            action={
                <Link
                    to="/ccrs"
                    className="px-2.5 py-1.5 border border-[#DEDBD4] bg-white text-xs text-[#1C1B19] rounded hover:bg-[#F7F6F3] transition-colors"
                >
                    Cancel
                </Link>
            }
        >
            <div className="max-w-2xl">
                <div className="bg-white border border-[#DEDBD4] p-5 rounded">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-[#F9EBE8] border border-[#8C3B2E] text-[#8C3B2E] text-xs rounded">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                Change Request Title <span className="text-[#8C3B2E]">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Q4 Price Correction for Footwear Line"
                                required
                                className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Change Scope / Type
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as CCRType)}
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                >
                                    <option value="CATALOG_ITEM">Catalog Item (Price & Metadata)</option>
                                    <option value="VARIANT_SET">Variant Set & Channel Rules</option>
                                    <option value="ROLLBACK">Version Rollback</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Scheduled Effective Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Type Specific Fields */}
                        {(type === 'CATALOG_ITEM' || type === 'ROLLBACK') && (
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Target Catalog Item <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <select
                                    value={selectedItemId}
                                    onChange={(e) => setSelectedItemId(e.target.value)}
                                    required
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                >
                                    <option value="">Select Catalog Item...</option>
                                    {catalogItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.name} ({item.sku})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {type === 'VARIANT_SET' && (
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Target Variant Set <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <select
                                    value={selectedVariantSetId}
                                    onChange={(e) => setSelectedVariantSetId(e.target.value)}
                                    required
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                >
                                    <option value="">Select Variant Set...</option>
                                    {variantSets.map(set => {
                                        const i = set.catalogItem;
                                        return (
                                            <option key={set.id} value={set.id}>
                                                {i?.name} ({i?.sku}) — Set ID: {set.id.slice(0, 8)}...
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        {type === 'ROLLBACK' && (
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Archived Revision Target <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <select
                                    value={rollbackTargetVersionId}
                                    onChange={(e) => setRollbackTargetVersionId(e.target.value)}
                                    required
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none font-mono"
                                >
                                    <option value="">Select Archived Version to Restore...</option>
                                    {archivedVersions.map(ver => (
                                        <option key={ver.id} value={ver.id}>
                                            v{ver.version} (${parseFloat(String(ver.salePrice)).toFixed(2)}) — Created {new Date(ver.createdAt).toLocaleDateString()}
                                        </option>
                                    ))}
                                </select>
                                {selectedItemId && archivedVersions.length === 0 && (
                                    <p className="text-[11px] text-[#A67C2E] mt-1">
                                        Note: This item currently has no archived revisions to roll back to.
                                    </p>
                                )}
                            </div>
                        )}

                        {type === 'CATALOG_ITEM' && (
                            <div className="pt-2 border-t border-[#DEDBD4] space-y-3">
                                <h3 className="text-xs font-serif font-medium text-[#1C1B19]">
                                    Initial Draft Changes (Optional)
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] text-[#6B6862] mb-1">Draft Sale Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={draftSalePrice}
                                            onChange={(e) => setDraftSalePrice(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full text-xs font-mono px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-[#6B6862] mb-1">Draft Cost Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={draftCostPrice}
                                            onChange={(e) => setDraftCostPrice(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full text-xs font-mono px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t border-[#DEDBD4]">
                            <button
                                type="button"
                                onClick={() => navigate('/ccrs')}
                                className="px-3 py-1.5 border border-[#DEDBD4] text-xs text-[#1C1B19] rounded hover:bg-[#F7F6F3] transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-1.5 bg-[#2F4B3C] text-white text-xs font-medium rounded hover:bg-[#263D31] transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Creating Request...' : 'Create Draft CCR'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
