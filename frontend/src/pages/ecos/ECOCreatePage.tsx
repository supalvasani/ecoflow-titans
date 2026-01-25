import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ecoService } from '../../services/ecoService';
import { productService } from '../../services/productService';
import { bomService } from '../../services/bomService';
import { apiService } from '../../services/api';
import { ECOType } from '../../types/eco';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import type { Product } from '../../types/product';
import type { BOM } from '../../types/bom';
import type { User } from '../../types/auth';

export default function ECOCreatePage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data Sources
    const [products, setProducts] = useState<Product[]>([]);
    const [boms, setBoms] = useState<BOM[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Form State
    const [formData, setFormData] = useState<{
        title: string;
        type: ECOType;
        productId: string;
        bomId: string;
        assigneeId: string;
        effectiveDate: string;
        versionUpdate: boolean;
        stage: string;
    }>({
        title: '',
        type: ECOType.PRODUCT,
        productId: '',
        bomId: '',
        assigneeId: '',
        effectiveDate: '',
        versionUpdate: true,
        stage: 'New'
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setLoading(true);
            try {
                // Fetch basic data
                const [productsData, bomsData, usersData] = await Promise.all([
                    productService.getProducts(token),
                    bomService.getBOMs(token),
                    apiService.getUsers(token)
                ]);

                setProducts(productsData.products);
                setBoms(bomsData.boms);
                setUsers(usersData.users);
            } catch (err: any) {
                setError(err.message || 'Failed to load form data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;
        setSubmitting(true);
        setError(null);

        try {
            // Validation
            if (!formData.title) throw new Error('Title is required');
            if (formData.type === ECOType.PRODUCT && !formData.productId) {
                throw new Error('Product is required for Product ECO');
            }
            if ((formData.type === ECOType.BOM || formData.type === ECOType.BOM_CHANGE) && !formData.bomId) {
                throw new Error('BOM is required');
            }

            // Prepare Payload
            const payload: any = {
                title: formData.title,
                type: formData.type,
                effectiveDate: formData.effectiveDate || undefined,
                versionUpdate: formData.versionUpdate,
                assigneeId: formData.assigneeId || undefined
            };

            if (formData.type === ECOType.PRODUCT) {
                payload.productId = formData.productId;
            } else {
                payload.bomId = formData.bomId;
            }

            await ecoService.createECO(token, payload);
            navigate('/ecos');
        } catch (err: any) {
            setError(err.message || 'Failed to create ECO');
        } finally {
            setSubmitting(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex justify-center items-center h-screen">Loading...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/ecos')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Create New ECO</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>ECO Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-destructive/15 text-destructive p-4 rounded-md">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                    placeholder="Enter ECO title"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">ECO Type</Label>
                                    <select
                                        id="type"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={formData.type}
                                        onChange={(e) => handleChange('type', e.target.value)}
                                    >
                                        <option value={ECOType.PRODUCT}>Product</option>
                                        <option value={ECOType.BOM}>BOM</option>
                                        <option value={ECOType.BOM_CHANGE}>BOM Changes</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="stage">Stage</Label>
                                    <Input id="stage" value={formData.stage} readOnly className="bg-muted" />
                                </div>
                            </div>

                            {/* Conditional Fields based on Type */}
                            {formData.type === ECOType.PRODUCT ? (
                                <div className="space-y-2">
                                    <Label htmlFor="product">Product <span className="text-destructive">*</span></Label>
                                    <select
                                        id="product"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={formData.productId}
                                        onChange={(e) => handleChange('productId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Product...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="bom">BOM <span className="text-destructive">*</span></Label>
                                    <select
                                        id="bom"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={formData.bomId}
                                        onChange={(e) => handleChange('bomId', e.target.value)}
                                        required
                                    >
                                        <option value="">Select BOM...</option>
                                        {boms.map(b => {
                                            const product = products.find(p => p.id === b.productId);
                                            return (
                                                <option key={b.id} value={b.id}>
                                                    {product ? `${product.name} BOM` : `BOM ${b.id.substring(0, 8)}`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="assignee">BOM User / Assignee</Label>
                                    <select
                                        id="assignee"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={formData.assigneeId}
                                        onChange={(e) => handleChange('assigneeId', e.target.value)}
                                    >
                                        <option value="">Select User...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="effectiveDate">Effective Date</Label>
                                    <Input
                                        id="effectiveDate"
                                        type="date"
                                        value={formData.effectiveDate}
                                        onChange={(e) => handleChange('effectiveDate', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="versionUpdate"
                                    className="h-4 w-4 rounded border-gray-300"
                                    checked={formData.versionUpdate}
                                    onChange={(e) => handleChange('versionUpdate', e.target.checked)}
                                />
                                <Label htmlFor="versionUpdate">Version Update (Create New Version)</Label>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Creating...' : <><Save className="h-4 w-4 mr-2" /> Create ECO</>}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
