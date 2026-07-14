import { Response } from 'express';
import { bomService } from '../service/bomService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const createBOM = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.body;
        const userId = req.user!.userId;

        const bom = await bomService.createBOM(productId, userId);
        res.status(201).json({
            message: 'BOM created successfully',
            bom,
        });
    } catch (error: any) {
        console.error('Create BOM error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BOM' });
    }
};

export const getBOMs = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const includeArchived = req.query.includeArchived === 'true';

        const boms = await bomService.getBOMs(userRole, includeArchived);
        res.json({ boms });
    } catch (error: any) {
        console.error('Get BOMs error:', error);
        res.status(500).json({ error: 'Failed to fetch BOMs' });
    }
};

export const getBOMById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const bom = await bomService.getBOMById(id as string, userRole);
        res.json({ bom });
    } catch (error: any) {
        if (error.message === 'BOM not found' || error.message.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get BOM error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM' });
    }
};

export const getBOMVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;
        const versions = await bomService.getBOMVersions(id as string, userRole);
        res.json({ versions });
    } catch (error: any) {
        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get BOM versions error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM versions' });
    }
};

export const getActiveVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const version = await bomService.getActiveBOMVersion(id as string);
        res.json({ version });
    } catch (error: any) {
        if (error.message === 'No active version found for this BOM') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get active BOM version error:', error);
        res.status(500).json({ error: 'Failed to fetch active version' });
    }
};

export const getBOMVersionById = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;
        const userRole = req.user!.role;

        const version = await bomService.getBOMVersionById(versionId as string, userRole);
        res.json({ version });
    } catch (error: any) {
        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message === 'BOM version not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get BOM version error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM version' });
    }
};
