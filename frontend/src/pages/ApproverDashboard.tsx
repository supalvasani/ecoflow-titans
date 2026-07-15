// Approver Dashboard - Enhanced with ECO Statistics and Pending Reviews
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ecoService } from '../services/ecoService';
import type { ECO } from '../types/eco';
import { ECOType } from '../types/eco';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { CheckCircle, XCircle, Eye, AlertCircle, FileText, Clock } from 'lucide-react';

interface ECOStats {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
}

export const ApproverDashboard = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<ECOStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
    const [pendingECOs, setPendingECOs] = useState<ECO[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = async () => {
        if (!token) return;
        try {
            setLoading(true);

            // Fetch statistics from backend (optimized)
            const statsData = await ecoService.getECOStatistics(token);
            const statsArray = statsData.statistics;

            // Calculate counts from statistics - Using exact DB stage names
            const pending = statsArray.find(s => s.stageName === 'Under Review')?.count || 0;
            const approved = statsArray.find(s => s.stageName === 'Approved')?.count || 0;
            const rejected = statsArray.find(s => s.stageName === 'Rejected')?.count || 0;
            const total = statsArray.reduce((sum, s) => sum + s.count, 0);

            setStats({ pending, approved, rejected, total });

            // Fetch only pending ECOs for the table (more efficient)
            const ecosData = await ecoService.getECOs(token);
            setPendingECOs(ecosData.ecos.filter(eco => eco.stage.name === 'Under Review').slice(0, 5));

            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Approver Dashboard</h2>
                    <p className="text-muted-foreground">Review and authorize engineering changes</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <StatCard title="Pending Review" value={stats.pending} icon={Clock} color="text-yellow-600" />
                    <StatCard title="Approved" value={stats.approved} icon={CheckCircle} color="text-green-600" />
                    <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="text-red-600" />
                    <StatCard title="Total ECOs" value={stats.total} icon={FileText} color="text-blue-600" />
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {/* Pending ECOs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>ECOs Awaiting Your Review</CardTitle>
                        <CardDescription>
                            {pendingECOs.length === 0
                                ? 'No ECOs pending review at the moment.'
                                : `${pendingECOs.length} ECO${pendingECOs.length > 1 ? 's' : ''} pending your approval`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : pendingECOs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                <p>All caught up! No pending reviews.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Created By</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingECOs.map((eco) => (
                                        <TableRow key={eco.id}>
                                            <TableCell className="font-medium">{eco.title}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center text-xs">
                                                    {eco.type === ECOType.PRODUCT ? (
                                                        <FileText className="mr-1 h-3 w-3 text-blue-500" />
                                                    ) : (
                                                        <FileText className="mr-1 h-3 w-3 text-orange-500" />
                                                    )}
                                                    {eco.type}
                                                </span>
                                            </TableCell>
                                            <TableCell>{eco.createdBy?.name || eco.createdBy?.email}</TableCell>
                                            <TableCell>{new Date(eco.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/ecos/${eco.id}`)}>
                                                    <Eye className="h-4 w-4 mr-2" /> Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        {pendingECOs.length > 0 && (
                            <div className="mt-4 text-center">
                                <Button variant="outline" onClick={() => navigate('/ecos')}>
                                    View All ECOs
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};
