import { Response } from 'express';
import { catalogItemService } from '../service/catalogItemService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const createCatalogItem = async (req: AuthRequest, res: Response) => {
    try {
        const { name, sku, salePrice, costPrice, brand, category, currency } = req.body;
        const userId = req.user!.userId;

        const catalogItem = await catalogItemService.createCatalogItem(
            name,
            sku || `SKU-${Date.now()}`,
            typeof salePrice === 'string' ? parseFloat(salePrice) : salePrice,
            typeof costPrice === 'string' ? parseFloat(costPrice) : costPrice,
            userId,
            { brand, category, currency }
        );
        res.status(201).json({
            message: 'Catalog item created successfully',
            catalogItem,
            product: catalogItem, // backward compat
        });
    } catch (error: any) {
        console.error('Create catalog item error:', error);
        res.status(400).json({ error: error.message || 'Failed to create catalog item' });
    }
};

export const getCatalogItems = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const includeArchived = req.query.includeArchived === 'true';

        const catalogItems = await catalogItemService.getCatalogItems(userRole, includeArchived);
        res.json({ catalogItems, products: catalogItems });
    } catch (error: any) {
        console.error('Get catalog items error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog items' });
    }
};

export const getCatalogItemById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const catalogItem = await catalogItemService.getCatalogItemById(id as string, userRole);
        res.json({ catalogItem, product: catalogItem });
    } catch (error: any) {
        if (error.message === 'CatalogItem not found' || error.message === 'Product not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get catalog item error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog item' });
    }
};

export const getCatalogItemVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;
        const versions = await catalogItemService.getCatalogItemVersions(id as string, userRole);
        res.json({ versions });
    } catch (error: any) {
        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get catalog item versions error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog item versions' });
    }
};

export const getActiveVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const version = await catalogItemService.getActiveCatalogItemVersion(id as string);
        res.json({ version });
    } catch (error: any) {
        if (error.message && error.message.includes('No active version found')) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get active version error:', error);
        res.status(500).json({ error: 'Failed to fetch active version' });
    }
};

export const getContent = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;
        const content = await catalogItemService.getContent(versionId as string);
        res.json({ content, attachments: content });
    } catch (error: any) {
        console.error('Get content error:', error);
        res.status(500).json({ error: 'Failed to fetch content' });
    }
};

// Aliases for backwards compatibility
export const createProduct = createCatalogItem;
export const getProducts = getCatalogItems;
export const getProductById = getCatalogItemById;
export const getProductVersions = getCatalogItemVersions;
export const getAttachments = getContent;
