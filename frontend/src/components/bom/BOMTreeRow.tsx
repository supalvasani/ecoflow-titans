import { ChevronRight, ChevronDown, Cuboid } from 'lucide-react';
import { useState } from 'react';
import { TableRow, TableCell } from '../ui/table';

import { Button } from '../ui/button';



interface BOMTreeRowProps {
    node: any; // Using any for flexible recursive matching with backend response
    level: number;
}

export const BOMTreeRow = ({ node, level }: BOMTreeRowProps) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    const indent = level * 20;

    return (
        <>
            <TableRow>
                <TableCell className="font-medium">
                    <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
                        {hasChildren ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 mr-2"
                                onClick={() => setExpanded(!expanded)}
                            >
                                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                        ) : (
                            <div className="w-6 mr-2" /> // Spacer
                        )}
                        <Cuboid className="h-4 w-4 mr-2 text-blue-500" />
                        {node.componentVersion?.product?.name || 'Unknown Component'}
                    </div>
                </TableCell>
                <TableCell>v{node.componentVersion?.version}</TableCell>
                <TableCell>{node.quantity}</TableCell>
                <TableCell>${node.componentVersion?.costPrice}</TableCell>
                <TableCell className="font-bold">
                    ${(node.quantity * (node.componentVersion?.costPrice || 0)).toFixed(2)}
                </TableCell>
            </TableRow>
            {expanded && hasChildren && node.children.map((child: any) => (
                <BOMTreeRow key={child.id} node={child} level={level + 1} />
            ))}
        </>
    );
};
