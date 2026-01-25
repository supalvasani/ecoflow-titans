import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ecoService } from '../../services/ecoService';
import type { ECO } from '../../types/eco';
import { ECOType } from '../../types/eco';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { FileText, Download, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStageBadgeClass, getTypeBadgeClass } from '../../utils/badgeUtils';

export default function ReportsPage() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [activeReport, setActiveReport] = useState<'eco' | 'product' | 'bom' | 'archived'>('eco');
    const [ecos, setEcos] = useState<ECO[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [typeFilter, setTypeFilter] = useState<ECOType | 'ALL'>('ALL');
    const [stageFilter, setStageFilter] = useState<string>('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (activeReport === 'eco') {
            fetchECOReport();
        }
    }, [token, activeReport, typeFilter, stageFilter, dateFrom, dateTo]);

    const fetchECOReport = async () => {
        if (!token) return;

        try {
            setLoading(true);
            const filters: any = {};
            if (typeFilter !== 'ALL') filters.type = typeFilter;

            const data = await ecoService.getECOs(token, filters);
            let filteredEcos = data.ecos;

            // Filter by stage
            if (stageFilter !== 'ALL') {
                filteredEcos = filteredEcos.filter(eco => eco.stage.name === stageFilter);
            }

            // Filter by date
            if (dateFrom) {
                filteredEcos = filteredEcos.filter(eco => new Date(eco.createdAt) >= new Date(dateFrom));
            }
            if (dateTo) {
                filteredEcos = filteredEcos.filter(eco => new Date(eco.createdAt) <= new Date(dateTo));
            }

            setEcos(filteredEcos);
        } catch (err) {
            console.error('Failed to fetch ECO report:', err);
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (activeReport === 'eco') {
            const headers = ['ECO ID', 'Title', 'Type', 'Stage', 'Created By', 'Created Date'];
            const rows = ecos.map(eco => [
                eco.id,
                eco.title,
                eco.type,
                eco.stage.name,
                eco.createdBy.name || eco.createdBy.email,
                new Date(eco.createdAt).toLocaleDateString()
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eco-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
        }
    };

    const ReportTab = ({ id, label }: { id: typeof activeReport, label: string }) => (
        <button
            onClick={() => setActiveReport(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeReport === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
        >
            {label}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <FileText className="h-8 w-8" />
                            Reports
                        </h2>
                        <p className="text-muted-foreground">Generate and export system reports</p>
                    </div>
                    <Button onClick={exportToCSV} disabled={loading || ecos.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>

                {/* Report Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <ReportTab id="eco" label="ECO Reports" />
                        <ReportTab id="product" label="Product Version History" />
                        <ReportTab id="bom" label="BOM Change History" />
                        <ReportTab id="archived" label="Archived Products" />
                    </nav>
                </div>

                {/* ECO Report */}
                {activeReport === 'eco' && (
                    <>
                        {/* Filters */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>ECO Type</Label>
                                        <select
                                            value={typeFilter}
                                            onChange={(e) => setTypeFilter(e.target.value as ECOType | 'ALL')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="ALL">All Types</option>
                                            <option value={ECOType.PRODUCT}>Product</option>
                                            <option value={ECOType.BOM}>BOM</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Stage</Label>
                                        <select
                                            value={stageFilter}
                                            onChange={(e) => setStageFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="ALL">All Stages</option>
                                            <option value="Draft">Draft</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Implemented">Implemented</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date From</Label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date To</Label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ECO Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>ECO Report ({ecos.length} entries)</CardTitle>
                            </CardHeader>
                            <CardContent>
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
                                                    No ECOs match the selected filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ecos.map((eco) => (
                                                <TableRow key={eco.id}>
                                                    <TableCell className="font-mono text-xs">{eco.id.substring(0, 8)}...</TableCell>
                                                    <TableCell className="font-medium">{eco.title}</TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getTypeBadgeClass(eco.type)}`}>
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
                    </>
                )}

                {/* Placeholder for other reports */}
                {activeReport !== 'eco' && (
                    <Card>
                        <CardContent className="py-20 text-center">
                            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {activeReport === 'product' && 'Product Version History Report'}
                                {activeReport === 'bom' && 'BOM Change History Report'}
                                {activeReport === 'archived' && 'Archived Products Report'}
                            </h3>
                            <p className="text-muted-foreground">
                                This report will be available in a future update.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
