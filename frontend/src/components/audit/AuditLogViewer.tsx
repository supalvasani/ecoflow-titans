import { useEffect, useState } from 'react';
import { auditService } from '../../services/auditService';
import type { AuditLog } from '../../types/eco';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertCircle, History } from 'lucide-react';

interface AuditLogViewerProps {
    token: string;
    entity: string;
    entityId: string;
}

export function AuditLogViewer({ token, entity, entityId }: AuditLogViewerProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [token, entity, entityId]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await auditService.getAuditLogs(token, { entity, entityId, limit: 20 });
            setLogs(data.logs || []);
            setError(null);
        } catch (err: any) {
            // Handle case where API returns HTML instead of JSON (endpoint not implemented)
            const errorMsg = err.message || 'Failed to load audit logs';
            if (errorMsg.includes('JSON') || errorMsg.includes('DOCTYPE') || errorMsg.includes('Unexpected token')) {
                setError('Audit log feature requires backend API support');
            } else {
                setError(errorMsg);
            }
            setLogs([]);
        } finally {
            setLoading(false);
        }
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Activity History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="bg-destructive/15 text-destructive p-4 rounded-md mb-4 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No activity recorded yet.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
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
                                    <TableCell>
                                        {log.oldValue || log.newValue ? (
                                            <div className="text-xs space-y-1">
                                                {log.oldValue && (
                                                    <div className="text-red-600">
                                                        <span className="font-medium">Old:</span> {log.oldValue.substring(0, 40)}
                                                        {log.oldValue.length > 40 && '...'}
                                                    </div>
                                                )}
                                                {log.newValue && (
                                                    <div className="text-green-600">
                                                        <span className="font-medium">New:</span> {log.newValue.substring(0, 40)}
                                                        {log.newValue.length > 40 && '...'}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
