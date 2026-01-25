import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ecoService } from '../../services/ecoService';
import { ComponentPicker } from './ComponentPicker';

interface BOMComponent {
    id: string; // Component Version ID
    partNumber: string;
    name: string;
    quantity: number;
    action: 'ADD' | 'UPDATE' | 'REMOVE' | 'KEEP';
}

interface BOMDraftEditorProps {
    ecoId: string;
    initialComponents: any[]; // Replace with proper type
    canEdit: boolean;
    onSave?: () => void;
    token: string;
}

export function BOMDraftEditor({ ecoId, initialComponents, canEdit, onSave, token }: BOMDraftEditorProps) {
    // Flatten structure for editing: We need a list of ALL components (existing + added)
    // For this demo, we'll simulate a simple list
    const [components, setComponents] = useState<BOMComponent[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    useEffect(() => {
        // Transform backend data to editor format
        if (initialComponents && initialComponents.length > 0) {
            const mapped = initialComponents.map((c: any) => {
                // Handle both direct component and nested componentVersion structures
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

    const handleQuantityChange = (index: number, qty: number) => {
        const newComps = [...components];
        newComps[index].quantity = qty;
        if (newComps[index].action === 'KEEP') newComps[index].action = 'UPDATE';
        setComponents(newComps);
    };

    const handleRemove = (index: number) => {
        const newComps = [...components];
        newComps[index].action = 'REMOVE';
        setComponents(newComps);
    };

    const handleRestore = (index: number) => {
        const newComps = [...components];
        newComps[index].action = 'KEEP'; // Or 'UPDATE' if quantity changed
        setComponents(newComps);
    }

    const handleSelectProduct = (product: any) => {
        const latestVersion = product.versions?.[0];
        if (!latestVersion) {
            alert('This product has no active version to add.');
            return;
        }

        // Check if already in list
        if (components.some(c => c.id === latestVersion.id && c.action !== 'REMOVE')) {
            alert('This component is already in the BOM.');
            return;
        }

        const newComponent: BOMComponent = {
            id: latestVersion.id,
            partNumber: product.name,
            name: product.name,
            quantity: 1,
            action: 'ADD'
        };

        setComponents([...components, newComponent]);
        setIsPickerOpen(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Map back to API format
            const payload = components
                .filter(c => c.action !== 'KEEP') // Only send changes
                .map(c => ({
                    action: c.action,
                    componentVersionId: c.id,
                    quantity: c.quantity
                }));

            await ecoService.updateBOMDraft(token, ecoId, { components: payload });
            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            alert('Failed to save BOM changes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>BOM Changes (Draft)</CardTitle>
                    <CardDescription>Manage component changes for this ECO</CardDescription>
                </div>
                {canEdit && (
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" /> Save Changes
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {components.map((comp, index) => (
                        <div key={index} className={`flex items-center justify-between p-3 border rounded-md ${comp.action === 'REMOVE' ? 'bg-red-50 border-red-200' : ''}`}>
                            <div>
                                <div className="font-medium">{comp.name}</div>
                                <div className="text-sm text-muted-foreground">{comp.partNumber}</div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">Qty:</span>
                                    <Input
                                        type="number"
                                        className="w-20 h-8"
                                        value={comp.quantity}
                                        onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                                        disabled={!canEdit || comp.action === 'REMOVE'}
                                    />
                                </div>
                                <div className="w-24 text-center">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${comp.action === 'ADD' ? 'bg-green-100 text-green-800' :
                                        comp.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                                            comp.action === 'REMOVE' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {comp.action}
                                    </span>
                                </div>
                                {canEdit && (
                                    <>
                                        {comp.action === 'REMOVE' ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleRestore(index)}>Undo</Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" onClick={() => handleRemove(index)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {components.length === 0 && <div className="text-center text-muted-foreground py-4">No components loaded</div>}

                    {/* Placeholder for 'Add Component' - full implementation requires component search picker */}
                    {/* Add Component Button */}
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
            </CardContent>
        </Card>
    );
}
