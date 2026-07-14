import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { operationsService, type OperationsTask } from '../services/operationsService';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ClipboardList, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export const OperationsDashboard = () => {
    const { token } = useAuth();
    const [tasks, setTasks] = useState<OperationsTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, [token]);

    const loadTasks = async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await operationsService.getTasks(token);
            setTasks(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        if (!token) return;
        try {
            await operationsService.completeTask(token, taskId);
            // Refresh list
            loadTasks();
        } catch (err: any) {
            setError(err.message || 'Failed to complete task');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Operations Dashboard</h2>
                    <p className="text-muted-foreground">
                        Manage pending implementation tasks for active ECOs
                    </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{tasks.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">System Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold text-green-600">Operational</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Pending Implementation Tasks
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
                            <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No pending tasks found. Good job!
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Task</TableHead>
                                        <TableHead>ECO Trigger</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Created At</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tasks.map((task) => (
                                        <TableRow key={task.id}>
                                            <TableCell className="font-medium">
                                                <div>{task.title}</div>
                                                {task.description && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {task.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {task.eco.title}
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                                                    {task.eco.type}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(task.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleCompleteTask(task.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Mark Done
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};
