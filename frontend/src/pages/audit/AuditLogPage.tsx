import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/auditService';
import type { AuditLog } from '../../types/eco';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '../../components/ui/button';
import { AlertCircle, History, Search, RefreshCw } from 'lucide-react';

export default function AuditLogPage() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);

    // Filters
    const [entityFilter, setEntityFilter] = useState('');
    const [entityIdFilter, setEntityIdFilter] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');
    const [limit] = useState(50);
    const [offset, setOffset] = useState(0);

    const fetchAuditLogs = async () => {
        if (!token) return;

        try {
            setLoading(true);
            const filters: any = { limit, offset };
            if (entityFilter) filters.entity = entityFilter;
            if (entityIdFilter) filters.entityId = entityIdFilter;
            if (userIdFilter) filters.userId = userIdFilter;

            const data = await auditService.getAuditLogs(token, filters);
            setLogs(data.logs);
            setTotal(data.total);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
    }, [token, offset]);

    const handleSearch = () => {
        setOffset(0);
        fetchAuditLogs();
    };

    const handleReset = () => {
        setEntityFilter('');
        setEntityIdFilter('');
        setUserIdFilter('');
        setOffset(0);
        fetchAuditLogs();
    };

    const getActionBadgeClass = (action: string): string => {
        const lowerAction = action.toLowerCase();
        if (lowerAction.includes('create')) return 'bg-green-100 text-green-800 border-green-200';
        if (lowerAction.includes('update') || lowerAction.includes('edit')) return 'bg-blue-100 text-blue-800 border-blue-200';
        if (lowerAction.includes('delete') || lowerAction.includes('archive')) return 'bg-red-100 text-red-800 border-red-200';
        if (lowerAction.includes('approve')) return 'bg-purple-100 text-purple-800 border-purple-200';
        if (lowerAction.includes('reject')) return 'bg-orange-100 text-orange-800 border-orange-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <History className="h-8 w-8" />
                            Audit Logs
                        </h2>
                        <p className="text-muted-foreground">Track all changes and actions across the system</p>
                    </div>
                    <Button onClick={fetchAuditLogs} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Filters</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="entity">Entity Type</Label>
                                <select
                                    id="entity"
                                    value={entityFilter}
                                    onChange={(e) => setEntityFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Entities</option>
                                    <option value="ECO">ECO</option>
                                    <option value="Product">Product</option>
                                    <option value="BOM">BOM</option>
                                    <option value="User">User</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entityId">Entity ID</Label>
                                <Input
                                    id="entityId"
                                    placeholder="e.g., abc123..."
                                    value={entityIdFilter}
                                    onChange={(e) => setEntityIdFilter(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userId">User ID</Label>
                                <Input
                                    id="userId"
                                    placeholder="Filter by user..."
                                    value={userIdFilter}
                                    onChange={(e) => setUserIdFilter(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 flex items-end gap-2">
                                <Button onClick={handleSearch} className="flex-1">
                                    <Search className="mr-2 h-4 w-4" />
                                    Search
                                </Button>
                                <Button onClick={handleReset} variant="outline">
                                    Reset
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Audit Log Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activity Log ({total} total entries)</CardTitle>
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
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Entity</TableHead>
                                    <TableHead>Entity ID</TableHead>
                                    <TableHead>Changes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">Loading...</TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            No audit logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="font-medium">{log.user?.name || 'Unknown'}</div>
                                                    <div className="text-muted-foreground text-xs">{log.user?.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getActionBadgeClass(log.action)}`}>
                                                    {log.action}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-medium">{log.entity}</TableCell>
                                            <TableCell className="font-mono text-xs">{log.entityId.substring(0, 8)}...</TableCell>
                                            <TableCell>
                                                {log.oldValue || log.newValue ? (
                                                    <div className="text-xs space-y-1">
                                                        {log.oldValue && (
                                                            <div className="text-red-600">
                                                                <span className="font-medium">Old:</span> {log.oldValue.substring(0, 50)}
                                                                {log.oldValue.length > 50 && '...'}
                                                            </div>
                                                        )}
                                                        {log.newValue && (
                                                            <div className="text-green-600">
                                                                <span className="font-medium">New:</span> {log.newValue.substring(0, 50)}
                                                                {log.newValue.length > 50 && '...'}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {total > limit && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} entries
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOffset(Math.max(0, offset - limit))}
                                        disabled={offset === 0}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOffset(offset + limit)}
                                        disabled={offset + limit >= total}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
