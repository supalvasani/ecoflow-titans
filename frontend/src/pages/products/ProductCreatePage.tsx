import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/productService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export default function ProductCreatePage() {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) return;

        // Validation
        if (!name.trim()) {
            setError('Product name is required');
            return;
        }

        const salePriceNum = parseFloat(salePrice);
        const costPriceNum = parseFloat(costPrice);

        if (isNaN(salePriceNum) || salePriceNum <= 0) {
            setError('Sale price must be a positive number');
            return;
        }

        if (isNaN(costPriceNum) || costPriceNum <= 0) {
            setError('Cost price must be a positive number');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { product } = await productService.createProduct(token, {
                name: name.trim(),
                salePrice: salePriceNum,
                costPrice: costPriceNum,
            });

            // Navigate to the new product detail page
            navigate(`/products/${product.id}`);
        } catch (err: any) {
            setError(err.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/products')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Button>

                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Create New Product</h1>
                    <p className="text-muted-foreground mt-1">
                        Add a new product to your catalog. Version 1 will be created automatically.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Product Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center">
                                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Product Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Wooden Dining Table"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="salePrice">
                                        Sale Price ($) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="salePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="costPrice">
                                        Cost Price ($) <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="costPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            {salePrice && costPrice && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                <span className="font-semibold">Margin:</span>{' '}
                                                {((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(salePrice) * 100).toFixed(2)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate('/products')}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {loading ? 'Creating...' : 'Create Product'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
