import { Response } from 'express';
import { variantSetService } from '../service/variantSetService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const createVariantSet = async (req: AuthRequest, res: Response) => {
    try {
        const { catalogItemId, productId } = req.body;
        const targetId = catalogItemId || productId;
        const userId = req.user!.userId;

        const variantSet = await variantSetService.createVariantSet(targetId, userId);
        res.status(201).json({
            message: 'VariantSet created successfully',
            variantSet,
            bom: variantSet, // backward compat
        });
    } catch (error: any) {
        console.error('Create VariantSet error:', error);
        res.status(400).json({ error: error.message || 'Failed to create VariantSet' });
    }
};

export const getVariantSets = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const includeArchived = req.query.includeArchived === 'true';

        const variantSets = await variantSetService.getVariantSets(userRole, includeArchived);
        res.json({ variantSets, boms: variantSets });
    } catch (error: any) {
        console.error('Get VariantSets error:', error);
        res.status(500).json({ error: 'Failed to fetch VariantSets' });
    }
};

export const getVariantSetById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const variantSet = await variantSetService.getVariantSetById(id as string, userRole);
        res.json({ variantSet, bom: variantSet });
    } catch (error: any) {
        if (error.message === 'VariantSet not found' || error.message === 'BOM not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get VariantSet error:', error);
        res.status(500).json({ error: 'Failed to fetch VariantSet' });
    }
};

export const getVariantSetByCatalogItemId = async (req: AuthRequest, res: Response) => {
    try {
        const { catalogItemId, productId } = req.params;
        const targetId = catalogItemId || productId;
        const userRole = req.user!.role;

        const variantSet = await variantSetService.getVariantSetByCatalogItemId(targetId as string, userRole);
        res.json({ variantSet, bom: variantSet });
    } catch (error: any) {
        if (error.message && (error.message.includes('not found') || error.message.includes('No VariantSet found'))) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get VariantSet by CatalogItem error:', error);
        res.status(500).json({ error: 'Failed to fetch VariantSet for this item' });
    }
};

export const getVariantSetVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;
        const versions = await variantSetService.getVariantSetVersions(id as string, userRole);
        res.json({ versions });
    } catch (error: any) {
        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get VariantSet versions error:', error);
        res.status(500).json({ error: 'Failed to fetch VariantSet versions' });
    }
};

export const getActiveVariantSetVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const version = await variantSetService.getActiveVariantSetVersion(id as string);
        res.json({ version });
    } catch (error: any) {
        if (error.message && error.message.includes('No active version found')) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get active VariantSet version error:', error);
        res.status(500).json({ error: 'Failed to fetch active version' });
    }
};

export const toggleChannelPublishRule = async (req: AuthRequest, res: Response) => {
    try {
        const { ruleId } = req.params;
        const { isLive } = req.body;
        const userId = req.user!.userId;

        const updatedRule = await variantSetService.toggleChannelPublishRule(ruleId as string, Boolean(isLive), userId);
        res.json({ message: `Channel publish rule updated to ${isLive ? 'LIVE' : 'OFFLINE'}`, rule: updatedRule });
    } catch (error: any) {
        console.error('Toggle channel rule error:', error);
        res.status(400).json({ error: error.message || 'Failed to toggle channel publish rule' });
    }
};

// Aliases for backwards compatibility
export const createBOM = createVariantSet;
export const getBOMs = getVariantSets;
export const getBOMById = getVariantSetById;
export const getBOMByProductId = getVariantSetByCatalogItemId;
export const getBOMVersions = getVariantSetVersions;
export const getActiveBOMVersion = getActiveVariantSetVersion;
