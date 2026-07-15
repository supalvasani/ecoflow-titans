import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { FileText, Download, Layers, History, Trash2, Eye, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

type TabType = 'eco' | 'product-versions' | 'bom-history' | 'archived' | 'matrix';

export default function ReportsPage() {
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('eco');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Report data states
    const [ecoHistory, setEcoHistory] = useState<any[]>([]);
    const [productVersions, setProductVersions] = useState<any[]>([]);
    const [bomHistory, setBomHistory] = useState<any[]>([]);
    const [archivedProducts, setArchivedProducts] = useState<any[]>([]);
    const [activeMatrix, setActiveMatrix] = useState<{ products: any[]; boms: any[] }>({ products: [], boms: [] });

    const fetchData = async (tab: TabType) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            if (tab === 'eco') {
                const res = await reportService.getECOHistory(token);
                setEcoHistory(res.history || []);
            } else if (tab === 'product-versions') {
                const res = await reportService.getProductVersions(token);
                setProductVersions(res.versions || []);
            } else if (tab === 'bom-history') {
                const res = await reportService.getBOMHistory(token);
                setBomHistory(res.history || []);
            } else if (tab === 'archived') {
                const res = await reportService.getArchivedProducts(token);
                setArchivedProducts(res.archived || []);
            } else if (tab === 'matrix') {
                const res = await reportService.getActiveMatrix(token);
                setActiveMatrix({ products: res.products || [], boms: res.boms || [] });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(activeTab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, token]);

    const handleExportCSV = () => {
        let headers: string[] = [];
        let rows: string[][] = [];
        let filename = `${activeTab}_report.csv`;

        if (activeTab === 'eco') {
            headers = ['ECO Title', 'Type', 'Proposer', 'Stage', 'Date Proposed'];
            rows = ecoHistory.map(h => [
                h.title,
                h.type,
                h.createdBy?.name || h.createdBy?.email || 'System',
                h.stage?.name || 'Draft',
                new Date(h.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'product-versions') {
            headers = ['Product Name', 'Version', 'Sale Price', 'Cost Price', 'Status', 'Date Created'];
            rows = productVersions.map(pv => [
                pv.product?.name || 'Unknown',
                pv.version.toString(),
                pv.salePrice,
                pv.costPrice,
                pv.status,
                new Date(pv.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'bom-history') {
            headers = ['BOM ID', 'Version', 'Components Count', 'Operations Count', 'Status', 'Date Proposed'];
            rows = bomHistory.map(b => [
                b.bomId,
                b.version.toString(),
                (b.components?.length || 0).toString(),
                (b.operations?.length || 0).toString(),
                b.status,
                new Date(b.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'archived') {
            headers = ['Product Name', 'Version', 'Archived Date'];
            rows = archivedProducts.map(ap => [
                ap.product?.name || 'Unknown',
                ap.version.toString(),
                new Date(ap.createdAt).toLocaleDateString()
            ]);
        } else if (activeTab === 'matrix') {
            headers = ['Product Name', 'Active Version', 'Active BOM ID', 'Active BOM Version'];
            rows = activeMatrix.products.map(p => {
                const activeVer = p.versions?.[0];
                const matchingBOM = activeMatrix.boms.find(b => b.productId === p.id);
                const activeBOMVer = matchingBOM?.versions?.[0];
                return [
                    p.name,
                    activeVer ? `v${activeVer.version}` : 'None',
                    matchingBOM ? matchingBOM.id : 'None',
                    activeBOMVer ? `v${activeBOMVer.version}` : 'None'
                ];
            });
        }

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Reports & Change History</h1>
                        <p className="text-muted-foreground">Traceability dashboards for ECOFlow master data and workflows</p>
                    </div>
                    <Button onClick={handleExportCSV} disabled={loading || error !== null}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                </div>

                {/* Tabs selection */}
                <div className="flex border-b border-gray-200 overflow-x-auto space-x-6">
                    <button
                        onClick={() => setActiveTab('eco')}
                        className={`flex items-center pb-3 pt-1 border-b-2 font-medium text-sm whitespace-nowrap gap-2 ${
                            activeTab === 'eco' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <History className="h-4 w-4" /> ECO Change History
                    </button>
                    <button
                        onClick={() => setActiveTab('product-versions')}
                        className={`flex items-center pb-3 pt-1 border-b-2 font-medium text-sm whitespace-nowrap gap-2 ${
                            activeTab === 'product-versions' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Layers className="h-4 w-4" /> Product Version History
                    </button>
                    <button
                        onClick={() => setActiveTab('bom-history')}
                        className={`flex items-center pb-3 pt-1 border-b-2 font-medium text-sm whitespace-nowrap gap-2 ${
                            activeTab === 'bom-history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Layers className="h-4 w-4" /> BOM Change History
                    </button>
                    <button
                        onClick={() => setActiveTab('archived')}
                        className={`flex items-center pb-3 pt-1 border-b-2 font-medium text-sm whitespace-nowrap gap-2 ${
                            activeTab === 'archived' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Trash2 className="h-4 w-4" /> Archived Products
                    </button>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`flex items-center pb-3 pt-1 border-b-2 font-medium text-sm whitespace-nowrap gap-2 ${
                            activeTab === 'matrix' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileText className="h-4 w-4" /> Active Version Matrix
                    </button>
                </div>

                {error && (
                    <div className="p-4 bg-destructive/15 text-destructive rounded-md">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center text-muted-foreground">Loading report data...</div>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {activeTab === 'eco' && 'Engineering Change Orders Trail'}
                                {activeTab === 'product-versions' && 'Product Versions Catalog'}
                                {activeTab === 'bom-history' && 'BOM Version Ledger'}
                                {activeTab === 'archived' && 'Archived Products Repository'}
                                {activeTab === 'matrix' && 'Active Catalog Matrix'}
                            </CardTitle>
                            <CardDescription>
                                {activeTab === 'eco' && 'Full history of created and processed change orders.'}
                                {activeTab === 'product-versions' && 'All versions of catalog products.'}
                                {activeTab === 'bom-history' && 'Historical records of all BOM modifications and operational updates.'}
                                {activeTab === 'archived' && 'Inventory versions that have been decommissioned/archived.'}
                                {activeTab === 'matrix' && 'Current live snap of active product versions mapped with active BOM structures.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Render Tab Contents */}
                            {activeTab === 'eco' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ECO Title</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Proposer</TableHead>
                                            <TableHead>Current Stage</TableHead>
                                            <TableHead>Date Proposed</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ecoHistory.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No ECO history records found</TableCell></TableRow>
                                        ) : (
                                            ecoHistory.map((eco) => (
                                                <TableRow key={eco.id}>
                                                    <TableCell className="font-medium">{eco.title}</TableCell>
                                                    <TableCell>{eco.type}</TableCell>
                                                    <TableCell>{eco.createdBy?.name || eco.createdBy?.email}</TableCell>
                                                    <TableCell><span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-semibold">{eco.stage?.name}</span></TableCell>
                                                    <TableCell>{new Date(eco.createdAt).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Link to={`/ecos/${eco.id}`}>
                                                            <Button size="sm" variant="ghost">
                                                                <Eye className="h-4 w-4 mr-1" /> View Diff
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'product-versions' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Version</TableHead>
                                            <TableHead>Sale Price</TableHead>
                                            <TableHead>Cost Price</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productVersions.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No product versions found</TableCell></TableRow>
                                        ) : (
                                            productVersions.map((pv) => (
                                                <TableRow key={pv.id}>
                                                    <TableCell className="font-medium">{pv.product?.name}</TableCell>
                                                    <TableCell>v{pv.version}</TableCell>
                                                    <TableCell>${pv.salePrice}</TableCell>
                                                    <TableCell>${pv.costPrice}</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                                            pv.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>{pv.status}</span>
                                                    </TableCell>
                                                    <TableCell>{new Date(pv.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'bom-history' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>BOM Version ID</TableHead>
                                            <TableHead>Version</TableHead>
                                            <TableHead>Components Count</TableHead>
                                            <TableHead>Operations Count</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bomHistory.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No BOM version records found</TableCell></TableRow>
                                        ) : (
                                            bomHistory.map((bh) => (
                                                <TableRow key={bh.id}>
                                                    <TableCell className="font-medium font-mono text-xs">{bh.id}</TableCell>
                                                    <TableCell>v{bh.version}</TableCell>
                                                    <TableCell>{bh.components?.length || 0} component(s)</TableCell>
                                                    <TableCell>{bh.operations?.length || 0} operation(s)</TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                                            bh.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>{bh.status}</span>
                                                    </TableCell>
                                                    <TableCell>{new Date(bh.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'archived' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Version</TableHead>
                                            <TableHead>Archived Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {archivedProducts.length === 0 ? (
                                            <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No archived product versions found</TableCell></TableRow>
                                        ) : (
                                            archivedProducts.map((ap) => (
                                                <TableRow key={ap.id}>
                                                    <TableCell className="font-medium text-destructive">{ap.product?.name}</TableCell>
                                                    <TableCell>v{ap.version}</TableCell>
                                                    <TableCell>{new Date(ap.createdAt).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}

                            {activeTab === 'matrix' && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Active Product Version</TableHead>
                                            <TableHead>Active BOM Version</TableHead>
                                            <TableHead>BOM Components</TableHead>
                                            <TableHead>BOM Operations</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeMatrix.products.length === 0 ? (
                                            <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No active snapshot matrix found</TableCell></TableRow>
                                        ) : (
                                            activeMatrix.products.map((p) => {
                                                const activeVer = p.versions?.[0];
                                                const matchingBOM = activeMatrix.boms.find(b => b.productId === p.id);
                                                const activeBOMVer = matchingBOM?.versions?.[0];

                                                return (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.name}</TableCell>
                                                        <TableCell>{activeVer ? `v${activeVer.version}` : 'None'}</TableCell>
                                                        <TableCell>{activeBOMVer ? `v${activeBOMVer.version}` : 'None'}</TableCell>
                                                        <TableCell>
                                                            {activeBOMVer?.components && activeBOMVer.components.length > 0 ? (
                                                                <ul className="list-disc pl-4 text-xs space-y-0.5">
                                                                    {activeBOMVer.components.map((c: any, i: number) => (
                                                                        <li key={i}>{c.componentVersion?.product?.name || 'Component'} (x{c.quantity})</li>
                                                                    ))}
                                                                </ul>
                                                            ) : 'No components'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {activeBOMVer?.operations && activeBOMVer.operations.length > 0 ? (
                                                                <ul className="list-disc pl-4 text-xs space-y-0.5">
                                                                    {activeBOMVer.operations.map((op: any, i: number) => (
                                                                        <li key={i}>{op.name} ({op.timeMinutes}m)</li>
                                                                    ))}
                                                                </ul>
                                                            ) : 'No operations'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
