import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search, Loader2, Plus, Box } from 'lucide-react';
import { productService } from '../../services/productService';
import { type Product } from '../../types/product';

interface ComponentPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
    token: string;
}

export function ComponentPicker({ isOpen, onClose, onSelect, token }: ComponentPickerProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadProducts();
            setSearchQuery('');
        }
    }, [isOpen]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await productService.getProducts(token);
            setProducts(data.products || []);
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Add Component</SheetTitle>
                    <SheetDescription>
                        Search for a product to add as a component to this BOM.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="h-[calc(100vh-250px)] overflow-y-auto pr-2">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p>Loading products...</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="space-y-2">
                                {filteredProducts.map(product => {
                                    const latestVersion = product.versions?.[0];
                                    const price = latestVersion?.salePrice;

                                    return (
                                        <div
                                            key={product.id}
                                            className="group flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                                            onClick={() => onSelect(product)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 bg-primary/10 p-2 rounded-md">
                                                    <Box className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-xs text-muted-foreground flex gap-2">
                                                        <span>Ver: {latestVersion ? latestVersion.version : 'N/A'}</span>
                                                        {price && <span>${price}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus className="h-4 w-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 border-2 border-dashed rounded-lg">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p>No products found matching "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
