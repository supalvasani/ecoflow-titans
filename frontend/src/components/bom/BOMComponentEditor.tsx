import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { BOMComponent } from '../../types/bom';
import type { Product, ProductVersion } from '../../types/product';
import { productService } from '../../services/productService';
import { useAuth } from '../../contexts/AuthContext';

interface BOMComponentEditorProps {
    components: BOMComponent[];
    onUpdate: (components: BOMComponent[]) => void;
    readOnly?: boolean;
}

export const BOMComponentEditor: React.FC<BOMComponentEditorProps> = ({
    components,
    onUpdate,
    readOnly = false,
}) => {
    const { token } = useAuth();
    const [editing, setEditing] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    
    // Form state for adding/editing
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [quantity, setQuantity] = useState('1');
    
    // Load available products
    useEffect(() => {
        const loadProducts = async () => {
            if (!token) return;
            try {
                const { products } = await productService.getProducts(token);
                // Only show products with active versions
                const activeProducts = products.filter(p => 
                    p.versions?.some(v => v.status === 'ACTIVE')
                );
                setAvailableProducts(activeProducts);
            } catch (err) {
                console.error('Failed to load products:', err);
            }
        };
        if (adding || editing) {
            loadProducts();
        }
    }, [token, adding, editing]);

    const handleAdd = () => {
        setAdding(true);
        setSelectedProductId('');
        setSelectedVersionId('');
        setQuantity('1');
    };

    const handleEdit = (component: BOMComponent) => {
        setEditing(component.id);
        setSelectedProductId(component.componentVersion?.product?.id || '');
        setSelectedVersionId(component.componentVersionId);
        setQuantity(component.quantity.toString());
    };

    const handleSave = () => {
        if (!selectedVersionId || !quantity || parseFloat(quantity) <= 0) {
            alert('Please select a product version and enter a valid quantity');
            return;
        }

        const product = availableProducts.find(p => 
            p.versions?.some(v => v.id === selectedVersionId)
        );
        const version = product?.versions?.find(v => v.id === selectedVersionId);

        if (!product || !version) {
            alert('Invalid product selection');
            return;
        }

        if (editing) {
            // Update existing component
            const updated = components.map(c => 
                c.id === editing 
                    ? {
                        ...c,
                        componentVersionId: selectedVersionId,
                        quantity: parseFloat(quantity),
                        componentVersion: {
                            ...version,
                            product: product,
                        }
                    }
                    : c
            );
            onUpdate(updated);
            setEditing(null);
        } else {
            // Add new component
            const newComponent: BOMComponent = {
                id: `temp-${Date.now()}`, // Temporary ID
                bomVersionId: '',
                componentVersionId: selectedVersionId,
                quantity: parseFloat(quantity),
                componentVersion: {
                    ...version,
                    product: product,
                }
            };
            onUpdate([...components, newComponent]);
            setAdding(false);
        }

        // Reset form
        setSelectedProductId('');
        setSelectedVersionId('');
        setQuantity('1');
    };

    const handleCancel = () => {
        setAdding(false);
        setEditing(null);
        setSelectedProductId('');
        setSelectedVersionId('');
        setQuantity('1');
    };

    const handleDelete = (componentId: string) => {
        if (confirm('Are you sure you want to remove this component?')) {
            onUpdate(components.filter(c => c.id !== componentId));
        }
    };

    const getActiveVersions = (productId: string): ProductVersion[] => {
        const product = availableProducts.find(p => p.id === productId);
        return product?.versions?.filter(v => v.status === 'ACTIVE') || [];
    };

    // Calculate total cost
    const totalCost = components.reduce((sum, comp) => {
        const cost = comp.componentVersion?.costPrice || 0;
        return sum + (cost * comp.quantity);
    }, 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Components</CardTitle>
                {!readOnly && !adding && !editing && (
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Component
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Component List */}
                {components.length === 0 && !adding ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No components yet. Click "Add Component" to get started.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {components.map((comp) => (
                            <div
                                key={comp.id}
                                className={`flex items-center justify-between p-3 border rounded-lg ${
                                    editing === comp.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                }`}
                            >
                                {editing === comp.id ? (
                                    /* Edit Mode */
                                    <div className="w-full grid grid-cols-4 gap-3">
                                        <div className="col-span-2">
                                            <Label className="text-xs">Product</Label>
                                            <select
                                                value={selectedProductId}
                                                onChange={(e) => {
                                                    setSelectedProductId(e.target.value);
                                                    setSelectedVersionId('');
                                                }}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                <option value="">Select Product</option>
                                                {availableProducts.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Version</Label>
                                            <select
                                                value={selectedVersionId}
                                                onChange={(e) => setSelectedVersionId(e.target.value)}
                                                disabled={!selectedProductId}
                                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            >
                                                <option value="">Select Version</option>
                                                {selectedProductId && getActiveVersions(selectedProductId).map(v => (
                                                    <option key={v.id} value={v.id}>v{v.version}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Quantity</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div className="col-span-4 flex justify-end gap-2">
                                            <Button onClick={handleSave} size="sm" variant="default">
                                                <Check className="w-4 h-4 mr-1" />
                                                Save
                                            </Button>
                                            <Button onClick={handleCancel} size="sm" variant="outline">
                                                <X className="w-4 h-4 mr-1" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <>
                                        <div className="flex-1">
                                            <div className="font-medium">
                                                {comp.componentVersion?.product?.name || 'Unknown Product'}
                                                <span className="text-sm text-gray-500 ml-2">
                                                    v{comp.componentVersion?.version}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                Quantity: {comp.quantity} units ×{' '}
                                                ${(comp.componentVersion?.costPrice || 0).toFixed(2)} ={' '}
                                                <span className="font-medium">
                                                    ${((comp.componentVersion?.costPrice || 0) * comp.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        {!readOnly && (
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleEdit(comp)}
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(comp.id)}
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Component Form */}
                {adding && (
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                        <h3 className="font-medium mb-3">Add New Component</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="col-span-2">
                                <Label>Product</Label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => {
                                        setSelectedProductId(e.target.value);
                                        setSelectedVersionId('');
                                    }}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Select Product</option>
                                    {availableProducts.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Version</Label>
                                <select
                                    value={selectedVersionId}
                                    onChange={(e) => setSelectedVersionId(e.target.value)}
                                    disabled={!selectedProductId}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Select Version</option>
                                    {selectedProductId && getActiveVersions(selectedProductId).map(v => (
                                        <option key={v.id} value={v.id}>v{v.version}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <Button onClick={handleSave} variant="default">
                                <Check className="w-4 h-4 mr-2" />
                                Add Component
                            </Button>
                            <Button onClick={handleCancel} variant="outline">
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Total Cost */}
                {components.length > 0 && (
                    <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">Total Component Cost:</span>
                            <span className="text-lg font-bold text-blue-600">
                                ${totalCost.toFixed(2)}
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
