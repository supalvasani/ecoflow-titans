import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2, Save, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Label } from '../ui/label';
import { ecoService } from '../../services/ecoService';
import { ComponentPicker } from './ComponentPicker';

interface BOMComponent {
    id: string; // Component Version ID
    partNumber: string;
    name: string;
    quantity: number;
    action: 'ADD' | 'UPDATE' | 'REMOVE' | 'KEEP';
}

interface BOMOperation {
    id?: string; // existing operation id (from backend)
    name: string;
    timeMinutes: number;
    workCenter: string;
    action: 'ADD' | 'UPDATE' | 'DELETE' | 'KEEP';
}

interface BOMDraftEditorProps {
    ecoId: string;
    initialComponents: any[];
    initialOperations?: any[];
    canEdit: boolean;
    onSave?: () => void;
    token: string;
}

export function BOMDraftEditor({ ecoId, initialComponents, initialOperations = [], canEdit, onSave, token }: BOMDraftEditorProps) {
    const [activeTab, setActiveTab] = useState<'components' | 'operations'>('components');
    const [components, setComponents] = useState<BOMComponent[]>([]);
    const [operations, setOperations] = useState<BOMOperation[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    useEffect(() => {
        if (initialComponents && initialComponents.length > 0) {
            const mapped = initialComponents.map((c: any) => {
                const version = c.componentVersion || c;
                const product = version.product || version;
                return {
                    id: c.componentVersionId || c.id || version.id,
                    partNumber: product.name || c.partNumber || 'N/A',
                    name: product.name || c.name || version.name || 'Unknown Component',
                    quantity: c.quantity || 1,
                    action: c.action || 'KEEP'
                };
            });
            setComponents(mapped);
        } else {
            setComponents([]);
        }
    }, [initialComponents]);

    useEffect(() => {
        if (initialOperations && initialOperations.length > 0) {
            const mapped = initialOperations.map((op: any) => ({
                id: op.id,
                name: op.name || '',
                timeMinutes: op.timeMinutes || 0,
                workCenter: op.workCenter || '',
                action: (op.action || 'KEEP') as BOMOperation['action'],
            }));
            setOperations(mapped);
        } else {
            setOperations([]);
        }
    }, [initialOperations]);

    // --- Component handlers ---
    const handleQuantityChange = (index: number, qty: number) => {
        const newComps = [...components];
        newComps[index].quantity = qty;
        if (newComps[index].action === 'KEEP') newComps[index].action = 'UPDATE';
        setComponents(newComps);
    };

    const handleRemoveComponent = (index: number) => {
        const newComps = [...components];
        newComps[index].action = 'REMOVE';
        setComponents(newComps);
    };

    const handleRestoreComponent = (index: number) => {
        const newComps = [...components];
        newComps[index].action = 'KEEP';
        setComponents(newComps);
    };

    const handleSelectProduct = (product: any) => {
        const latestVersion = product.versions?.[0];
        if (!latestVersion) {
            alert('This product has no active version to add.');
            return;
        }
        if (components.some(c => c.id === latestVersion.id && c.action !== 'REMOVE')) {
            alert('This component is already in the BOM.');
            return;
        }
        setComponents([...components, {
            id: latestVersion.id,
            partNumber: product.name,
            name: product.name,
            quantity: 1,
            action: 'ADD'
        }]);
        setIsPickerOpen(false);
    };

    // --- Operation handlers ---
    const handleOperationChange = (index: number, field: keyof BOMOperation, value: string | number) => {
        const newOps = [...operations];
        (newOps[index] as any)[field] = value;
        if (newOps[index].action === 'KEEP') newOps[index].action = 'UPDATE';
        setOperations(newOps);
    };

    const handleRemoveOperation = (index: number) => {
        const newOps = [...operations];
        if (newOps[index].action === 'ADD') {
            // New unsaved operations: just remove from list
            newOps.splice(index, 1);
        } else {
            newOps[index].action = 'DELETE';
        }
        setOperations(newOps);
    };

    const handleRestoreOperation = (index: number) => {
        const newOps = [...operations];
        newOps[index].action = 'KEEP';
        setOperations(newOps);
    };

    const handleAddOperation = () => {
        setOperations([...operations, {
            name: 'New Operation',
            timeMinutes: 15,
            workCenter: '',
            action: 'ADD',
        }]);
    };

    // --- Save ---
    const handleSave = async () => {
        setLoading(true);
        try {
            const componentPayload = components
                .filter(c => c.action !== 'KEEP')
                .map(c => ({
                    action: c.action,
                    componentVersionId: c.id,
                    quantity: c.quantity
                }));

            const operationPayload = operations
                .filter(op => op.action !== 'KEEP')
                .map(op => ({
                    id: op.id,
                    action: op.action,
                    name: op.name,
                    timeMinutes: op.timeMinutes,
                    workCenter: op.workCenter,
                }));

            await ecoService.updateDraft(token, ecoId, {
                components: componentPayload,
                operations: operationPayload,
            });
            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            alert('Failed to save BOM changes');
        } finally {
            setLoading(false);
        }
    };

    const actionBadge = (action: string) => {
        const map: Record<string, string> = {
            ADD: 'bg-green-100 text-green-800',
            UPDATE: 'bg-blue-100 text-blue-800',
            REMOVE: 'bg-red-100 text-red-800',
            DELETE: 'bg-red-100 text-red-800',
            KEEP: 'bg-gray-100 text-gray-800',
        };
        return map[action] || 'bg-gray-100 text-gray-800';
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>BOM Changes (Draft)</CardTitle>
                    <CardDescription>Manage component and operation changes for this ECO</CardDescription>
                </div>
                {canEdit && (
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {/* Tab Nav */}
                <div className="border-b mb-4">
                    <nav className="-mb-px flex space-x-6">
                        <button
                            onClick={() => setActiveTab('components')}
                            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'components'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Components ({components.filter(c => c.action !== 'REMOVE').length})
                        </button>
                        <button
                            onClick={() => setActiveTab('operations')}
                            className={`flex items-center gap-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'operations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                            Operations ({operations.filter(op => op.action !== 'DELETE').length})
                        </button>
                    </nav>
                </div>

                {/* Components Tab */}
                {activeTab === 'components' && (
                    <div className="space-y-3">
                        {components.map((comp, index) => (
                            <div key={index} className={`flex items-center justify-between p-3 border rounded-md ${comp.action === 'REMOVE' ? 'bg-red-50 border-red-200 opacity-60' : comp.action === 'ADD' ? 'bg-green-50 border-green-200' : ''}`}>
                                <div>
                                    <div className="font-medium">{comp.name}</div>
                                    <div className="text-xs text-muted-foreground">{comp.partNumber}</div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-muted-foreground">Qty:</span>
                                        <Input
                                            type="number"
                                            className="w-20 h-8"
                                            value={comp.quantity}
                                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                            disabled={!canEdit || comp.action === 'REMOVE'}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${actionBadge(comp.action)}`}>
                                        {comp.action}
                                    </span>
                                    {canEdit && (
                                        comp.action === 'REMOVE' ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleRestoreComponent(index)}>Undo</Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveComponent(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                        {components.length === 0 && <div className="text-center text-muted-foreground py-6">No components in this BOM</div>}
                        {canEdit && (
                            <>
                                <Button variant="outline" className="w-full border-dashed" onClick={() => setIsPickerOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Component
                                </Button>
                                <ComponentPicker
                                    isOpen={isPickerOpen}
                                    onClose={() => setIsPickerOpen(false)}
                                    onSelect={handleSelectProduct}
                                    token={token}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Operations Tab */}
                {activeTab === 'operations' && (
                    <div className="space-y-3">
                        {operations.map((op, index) => (
                            <div key={index} className={`p-3 border rounded-md space-y-2 ${op.action === 'DELETE' ? 'bg-red-50 border-red-200 opacity-60' : op.action === 'ADD' ? 'bg-green-50 border-green-200' : ''}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${actionBadge(op.action)}`}>{op.action}</span>
                                    {canEdit && (
                                        op.action === 'DELETE' ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleRestoreOperation(index)}>Undo</Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveOperation(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Operation Name</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={op.name}
                                            onChange={(e) => handleOperationChange(index, 'name', e.target.value)}
                                            disabled={!canEdit || op.action === 'DELETE'}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Time (min)</Label>
                                        <Input
                                            type="number"
                                            className="h-8 text-sm"
                                            value={op.timeMinutes}
                                            onChange={(e) => handleOperationChange(index, 'timeMinutes', parseInt(e.target.value) || 0)}
                                            disabled={!canEdit || op.action === 'DELETE'}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Work Center</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={op.workCenter}
                                            onChange={(e) => handleOperationChange(index, 'workCenter', e.target.value)}
                                            disabled={!canEdit || op.action === 'DELETE'}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {operations.length === 0 && <div className="text-center text-muted-foreground py-6">No operations defined for this BOM</div>}
                        {canEdit && (
                            <Button variant="outline" className="w-full border-dashed" onClick={handleAddOperation}>
                                <Plus className="h-4 w-4 mr-2" /> Add Operation
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
