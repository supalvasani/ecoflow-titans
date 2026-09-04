import { Response } from 'express';
import { reportService } from '../service/reportService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getCCRHistory = async (req: AuthRequest, res: Response) => {
    try {
        const filters: any = {};

        if (req.query.type) {
            filters.type = req.query.type as string;
        }
        if (req.query.stageId) {
            filters.stageId = req.query.stageId as string;
        }
        if (req.query.startDate) {
            filters.startDate = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
            filters.endDate = new Date(req.query.endDate as string);
        }

        const history = await reportService.getCCRHistory(filters);
        res.json({ history });
    } catch (error: any) {
        console.error('Get CCR history error:', error);
        res.status(500).json({ error: 'Failed to fetch CCR history' });
    }
};

export const getCatalogItemVersions = async (req: AuthRequest, res: Response) => {
    try {
        const catalogItemId = req.query.catalogItemId as string | undefined;
        const versions = await reportService.getCatalogItemVersionHistory(catalogItemId);
        res.json({ versions });
    } catch (error: any) {
        console.error('Get catalog item versions error:', error);
        res.status(500).json({ error: 'Failed to fetch catalog item versions' });
    }
};

export const getVariantSetHistory = async (req: AuthRequest, res: Response) => {
    try {
        const variantSetId = req.query.variantSetId as string | undefined;
        const history = await reportService.getVariantSetHistory(variantSetId);
        res.json({ history });
    } catch (error: any) {
        console.error('Get VariantSet history error:', error);
        res.status(500).json({ error: 'Failed to fetch VariantSet history' });
    }
};

export const getActiveMatrix = async (req: AuthRequest, res: Response) => {
    try {
        const matrix = await reportService.getActiveMatrix();
        res.json(matrix);
    } catch (error: any) {
        console.error('Get active matrix error:', error);
        res.status(500).json({ error: 'Failed to fetch active matrix' });
    }
};

export const getArchivedCatalogItems = async (req: AuthRequest, res: Response) => {
    try {
        const archived = await reportService.getArchivedCatalogItems();
        res.json({ archived });
    } catch (error: any) {
        console.error('Get archived catalog items error:', error);
        res.status(500).json({ error: 'Failed to fetch archived catalog items' });
    }
};


