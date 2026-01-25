import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/productService';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Role } from '../../types/auth';

export default function ProductCreatePage() {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    // Permission check - only ENGINEERING_USER and ADMIN can create products
    if (user?.role !== Role.ADMIN && user?.role !== Role.ENGINEERING_USER) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-red-600">
                    You do not have permission to view this page.
                </div>
            </DashboardLayout>
        );
    }

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        salePrice: '',
        costPrice: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            await productService.createProduct(token, {
                name: formData.name,
                salePrice: parseFloat(formData.salePrice),
                costPrice: parseFloat(formData.costPrice)
            });

            navigate('/products');
        } catch (err: any) {
            console.error('Failed to create product:', err);
            setError(err.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/products')} className="-ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Create New Product</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Product Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g. EcoFlow Delta Pro 3"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="salePrice">Sale Price ($)</Label>
                                    <Input
                                        id="salePrice"
                                        name="salePrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.salePrice}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="costPrice">Cost Price ($)</Label>
                                    <Input
                                        id="costPrice"
                                        name="costPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Create Product
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
