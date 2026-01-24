import { ItemStatus } from '../types/product';

// Status badge color mapping
export const getStatusBadgeClass = (status: ItemStatus): string => {
    switch (status) {
        case ItemStatus.ACTIVE:
            return 'bg-green-100 text-green-800 border-green-200';
        case ItemStatus.ARCHIVED:
            return 'bg-gray-100 text-gray-800 border-gray-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
};

// ECO Stage badge color mapping
export const getStageBadgeClass = (stageName: string): string => {
    const normalizedStage = stageName.toLowerCase();

    if (normalizedStage.includes('draft') || normalizedStage.includes('wip')) {
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    if (normalizedStage.includes('review') || normalizedStage.includes('pending')) {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (normalizedStage.includes('approved')) {
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (normalizedStage.includes('implemented') || normalizedStage.includes('applied') || normalizedStage.includes('complete')) {
        return 'bg-green-100 text-green-800 border-green-200';
    }
    if (normalizedStage.includes('rejected') || normalizedStage.includes('cancelled')) {
        return 'bg-red-100 text-red-800 border-red-200';
    }

    return 'bg-blue-100 text-blue-800 border-blue-200';
};

// ECO Type badge color mapping
export const getTypeBadgeClass = (type: string): string => {
    switch (type) {
        case 'PRODUCT':
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'BOM':
            return 'bg-orange-50 text-orange-700 border-orange-200';
        default:
            return 'bg-gray-50 text-gray-700 border-gray-200';
    }
};

// Lifecycle indicator with icon
export const getLifecycleIcon = (status: ItemStatus): string => {
    switch (status) {
        case ItemStatus.ACTIVE:
            return '●'; // Filled circle
        case ItemStatus.ARCHIVED:
            return '○'; // Empty circle
        default:
            return '◐'; // Half circle
    }
};
