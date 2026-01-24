import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bomService } from '../../services/bomService';
import type { BOMVersion, BOM } from '../../types/bom';
import { ItemStatus } from '../../types/product';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertCircle, GitBranch, Settings } from 'lucide-react';
import { Role } from '../../types/auth';
import { ECOCreationModal } from '../../components/eco/ECOCreationModal';

export default function BOMPage() {
    const { token, user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const productId = searchParams.get('productId');

    const [bom, setBOM] = useState<BOM | null>(null);
    const [activeVersion, setActiveVersion] = useState<BOMVersion | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showECOModal, setShowECOModal] = useState(false);

    const canEdit = user?.role === Role.ENGINEERING_USER || user?.role === Role.ADMIN;

    useEffect(() => {
        const fetchBOM = async () => {
            if (!token) return;
            // If no productId, show selector or list (simplification: assume productId provided or show error)
            if (!productId) {
                // Try to fetch *some* BOM or list active products? 
                // For now, let's just err if no ID
                setError("Please select a product from the Products page to view its BOM.");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                // 1. Get BOM Container
                const { bom: bomData } = await bomService.getBOMByProductId(token, productId);
                setBOM(bomData);

                // 2. Get Active Version (Simplification: backend endpoint for active)
                try {
                    const { version } = await bomService.getActiveBOM(token, productId);
                    setActiveVersion(version);
                } catch (e) {
                    console.log("No active BOM version found", e);
                }

                setError(null);
            } catch (err: any) {
                setError(err.message || "Failed to load BOM");
            } finally {
                setLoading(false);
            }
        };

        fetchBOM();
    }, [token, productId]);

    const handleProposeChange = () => {
        setShowECOModal(true);
    };

    if (error) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-2xl font-bold">BOM Error</h2>
                    <p className="text-muted-foreground mt-2">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/products')}>
                        Back to Products
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Bill of Materials</h1>
                        <p className="text-muted-foreground">
                            {bom ? `BOM ID: ${bom.id}` : 'Loading...'}
                            {activeVersion && <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">v{activeVersion.version} Active</span>}
                        </p>
                    </div>
                    {canEdit && activeVersion?.status === ItemStatus.ACTIVE && (
                        <Button onClick={handleProposeChange}>
                            <GitBranch className="mr-2 h-4 w-4" /> Propose Change (ECO)
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div>Loading BOM structure...</div>
                ) : !activeVersion ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <p className="text-muted-foreground">No active BOM version found for this product.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Components</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Component</TableHead>
                                        <TableHead>Version</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Unit Cost</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Flattened for now, assuming Backend returns flat list of 'components' 
                                        If recursive, we use BOMTreeRow with root notes.
                                        Our type definition has 'components' as array.
                                        We will map them simply for now, or assume a tree structure if backend provided it.
                                        For this MVP, let's list them flat or 1-level for simplicity unless we have tree data.
                                    */}
                                    {activeVersion.components?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No components in this BOM.</TableCell>
                                        </TableRow>
                                    ) : (
                                        activeVersion.components?.map((comp: any) => (
                                            <TableRow key={comp.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center">
                                                        <Settings className="h-4 w-4 mr-2 text-gray-500" />
                                                        {comp.componentVersion?.product?.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>v{comp.componentVersion?.version}</TableCell>
                                                <TableCell>{comp.quantity}</TableCell>
                                                <TableCell>${comp.componentVersion?.costPrice}</TableCell>
                                                <TableCell className="font-bold">
                                                    ${(comp.quantity * (comp.componentVersion?.costPrice || 0)).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            <ECOCreationModal
                isOpen={showECOModal}
                onClose={() => setShowECOModal(false)}
                prefilledProductId={productId || undefined}
                prefilledBOMId={bom?.id}
                prefilledType="BOM"
            />
        </DashboardLayout>
    );
}
