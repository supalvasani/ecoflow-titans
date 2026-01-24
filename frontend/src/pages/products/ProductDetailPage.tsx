import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/productService';
import { ItemStatus, type Product, type ProductVersion, type ProductAttachment } from '../../types/product';
import { Role } from '../../types/auth';
import { ecoService } from '../../services/ecoService';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Label } from '../../components/ui/label';
import { ArrowLeft, FileText, History, Box } from 'lucide-react';

import { DashboardLayout } from '../../components/layout/DashboardLayout';

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [activeVersion, setActiveVersion] = useState<ProductVersion | null>(null);
    const [versions, setVersions] = useState<ProductVersion[]>([]);
    const [attachments, setAttachments] = useState<ProductAttachment[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'attachments' | 'bom'>('overview');

    const isOperations = user?.role === Role.OPERATIONS_USER;
    const canEdit = user?.role === Role.ENGINEERING_USER || user?.role === Role.ADMIN;

    const handleProposeChange = async () => {
        if (!token || !product || !activeVersion) return;
        try {
            setLoading(true); // Re-use loading state or simple alert
            const title = `ECO for ${product.name} (v${activeVersion.version})`;
            const { eco } = await ecoService.createProductECO(token, product.id, title);
            navigate(`/ecos/${eco.id}`);
        } catch (err: any) {
            alert(`Failed to create ECO: ${err.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchProductData = async () => {
            if (!token || !id) return;
            try {
                setLoading(true);
                // Fetch product base info
                const productRes = await productService.getProductById(token, id);
                setProduct(productRes.product);

                // Fetch active version
                try {
                    const versionRes = await productService.getActiveVersion(token, id);
                    setActiveVersion(versionRes.version);

                    // Fetch attachments for active version
                    const attachRes = await productService.getAttachments(token, id, versionRes.version.id);
                    setAttachments(attachRes.attachments);
                } catch (e) {
                    // Ignore if no active version (e.g. brand new product not set up?) 
                    // But our invariant says we create v1 on creation.
                    console.error("No active version found or access denied", e);
                }

                // Fetch version history if allowed
                if (!isOperations) {
                    const versionsRes = await productService.getProductVersions(token, id);
                    setVersions(versionsRes.versions);
                }

                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to load product details');
            } finally {
                setLoading(false);
            }
        };

        fetchProductData();
    }, [token, id, isOperations]);

    if (loading) return <div className="p-10 text-center">Loading product details...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;
    if (!product) return <div className="p-10 text-center">Product not found</div>;

    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
        >
            <Icon className="mr-2 h-4 w-4" />
            {label}
        </button>
    );

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/products')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                </Button>

                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                        <div className="flex items-center mt-2 space-x-2">
                            <span className="text-muted-foreground text-sm">ID: {product.id}</span>
                            {activeVersion && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeVersion.status === ItemStatus.ACTIVE
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {activeVersion.status} (v{activeVersion.version})
                                </span>
                            )}
                        </div>
                    </div>
                    {canEdit && activeVersion?.status === ItemStatus.ACTIVE && (
                        <Button onClick={handleProposeChange}>
                            Propose Change (ECO)
                        </Button>
                    )}
                </div>

                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <TabButton id="overview" label="Overview" icon={FileText} />
                        {!isOperations && <TabButton id="versions" label="Version History" icon={History} />}
                        <TabButton id="attachments" label="Attachments" icon={FileText} />
                        <TabButton id="bom" label="Bill of Materials" icon={Box} />
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'overview' && activeVersion && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Product Specifications (v{activeVersion.version})</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Sale Price</Label>
                                    <div className="text-2xl font-bold">${activeVersion.salePrice}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Cost Price</Label>
                                    <div className="text-2xl font-bold text-gray-600">${activeVersion.costPrice}</div>
                                </div>
                                <div className="col-span-2 pt-4">
                                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                        <div className="flex">
                                            <div className="ml-3">
                                                <p className="text-sm text-yellow-700">
                                                    This view is read-only. To make changes, you must propose an Engineering Change Order (ECO).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'versions' && !isOperations && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Version History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Version</TableHead>
                                            <TableHead>Created At</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {versions.map((v) => (
                                            <TableRow key={v.id} className={v.id === activeVersion?.id ? 'bg-muted/50' : ''}>
                                                <TableCell className="font-medium">v{v.version}</TableCell>
                                                <TableCell>{new Date(v.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v.status === ItemStatus.ACTIVE
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {v.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>${v.salePrice}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'attachments' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Attachments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {attachments.length === 0 ? (
                                    <p className="text-muted-foreground">No attachments found for this version.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {attachments.map((att) => (
                                            <li key={att.id} className="flex items-center p-2 border rounded hover:bg-gray-50">
                                                <FileText className="mr-3 h-5 w-5 text-gray-400" />
                                                <span className="flex-1 font-medium">{att.filename}</span>
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={att.url} target="_blank" rel="noreferrer">Download</a>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'bom' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Bill of Materials</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-10">
                                    <Box className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-semibold text-gray-900">BOM Module Integration</h3>
                                    <p className="mt-1 text-sm text-gray-500">BOM details will be displayed here.</p>
                                    <Button className="mt-4" variant="outline" onClick={() => navigate(`/boms?productId=${id}`)}>
                                        Go to BOM Page
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
