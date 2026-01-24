import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ecoService } from '../../services/ecoService';
import type { ECO } from '../../types/eco';
import { ECOType } from '../../types/eco';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AlertCircle, Eye, FileText, Filter, Package } from 'lucide-react';
import { Role } from '../../types/auth';
import { getStageBadgeClass, getTypeBadgeClass } from '../../utils/badgeUtils';

export default function ECOListPage() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [ecos, setEcos] = useState<ECO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<ECOType | 'ALL'>('ALL');

    const fetchECOs = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const filters: { type?: ECOType } = {};
            if (filterType !== 'ALL') filters.type = filterType;

            const data = await ecoService.getECOs(token, filters);

            // Filter out drafts for approvers - they should only see submitted ECOs
            let filteredECOs = data.ecos;
            if (user?.role === Role.APPROVER) {
                filteredECOs = data.ecos.filter(eco => {
                    const stage = eco.stage.name.toUpperCase();
                    return stage !== 'DRAFT' && stage !== 'WIP';
                });
            }

            setEcos(filteredECOs);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load ECOs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchECOs();
    }, [token, filterType, user?.role]);

    // Removed - now using utility function

    if (user?.role === Role.OPERATIONS_USER) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-2xl font-bold">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">Operations users do not have access to Engineering Change Orders.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Engineering Change Orders</h2>
                        <p className="text-muted-foreground">Manage change requests and approvals</p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>ECO Registry</CardTitle>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <select
                                        className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value as ECOType | 'ALL')}
                                    >
                                        <option value="ALL">All Types</option>
                                        <option value={ECOType.PRODUCT}>Product ECOs</option>
                                        <option value={ECOType.BOM}>BOM ECOs</option>
                                    </select>
                                </div>
                            </div>
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
                                    <TableHead>ECO ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Created By</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : ecos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            No ECOs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    ecos.map((eco) => (
                                        <TableRow key={eco.id}>
                                            <TableCell className="font-mono text-xs">{eco.id.substring(0, 8)}...</TableCell>
                                            <TableCell className="font-medium">{eco.title}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getTypeBadgeClass(eco.type)}`}>
                                                    {eco.type === ECOType.PRODUCT ? (
                                                        <FileText className="mr-1 h-3 w-3" />
                                                    ) : (
                                                        <Package className="mr-1 h-3 w-3" />
                                                    )}
                                                    {eco.type}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStageBadgeClass(eco.stage.name)}`}>
                                                    {eco.stage.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>{eco.createdBy?.name || eco.createdBy?.email}</TableCell>
                                            <TableCell>{new Date(eco.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/ecos/${eco.id}`)}>
                                                    <Eye className="h-4 w-4 mr-2" /> View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
