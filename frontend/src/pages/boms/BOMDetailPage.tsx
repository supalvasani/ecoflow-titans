import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bomService } from '../../services/bomService';
import { productService } from '../../services/productService';
import type { BOM, BOMVersion, BOMComponent, BOMOperation } from '../../types/bom';
import type { Product } from '../../types/product';
import { ItemStatus } from '../../types/product';
import { Role } from '../../types/auth';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ArrowLeft, GitBranch, Settings, Clock, Package } from 'lucide-react';
import { ECOCreationModal } from '../../components/eco/ECOCreationModal';

export default function BOMDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [bom, setBOM] = useState<BOM | null>(null);
    const [product, setProduct] = useState<Product | null>(null);
    const [selectedVersion, setSelectedVersion] = useState<BOMVersion | null>(null);
    const [versions, setVersions] = useState<BOMVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showECOModal, setShowECOModal] = useState(false);

    const canEdit = user?.role === Role.ENGINEERING_USER || user?.role === Role.ADMIN;

    useEffect(() => {
        fetchBOMData();
    }, [token, id]);

    const fetchBOMData = async () => {
        if (!token || !id) return;

        try {
            setLoading(true);

            console.log('Fetching BOM with ID:', id);

            // Fetch BOM by ID using the service
            const { bom: bomData } = await bomService.getBOMById(token, id);
            console.log('BOM data received:', bomData);
            setBOM(bomData);

            // Fetch product details
            const { product: productData } = await productService.getProductById(token, bomData.productId);
            setProduct(productData);

            // Set versions
            if (bomData.versions && bomData.versions.length > 0) {
                setVersions(bomData.versions);
                // Find active version
                const activeVersion = bomData.versions.find((v: BOMVersion) => v.status === ItemStatus.ACTIVE);

                if (activeVersion) {
                    try {
                        // Fetch full version structure
                        const { version } = await bomService.getBOMStructure(token, activeVersion.id);
                        console.log('Active version details:', version);
                        setSelectedVersion(version);
                    } catch (verErr) {
                        console.error('Failed to fetch active version details:', verErr);
                        // Fallback to basic version info if detailed fetch fails
                        setSelectedVersion(activeVersion);
                    }
                } else {
                    // No active version, select the first one or none
                    console.log('No active version found');
                    if (bomData.versions.length > 0) {
                        setSelectedVersion(bomData.versions[0]);
                    }
                }
            } else {
                console.log('No versions found for BOM');
            }

            setError(null);
        } catch (err: any) {
            console.error('Error fetching BOM data:', err);
            setError(err.message || 'Failed to load BOM details');
        } finally {
            setLoading(false);
        }
    };

    const handleVersionChange = async (versionId: string) => {
        if (!token) return;
        try {
            setLoading(true);
            const { version } = await bomService.getBOMStructure(token, versionId);
            setSelectedVersion(version);
        } catch (err: any) {
            setError(err.message || 'Failed to load BOM version');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalCost = () => {
        if (!selectedVersion?.components || !Array.isArray(selectedVersion.components)) return 0;
        return selectedVersion.components.reduce((total, comp) => {
            const cost = Number(comp?.componentVersion?.costPrice ?? 0);
            const qty = Number(comp?.quantity ?? 0);
            return total + (qty * cost);
        }, 0);
    };

    const calculateTotalTime = () => {
        if (!selectedVersion?.operations || !Array.isArray(selectedVersion.operations)) return 0;
        return selectedVersion.operations.reduce((total, op) => total + (op?.timeMinutes ?? 0), 0);
    };

    if (loading && !bom) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading BOM details...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (error || !bom || !product) {
        return (
            <DashboardLayout>
                <div className="max-w-7xl mx-auto space-y-6">
                    <Button variant="ghost" onClick={() => navigate('/boms')} className="-ml-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to BOMs
                    </Button>
                    <Card className="border-red-200">
                        <CardContent className="py-10 text-center">
                            <p className="text-red-600 font-semibold mb-2">{error || 'BOM not found'}</p>
                            {!bom && <p className="text-sm text-gray-600">Could not load BOM data</p>}
                            {bom && !product && <p className="text-sm text-gray-600">Could not load product data</p>}
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <Button variant="ghost" onClick={() => navigate('/boms')} className="-ml-4 mb-2">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to BOMs
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Bill of Materials</h1>
                        <p className="text-muted-foreground mt-1">
                            Product: <span className="font-medium">{product.name}</span>
                        </p>
                    </div>
                    {canEdit && selectedVersion?.status === ItemStatus.ACTIVE && (
                        <Button onClick={() => setShowECOModal(true)}>
                            <GitBranch className="mr-2 h-4 w-4" /> Propose Change
                        </Button>
                    )}
                </div>

                {/* Version Selector & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm">BOM Version</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <select
                                value={selectedVersion?.id || ''}
                                onChange={(e) => handleVersionChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={loading}
                            >
                                {versions.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        v{v.version} {v.status === ItemStatus.ACTIVE ? '(Active)' : '(Archived)'}
                                    </option>
                                ))}
                            </select>
                            {selectedVersion && (
                                <div className="mt-2">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedVersion.status === ItemStatus.ACTIVE
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedVersion.status}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                                <Package className="mr-2 h-4 w-4" />
                                Components
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {selectedVersion?.components?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">Total components</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm flex items-center">
                                <Clock className="mr-2 h-4 w-4" />
                                Operations
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {selectedVersion?.operations?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground">{calculateTotalTime()} minutes total</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Total Cost</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                ${calculateTotalCost().toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">Material cost</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Components Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedVersion?.components || selectedVersion.components.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No components in this BOM version
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Component</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.isArray(selectedVersion.components) && selectedVersion.components.map((comp: BOMComponent) => (
                                        <TableRow key={comp.id || Math.random().toString()}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <Settings className="h-4 w-4 mr-2 text-gray-500" />
                                                    Component v{comp?.componentVersion?.version ?? '?'}
                                                </div>
                                            </TableCell>
                                            <TableCell>v{comp?.componentVersion?.version ?? '?'}</TableCell>
                                            <TableCell>{comp?.quantity ?? 0}</TableCell>
                                            <TableCell>${Number(comp?.componentVersion?.costPrice ?? 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold">
                                                ${(Number(comp?.quantity ?? 0) * Number(comp?.componentVersion?.costPrice ?? 0)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell colSpan={4} className="text-right">Total Material Cost:</TableCell>
                                        <TableCell className="text-right">${calculateTotalCost().toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Operations Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Operations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedVersion?.operations || selectedVersion.operations.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No operations defined for this BOM version
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Operation Name</TableHead>
                                        <TableHead>Time (minutes)</TableHead>
                                        <TableHead>Work Center</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.isArray(selectedVersion.operations) && selectedVersion.operations.map((op: BOMOperation) => (
                                        <TableRow key={op.id || Math.random().toString()}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                                    {op?.name ?? 'Unknown'}
                                                </div>
                                            </TableCell>
                                            <TableCell>{op?.timeMinutes ?? 0}</TableCell>
                                            <TableCell>{op?.workCenter ?? 'N/A'}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/50 font-bold">
                                        <TableCell>Total Time:</TableCell>
                                        <TableCell>{calculateTotalTime()} minutes</TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ECOCreationModal
                isOpen={showECOModal}
                onClose={() => setShowECOModal(false)}
                prefilledProductId={product.id}
                prefilledBOMId={bom.id}
                prefilledType="BOM"
            />
        </DashboardLayout>
    );
}
