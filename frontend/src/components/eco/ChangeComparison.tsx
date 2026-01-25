import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight, AlertCircle } from 'lucide-react';

interface ChangeComparisonProps {
    title: string;
    oldValue: any;
    newValue: any;
    type?: 'text' | 'number' | 'currency';
}

export function ChangeComparison({ title, oldValue, newValue, type = 'text' }: ChangeComparisonProps) {
    const hasChanged = oldValue !== newValue;

    const formatValue = (value: any): string => {
        if (value === null || value === undefined) return '-';

        switch (type) {
            case 'currency':
                return `$${Number(value).toFixed(2)}`;
            case 'number':
                return String(value);
            default:
                return String(value);
        }
    };

    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">{title}</div>
            <div className="grid grid-cols-2 gap-4">
                {/* Old Value */}
                <div className={`p-3 rounded-md border ${hasChanged ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-xs text-muted-foreground mb-1">Current</div>
                    <div className={`font-medium ${hasChanged ? 'text-red-700 line-through' : 'text-gray-700'}`}>
                        {formatValue(oldValue)}
                    </div>
                </div>

                {/* New Value */}
                <div className={`p-3 rounded-md border ${hasChanged ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="text-xs text-muted-foreground mb-1">Proposed</div>
                    <div className={`font-medium ${hasChanged ? 'text-green-700' : 'text-gray-700'}`}>
                        {formatValue(newValue)}
                    </div>
                </div>
            </div>
            {hasChanged && (
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>This field will be changed</span>
                </div>
            )}
        </div>
    );
}

interface ProductChangesSummaryProps {
    currentProduct: {
        name: string;
        salePrice: number;
        costPrice: number;
    };
    proposedChanges: {
        name: string | null;
        salePrice: number | null;
        costPrice: number | null;
    };
}

export function ProductChangesSummary({ currentProduct, proposedChanges }: ProductChangesSummaryProps) {
    const newName = proposedChanges.name ?? currentProduct.name;
    const newSalePrice = proposedChanges.salePrice ?? currentProduct.salePrice;
    const newCostPrice = proposedChanges.costPrice ?? currentProduct.costPrice;

    const hasAnyChanges =
        newName !== currentProduct.name ||
        newSalePrice !== currentProduct.salePrice ||
        newCostPrice !== currentProduct.costPrice;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                    Change Summary
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {!hasAnyChanges ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No changes proposed yet. Edit the draft values to propose changes.
                    </div>
                ) : (
                    <>
                        <ChangeComparison
                            title="Product Name"
                            oldValue={currentProduct.name}
                            newValue={newName}
                            type="text"
                        />

                        <ChangeComparison
                            title="Sale Price"
                            oldValue={currentProduct.salePrice}
                            newValue={newSalePrice}
                            type="currency"
                        />

                        <ChangeComparison
                            title="Cost Price"
                            oldValue={currentProduct.costPrice}
                            newValue={newCostPrice}
                            type="currency"
                        />

                        {/* Impact Summary */}
                        {(newSalePrice !== currentProduct.salePrice || newCostPrice !== currentProduct.costPrice) && (
                            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="text-sm font-medium text-blue-900 mb-2">Margin Impact</div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-muted-foreground">Current Margin</div>
                                        <div className="font-bold text-blue-700">
                                            ${(currentProduct.salePrice - currentProduct.costPrice).toFixed(2)}
                                            {' '}
                                            ({(((currentProduct.salePrice - currentProduct.costPrice) / currentProduct.salePrice) * 100).toFixed(1)}%)
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">New Margin</div>
                                        <div className="font-bold text-green-700">
                                            ${(newSalePrice - newCostPrice).toFixed(2)}
                                            {' '}
                                            ({(((newSalePrice - newCostPrice) / newSalePrice) * 100).toFixed(1)}%)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
