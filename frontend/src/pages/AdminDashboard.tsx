import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ecoService } from '../services/ecoService';
import { bomService } from '../services/bomService';
import { productService } from '../services/productService';
import type { ECO } from '../types/eco';
import type { BOM } from '../types/bom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart3, FileText, Package, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export const AdminDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [ecos, setECOs] = useState<ECO[]>([]);
    const [boms, setBOMs] = useState<BOM[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!token) return;

            try {

                // Fetch all data
                const [ecoData, bomData, productData] = await Promise.all([
                    ecoService.getECOs(token),
                    bomService.getBOMs(token, true),
                    productService.getProducts(token, true)
                ]);

                setECOs(ecoData.ecos);
                setBOMs(bomData.boms);
                setProducts(productData.products);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load dashboard data');
            }
        };

        fetchDashboardData();
    }, [token]);

    // Calculate metrics
    const totalECOs = ecos.length;
    const draftECOs = ecos.filter(e => e.stage.name.toUpperCase() === 'DRAFT' || e.stage.name.toUpperCase() === 'WIP').length;
    const pendingReviewECOs = ecos.filter(e => e.stage.name.toUpperCase() === 'PENDING_REVIEW').length;
    const approvedECOs = ecos.filter(e => e.stage.name.toUpperCase() === 'APPROVED').length;
    const rejectedECOs = ecos.filter(e => e.stage.name.toUpperCase() === 'REJECTED').length;
    const appliedECOs = ecos.filter(e => e.stage.name.toUpperCase() === 'APPLIED').length;

    const totalProducts = products.length;
    const activeProducts = products.filter(p => p.status === 'ACTIVE').length;
    const totalBOMs = boms.length;

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h2>
                    <p className="text-muted-foreground">
                        System-wide analytics and management overview
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* System Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Total ECOs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalECOs}</div>
                            <p className="text-xs text-muted-foreground mt-1">All change orders</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeProducts}</div>
                            <p className="text-xs text-muted-foreground mt-1">{totalProducts} total ({totalProducts - activeProducts} archived)</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                BOMs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalBOMs}</div>
                            <p className="text-xs text-muted-foreground mt-1">Bills of materials</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Pending Review
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-600">{pendingReviewECOs}</div>
                            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
                        </CardContent>
                    </Card>
                </div>

                {/* ECO Status Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            ECO Status Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Draft</span>
                                    <FileText className="h-4 w-4 text-yellow-600" />
                                </div>
                                <div className="text-2xl font-bold">{draftECOs}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalECOs > 0 ? Math.round((draftECOs / totalECOs) * 100) : 0}%
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                                    <AlertCircle className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="text-2xl font-bold">{pendingReviewECOs}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalECOs > 0 ? Math.round((pendingReviewECOs / totalECOs) * 100) : 0}%
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Approved</span>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="text-2xl font-bold">{approvedECOs}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalECOs > 0 ? Math.round((approvedECOs / totalECOs) * 100) : 0}%
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Rejected</span>
                                    <XCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="text-2xl font-bold">{rejectedECOs}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalECOs > 0 ? Math.round((rejectedECOs / totalECOs) * 100) : 0}%
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-muted-foreground">Applied</span>
                                    <CheckCircle className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="text-2xl font-bold">{appliedECOs}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {totalECOs > 0 ? Math.round((appliedECOs / totalECOs) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/ecos')}>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Manage ECOs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                View and manage all engineering change orders
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/products')}>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Manage Products
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                View and manage product catalog
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/settings')}>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-5 w-5" />
                                System Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Configure ECO workflows and approval rules
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};
