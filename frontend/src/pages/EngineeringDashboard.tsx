import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ecoService } from '../services/ecoService';
import { bomService } from '../services/bomService';
import type { ECO } from '../types/eco';
import type { BOM } from '../types/bom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { FileText, Package, Eye, AlertCircle, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ECOCreationModal } from '../components/eco/ECOCreationModal';

export const EngineeringDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [ecos, setECOs] = useState<ECO[]>([]);
    const [boms, setBOMs] = useState<BOM[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showECOModal, setShowECOModal] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!token) return;

            try {
                setLoading(true);
                // Fetch ECOs
                const ecoData = await ecoService.getECOs(token);
                setECOs(ecoData.ecos.slice(0, 5)); // Show latest 5

                // Fetch BOMs
                const bomData = await bomService.getBOMs(token, true); // Include archived
                setBOMs(bomData.boms.slice(0, 5)); // Show latest 5

                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [token]);

    const getECOStageBadge = (stage: string) => {
        const stageUpper = stage.toUpperCase();
        if (stageUpper === 'DRAFT' || stageUpper === 'WIP') return 'bg-amber-100 text-amber-800';
        if (stageUpper === 'PENDING_REVIEW') return 'bg-blue-100 text-blue-800';
        if (stageUpper === 'APPROVED') return 'bg-emerald-100 text-emerald-800';
        if (stageUpper === 'REJECTED') return 'bg-red-100 text-red-800';
        if (stageUpper === 'APPLIED') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-2">Engineering Dashboard</h2>
                        <p className="text-muted-foreground">
                            Manage Engineering Change Orders and Bills of Materials
                        </p>
                    </div>
                    <Button onClick={() => setShowECOModal(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create ECO
                    </Button>
                </div>

                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total ECOs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{ecos.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Draft ECOs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {ecos.filter(e => e.stage.name.toUpperCase() === 'DRAFT' || e.stage.name.toUpperCase() === 'WIP').length}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total BOMs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{boms.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {ecos.filter(e => e.stage.name.toUpperCase() === 'PENDING_REVIEW').length}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent ECOs */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Recent Engineering Change Orders
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/ecos')}>
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading ECOs...</div>
                        ) : ecos.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No ECOs found. Create your first ECO to get started.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Stage</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ecos.map((eco) => (
                                        <TableRow key={eco.id}>
                                            <TableCell className="font-medium">{eco.title}</TableCell>
                                            <TableCell>{eco.type}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getECOStageBadge(eco.stage.name)}`}>
                                                    {eco.stage.name}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(eco.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/ecos/${eco.id}`)}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Recent BOMs */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Bills of Materials
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => navigate('/boms')}>
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading BOMs...</div>
                        ) : boms.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No BOMs found
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                {boms.length} BOM(s) available. Click "View All" to see details.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ECOCreationModal
                isOpen={showECOModal}
                onClose={() => setShowECOModal(false)}
            />
        </DashboardLayout>
    );
};
