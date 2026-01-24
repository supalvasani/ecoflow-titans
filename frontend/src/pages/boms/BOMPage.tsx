import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { bomService } from '../../services/bomService';
import type { BOM } from '../../types/bom';
import { ItemStatus } from '../../types/product';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Label } from '../../components/ui/label';
import { AlertCircle, Eye, Package } from 'lucide-react';

export default function BOMPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [boms, setBOMs] = useState<BOM[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [includeArchived, setIncludeArchived] = useState(false);

    const canSeeArchived = user?.role !== 'OPERATIONS_USER';

    const fetchBOMs = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await bomService.getBOMs(token, includeArchived);
            setBOMs(data.boms);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load BOMs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBOMs();
    }, [token, includeArchived]);

    // Get display info for a BOM
    const getBOMDisplayInfo = (bom: BOM) => {
        const activeVersion = bom.versions?.find(v => v.status === ItemStatus.ACTIVE);
        const latestVersion = bom.versions?.[0];
        const displayVersion = activeVersion || latestVersion;

        return {
            version: displayVersion?.version || '-',
            status: displayVersion?.status || ItemStatus.ACTIVE,
            componentCount: displayVersion?.components?.length || 0,
            operationCount: displayVersion?.operations?.length || 0,
        };
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Bills of Materials</h2>
                        <p className="text-muted-foreground">Manage product BOMs and manufacturing specifications</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>BOM Registry</CardTitle>
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
                                    <TableHead>Product</TableHead>
                                    <TableHead>BOM ID</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Components</TableHead>
                                    <TableHead>Operations</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : boms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            No BOMs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    boms.map((bom) => {
                                        const { version, status, componentCount, operationCount } = getBOMDisplayInfo(bom);
                                        return (
                                            <TableRow key={bom.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4 text-gray-500" />
                                                        {bom.product?.name || 'Unknown Product'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{bom.id.substring(0, 8)}...</TableCell>
                                                <TableCell>v{version}</TableCell>
                                                <TableCell>{componentCount}</TableCell>
                                                <TableCell>{operationCount}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status === ItemStatus.ACTIVE
                                                            ? 'bg-green-100 text-green-800 border-green-200'
                                                            : 'bg-gray-100 text-gray-800 border-gray-200'
                                                        }`}>
                                                        {status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/boms/${bom.id}`)}>
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
        </DashboardLayout>
    );
}
