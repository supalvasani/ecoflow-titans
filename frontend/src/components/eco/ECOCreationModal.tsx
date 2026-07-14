import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ecoService } from '../../services/ecoService';
import { productService } from '../../services/productService';
import { bomService } from '../../services/bomService';
import type { Product, ProductVersion } from '../../types/product';
import type { BOM, BOMVersion } from '../../types/bom';
import type { ECOType } from '../../types/eco';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { X, Loader2 } from 'lucide-react';

interface ECOCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    prefilledProductId?: string;
    prefilledBOMId?: string;
    prefilledType?: ECOType;
}

export function ECOCreationModal({
    isOpen,
    onClose,
    prefilledProductId,
    prefilledBOMId,
    prefilledType
}: ECOCreationModalProps) {
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const [title, setTitle] = useState('');
    const [ecoType, setEcoType] = useState<ECOType>(prefilledType || 'PRODUCT');
    const [selectedProductId, setSelectedProductId] = useState(prefilledProductId || '');
    const [selectedBOMId, setSelectedBOMId] = useState(prefilledBOMId || '');
    const [proposedName, setProposedName] = useState('');
    const [proposedSalePrice, setProposedSalePrice] = useState('');
    const [proposedCostPrice, setProposedCostPrice] = useState('');
    const [effectiveDate, setEffectiveDate] = useState('');
    const [versionUpdate, setVersionUpdate] = useState(true);

    const [products, setProducts] = useState<Product[]>([]);
    const [boms, setBOMs] = useState<BOM[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch products and BOMs
    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const [productsData, bomsData] = await Promise.all([
                productService.getProducts(token),
                bomService.getBOMs(token)
            ]);

            // Filter only active products
            const activeProducts = productsData.products.filter((p: Product) =>
                p.versions?.some((v: ProductVersion) => v.status === 'ACTIVE')
            );
            setProducts(activeProducts);

            // Filter only active BOMs
            const activeBOMs = bomsData.boms.filter((b: BOM) =>
                b.versions?.some((v: BOMVersion) => v.status === 'ACTIVE')
            );
            setBOMs(activeBOMs);
        } catch (err) {
            setError('Failed to load products and BOMs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter BOMs based on selected product
    const filteredBOMs = selectedProductId
        ? boms.filter(b => b.productId === selectedProductId)
        : boms;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Not authenticated');
            return;
        }

        // Validation
        if (!title || title.length < 3) {
            setError('Title must be at least 3 characters');
            return;
        }

        if (!selectedProductId) {
            setError('Please select a product');
            return;
        }

        if (ecoType === 'BOM' && !selectedBOMId) {
            setError('Please select a BOM for BOM type ECO');
            return;
        }

        if (effectiveDate) {
            const selectedDate = new Date(effectiveDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                setError('Effective date must be in the future');
                return;
            }
        }

        setSubmitting(true);

        try {
            let ecoId: string;

            if (ecoType === 'PRODUCT') {
                const res = await ecoService.createECO(token, {
                    title,
                    type: 'PRODUCT',
                    productId: selectedProductId,
                    initialChanges: {
                        name: proposedName,
                        salePrice: proposedSalePrice ? parseFloat(proposedSalePrice) : undefined,
                        costPrice: proposedCostPrice ? parseFloat(proposedCostPrice) : undefined,
                    }
                });
                ecoId = res.eco.id;
            } else {
                ecoId = await ecoService.createBOMECO(token, selectedBOMId, title);
            }

            // Navigate to ECO detail page
            navigate(`/ecos/${ecoId}`);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create ECO');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setTitle('');
            setEcoType('PRODUCT');
            setSelectedProductId('');
            setSelectedBOMId('');
            setEffectiveDate('');
            setVersionUpdate(true);
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Create Engineering Change Order</CardTitle>
                            <CardDescription>
                                Propose changes to products or bills of materials
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">
                                Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Update wooden table finish"
                                required
                                minLength={3}
                                maxLength={100}
                                disabled={submitting}
                            />
                        </div>

                        {/* ECO Type */}
                        <div className="space-y-2">
                            <Label htmlFor="ecoType">
                                ECO Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="ecoType"
                                value={ecoType}
                                onChange={(e) => {
                                    setEcoType(e.target.value as ECOType);
                                    setSelectedBOMId(''); // Reset BOM selection
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={submitting || !!prefilledType}
                                required
                            >
                                <option value="PRODUCT">Product Change</option>
                                <option value="BOM">BOM Change</option>
                            </select>
                            <p className="text-sm text-gray-500">
                                {ecoType === 'PRODUCT'
                                    ? 'For product name, price, or attachment changes'
                                    : 'For component quantity or operation changes'
                                }
                            </p>
                        </div>

                        {/* Product */}
                        <div className="space-y-2">
                            <Label htmlFor="product">
                                Product <span className="text-red-500">*</span>
                            </Label>
                            {loading ? (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading products...
                                </div>
                            ) : (
                                <select
                                    id="product"
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setSelectedProductId(pid);
                                        setSelectedBOMId('');
                                        const p = products.find(prod => prod.id === pid);
                                        if (p) {
                                            const activeVer = p.versions?.find(v => v.status === 'ACTIVE' || v.isCurrent);
                                            setProposedName(p.name || '');
                                            setProposedSalePrice(activeVer?.salePrice ? String(activeVer.salePrice) : '');
                                            setProposedCostPrice(activeVer?.costPrice ? String(activeVer.costPrice) : '');
                                        } else {
                                            setProposedName('');
                                            setProposedSalePrice('');
                                            setProposedCostPrice('');
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={submitting || !!prefilledProductId}
                                    required
                                >
                                    <option value="">Select a product...</option>
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Proposed Product Changes Section */}
                        {ecoType === 'PRODUCT' && selectedProductId && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md space-y-3">
                                <h4 className="font-semibold text-sm text-blue-900">Proposed Product Changes</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="proposedName" className="text-xs">Proposed Name</Label>
                                    <Input
                                        id="proposedName"
                                        value={proposedName}
                                        onChange={(e) => setProposedName(e.target.value)}
                                        placeholder="Enter proposed product name..."
                                        disabled={submitting}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="proposedSalePrice" className="text-xs">Proposed Sale Price ($)</Label>
                                        <Input
                                            id="proposedSalePrice"
                                            type="number"
                                            step="0.01"
                                            value={proposedSalePrice}
                                            onChange={(e) => setProposedSalePrice(e.target.value)}
                                            placeholder="0.00"
                                            disabled={submitting}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="proposedCostPrice" className="text-xs">Proposed Cost Price ($)</Label>
                                        <Input
                                            id="proposedCostPrice"
                                            type="number"
                                            step="0.01"
                                            value={proposedCostPrice}
                                            onChange={(e) => setProposedCostPrice(e.target.value)}
                                            placeholder="0.00"
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BOM (only for BOM type) */}
                        {ecoType === 'BOM' && (
                            <div className="space-y-2">
                                <Label htmlFor="bom">
                                    Bill of Materials <span className="text-red-500">*</span>
                                </Label>
                                {loading ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Loading BOMs...
                                    </div>
                                ) : (
                                    <select
                                        id="bom"
                                        value={selectedBOMId}
                                        onChange={(e) => setSelectedBOMId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={submitting || !selectedProductId || !!prefilledBOMId}
                                        required={ecoType === 'BOM'}
                                    >
                                        <option value="">Select a BOM...</option>
                                        {filteredBOMs.map((bom) => {
                                            const product = products.find(p => p.id === bom.productId);
                                            const currentVersion = bom.versions?.find(v => v.isCurrent);
                                            return (
                                                <option key={bom.id} value={bom.id}>
                                                    {product?.name} - Version {currentVersion?.version || 'N/A'}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                                {!selectedProductId && (
                                    <p className="text-sm text-gray-500">
                                        Please select a product first
                                    </p>
                                )}
                            </div>
                        )}

                        {/* User (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="user">Created By</Label>
                            <Input
                                id="user"
                                value={user?.name || user?.email || 'Current User'}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>

                        {/* Effective Date */}
                        <div className="space-y-2">
                            <Label htmlFor="effectiveDate">
                                Effective Date (Optional)
                            </Label>
                            <Input
                                id="effectiveDate"
                                type="date"
                                value={effectiveDate}
                                onChange={(e) => setEffectiveDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                disabled={submitting}
                            />
                            <p className="text-sm text-gray-500">
                                Leave empty to apply immediately after approval
                            </p>
                        </div>

                        {/* Version Update */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="versionUpdate"
                                checked={versionUpdate}
                                onChange={(e) => setVersionUpdate(e.target.checked)}
                                disabled={submitting}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <Label htmlFor="versionUpdate" className="font-normal cursor-pointer">
                                Create new version when applied
                            </Label>
                        </div>
                        <p className="text-sm text-gray-500 ml-6">
                            {versionUpdate
                                ? 'A new version will be created and the old version will be archived'
                                : 'Changes will be applied to the current version'
                            }
                        </p>

                        {/* Stage (read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="stage">Initial Stage</Label>
                            <Input
                                id="stage"
                                value="New"
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create ECO'
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
