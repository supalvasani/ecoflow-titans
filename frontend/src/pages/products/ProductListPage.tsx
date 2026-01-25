import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/productService';
import { ItemStatus, type Product } from '../../types/product';
import { Role } from '../../types/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
// import { Switch } from '../../components/ui/switch'; // Removed unused import
import { Label } from '../../components/ui/label';
import { AlertCircle, Plus, Eye, FileEdit, Circle, CircleDot } from 'lucide-react';
import { getStatusBadgeClass } from '../../utils/badgeUtils';

import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ECOCreationModal } from '../../components/eco/ECOCreationModal';

export default function ProductListPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [includeArchived, setIncludeArchived] = useState(false);
    const [showECOModal, setShowECOModal] = useState(false);

    const isOperations = user?.role === Role.OPERATIONS_USER;
    const canCreate = user?.role === Role.ADMIN || user?.role === Role.ENGINEERING_USER; // Engineers and Admins can create products
    const canSeeArchived = !isOperations;

    const fetchProducts = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await productService.getProducts(token, includeArchived);
            setProducts(data.products);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [token, includeArchived]);

    // Derived state helper to find active version details for display
    const getProductDisplayInfo = (product: Product) => {
        // If operations, we only get Active products with Active versions filtered by backend
        // Use the first version as it should be the active one (backend sorts desc)
        const relevantVersion = product.versions?.[0];

        return {
            version: relevantVersion?.version || '-',
            price: relevantVersion?.salePrice || '-',
            status: relevantVersion?.status || ItemStatus.ACTIVE, // Fallback
        };
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
                        <p className="text-muted-foreground">Manage your product catalog and versions</p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowECOModal(true)}>
                                <FileEdit className="mr-2 h-4 w-4" /> New ECO
                            </Button>
                            <Button onClick={() => navigate('/products/new')}>
                                <Plus className="mr-2 h-4 w-4" /> Create Product
                            </Button>
                        </div>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Product Catalog</CardTitle>
                            {canSeeArchived && (
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="archived"
                                        checked={includeArchived}
                                        onChange={(e) => setIncludeArchived(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="archived">Include Archived Versions</Label>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                {error}
                            </div>
                        )}

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Sale Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No products found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => {
                                        const { version, price, status } = getProductDisplayInfo(product);
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {status === ItemStatus.ACTIVE ? (
                                                            <CircleDot className="h-3 w-3 text-green-600" />
                                                        ) : (
                                                            <Circle className="h-3 w-3 text-gray-400" />
                                                        )}
                                                        {product.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>v{version}</TableCell>
                                                <TableCell>${price}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(status)}`}>
                                                        {status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${product.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2" /> View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <ECOCreationModal
                isOpen={showECOModal}
                onClose={() => setShowECOModal(false)}
            />
        </DashboardLayout>
    );
}
