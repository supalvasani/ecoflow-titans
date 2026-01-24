import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bomService } from '../services/bomService';
import { productService } from '../services/productService';
import type { BOM } from '../types/bom';
import { ItemStatus } from '../types/product';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Package, Eye, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export const OperationsDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [boms, setBOMs] = useState<BOM[]>([]);
    const [productNames, setProductNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchActiveBOMs = async () => {
            if (!token) return;

            try {
                setLoading(true);
                // Fetch all BOMs - we'll filter for active ones
                const response = await bomService.getBOMs(token, false);
                // Filter for BOMs with active versions
                const activeBOMs = response.boms.filter((bom: BOM) =>
                    bom.versions?.some(v => v.status === ItemStatus.ACTIVE)
                );
                setBOMs(activeBOMs);

                // Fetch product names for each BOM
                const names: Record<string, string> = {};
                for (const bom of activeBOMs) {
                    try {
                        const productData = await productService.getProductById(token, bom.productId);
                        names[bom.productId] = productData.product.name;
                    } catch {
                        names[bom.productId] = 'Unknown Product';
                    }
                }
                setProductNames(names);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load BOMs');
            } finally {
                setLoading(false);
            }
        };

        fetchActiveBOMs();
    }, [token]);

    const handleViewBOM = (productId: string) => {
        navigate(`/boms?productId=${productId}`);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Operations Dashboard</h2>
                    <p className="text-muted-foreground">
                        View active Bills of Materials for production planning
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active BOMs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{boms.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Components</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {boms.reduce((acc, bom) => {
                                    const activeVersion = bom.versions?.find(v => v.status === ItemStatus.ACTIVE);
                                    return acc + (activeVersion?.components?.length || 0);
                                }, 0)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold text-green-600">All Systems Active</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Active BOMs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Active Bills of Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading BOMs...</div>
                        ) : boms.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No active BOMs found
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>BOM ID</TableHead>
                                        <TableHead>Active Version</TableHead>
                                        <TableHead>Components</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {boms.map((bom) => {
                                        const activeVersion = bom.versions?.find(v => v.status === ItemStatus.ACTIVE);
                                        return (
                                            <TableRow key={bom.id}>
                                                <TableCell className="font-medium">
                                                    {productNames[bom.productId] || 'Loading...'}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {bom.id.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell>
                                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                                                        v{activeVersion?.version || 'N/A'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {activeVersion?.components?.length || 0}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewBOM(bom.productId)}
                                                    >
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};
