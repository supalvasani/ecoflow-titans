import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { catalogItemService } from '../../services/catalogItemService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function ProductCreatePage() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        if (!name.trim()) {
            setError('Item name is required.');
            return;
        }

        if (!sku.trim()) {
            setError('SKU code is required.');
            return;
        }

        const sale = parseFloat(salePrice);
        const cost = parseFloat(costPrice);

        if (isNaN(sale) || sale < 0) {
            setError('Sale price must be a valid positive number.');
            return;
        }

        if (isNaN(cost) || cost < 0) {
            setError('Cost price must be a valid positive number.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const res = await catalogItemService.createCatalogItem(token, {
                name: name.trim(),
                sku: sku.trim().toUpperCase(),
                brand: brand.trim() || undefined,
                category: category.trim() || undefined,
                salePrice: sale,
                costPrice: cost,
                currency,
            });

            const createdId = res.catalogItem?.id;
            navigate(createdId ? `/products/${createdId}` : '/products');
        } catch (err: any) {
            setError(err.message || 'Failed to create catalog item.');
        } finally {
            setLoading(false);
        }
    };

    const marginPercent = useMemoMargin(salePrice, costPrice);

    return (
        <DashboardLayout
            title="Create Catalog Item"
            subtitle="Register a new master SKU definition. Initial revision v1 will be generated automatically."
            action={
                <Link
                    to="/products"
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
                                Item Name <span className="text-[#8C3B2E]">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Velo Runner Pro 2"
                                required
                                className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    SKU Code <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    placeholder="e.g. VRP-002"
                                    required
                                    className="w-full text-xs font-mono px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Brand
                                </label>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    placeholder="e.g. Velo"
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g. Footwear"
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#DEDBD4]">
                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Sale Price <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full text-xs font-mono px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Base Cost Price <span className="text-[#8C3B2E]">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={costPrice}
                                    onChange={(e) => setCostPrice(e.target.value)}
                                    placeholder="0.00"
                                    required
                                    className="w-full text-xs font-mono px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none focus:border-[#2F4B3C]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1C1B19] mb-1">
                                    Currency
                                </label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full text-xs px-3 py-2 bg-[#F7F6F3] border border-[#DEDBD4] rounded text-[#1C1B19] focus:bg-white focus:outline-none"
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="JPY">JPY (¥)</option>
                                </select>
                            </div>
                        </div>

                        {marginPercent !== null && (
                            <div className="text-xs text-[#6B6862] bg-[#F7F6F3] p-2.5 rounded border border-[#DEDBD4]">
                                Projected Gross Margin: <span className="font-mono font-medium text-[#1C1B19]">{marginPercent}%</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-[#DEDBD4]">
                            <button
                                type="button"
                                onClick={() => navigate('/products')}
                                className="px-3 py-1.5 border border-[#DEDBD4] text-xs text-[#1C1B19] rounded hover:bg-[#F7F6F3] transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-1.5 bg-[#2F4B3C] text-white text-xs font-medium rounded hover:bg-[#263D31] transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Registering SKU...' : 'Create Item'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}

function useMemoMargin(sale: string, cost: string): string | null {
    const s = parseFloat(sale);
    const c = parseFloat(cost);
    if (isNaN(s) || isNaN(c) || s <= 0) return null;
    return (((s - c) / s) * 100).toFixed(1);
}
