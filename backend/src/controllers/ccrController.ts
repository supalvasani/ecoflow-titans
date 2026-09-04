import { Response } from 'express';
import { ccrService } from '../service/ccrService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { CCRType } from '../db/schema.js';

export const createCCR = async (req: AuthRequest, res: Response) => {
    try {
        const {
            title,
            type,
            assigneeId,
            effectiveDate,
            versionUpdate,
            catalogItemId,
            variantSetId,
            rollbackTargetVersionId,
            initialChanges,
        } = req.body;
        const userId = req.user!.userId;

        const dateObj = effectiveDate ? new Date(effectiveDate) : undefined;

        const ccr = await ccrService.createCCR({
            title,
            type: type as CCRType,
            createdById: userId,
            ...(assigneeId ? { assigneeId } : {}),
            ...(dateObj ? { effectiveDate: dateObj } : {}),
            ...(versionUpdate !== undefined ? { versionUpdate } : {}),
            ...(catalogItemId ? { catalogItemId } : {}),
            ...(variantSetId ? { variantSetId } : {}),
            ...(rollbackTargetVersionId ? { rollbackTargetVersionId } : {}),
            initialChanges,
        });

        res.status(201).json({
            message: 'Catalog Change Request created successfully',
            ccr,
        });
    } catch (error: any) {
        console.error('Create CCR error:', error);
        res.status(400).json({ error: error.message || 'Failed to create Catalog Change Request' });
    }
};

export const getCCRs = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const filters: { type?: CCRType; stageId?: string } = {};

        if (req.query.type) {
            filters.type = req.query.type as CCRType;
        }
        if (req.query.stageId) {
            filters.stageId = req.query.stageId as string;
        }

        const ccrs = await ccrService.getCCRs(userRole, filters);
        res.json({ ccrs });
    } catch (error: any) {
        if (error.statusCode === 403 || (error.message && error.message.includes('Access denied'))) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get CCRs error:', error);
        res.status(500).json({ error: 'Failed to fetch CCRs' });
    }
};

export const getCCRById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const ccr = await ccrService.getCCRById(id as string, userRole);
        res.json({ ccr });
    } catch (error: any) {
        if (error.message === 'CCR not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get CCR error:', error);
        res.status(500).json({ error: 'Failed to fetch CCR' });
    }
};

export const updateDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const changes = req.body;
        const userId = req.user!.userId;

        const ccr = await ccrService.updateDraft(id as string, changes, userId);
        res.json({
            message: 'Draft updated successfully',
            ccr,
        });
    } catch (error: any) {
        console.error('Update draft error:', error);
        res.status(400).json({ error: error.message || 'Failed to update draft' });
    }
};

export const addDraftContent = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { filename, url, action, locale, contentType, approved } = req.body;
        const userId = req.user!.userId;

        const content = await ccrService.addDraftContent(
            id as string,
            filename,
            url,
            action || 'ADD',
            userId,
            { locale, contentType, approved }
        );
        res.status(201).json({
            message: 'Draft content added successfully',
            content,
            attachment: content,
        });
    } catch (error: any) {
        console.error('Add draft content error:', error);
        res.status(400).json({ error: error.message || 'Failed to add draft content' });
    }
};

export const submitForReview = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const ccr = await ccrService.submitForReview(id as string, userId);
        res.json({
            message: 'CCR submitted for review successfully',
            ccr,
        });
    } catch (error: any) {
        console.error('Submit for review error:', error);
        res.status(400).json({ error: error.message || 'Failed to submit CCR for review' });
    }
};

export const validateCCR = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const result = await ccrService.validateCCR(id as string);
        res.json({
            message: 'CCR validation completed',
            ...result,
        });
    } catch (error: any) {
        console.error('Validate CCR error:', error);
        res.status(400).json({ error: error.message || 'Failed to validate CCR' });
    }
};

export const approveCCR = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const result = await ccrService.approveCCR(id as string, userId, userRole, comment);
        res.json({
            message: 'CCR approval recorded successfully',
            ...result,
        });
    } catch (error: any) {
        if (error.message.includes('Only approvers') || error.message.includes('Forbidden') || error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Approve CCR error:', error);
        res.status(400).json({ error: error.message || 'Failed to approve CCR' });
    }
};

export const rejectCCR = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const ccr = await ccrService.rejectCCR(id as string, userId, reason, userRole);
        res.json({
            message: 'CCR rejected successfully',
            ccr,
        });
    } catch (error: any) {
        if (error.message.includes('Only approvers') || error.message.includes('Forbidden') || error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Reject CCR error:', error);
        res.status(400).json({ error: error.message || 'Failed to reject CCR' });
    }
};

export const applyCCR = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const result = await ccrService.applyCCR(id as string, userId);
        res.json({
            message: 'CCR applied successfully. New version created.',
            ccr: result.ccr,
            newVersion: result.newVersion,
        });
    } catch (error: any) {
        console.error('Apply CCR error:', error);
        res.status(400).json({ error: error.message || 'Failed to apply CCR' });
    }
};

export const getCCRStatistics = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const statistics = await ccrService.getCCRStatistics(userRole);
        res.json({ statistics });
    } catch (error: any) {
        console.error('Get CCR statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch CCR statistics' });
    }
};

export const setMandatoryApproval = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { mandatoryApproval } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        if (typeof mandatoryApproval !== 'boolean') {
            return res.status(400).json({ error: 'mandatoryApproval must be a boolean' });
        }

        const ccr = await ccrService.setMandatoryApproval(id as string, mandatoryApproval, userId, userRole);
        res.json({
            message: 'Mandatory approval flag updated successfully',
            ccr,
        });
    } catch (error: any) {
        if (error.message.includes('Only admins')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Set mandatory approval error:', error);
        res.status(400).json({ error: error.message || 'Failed to update mandatory approval flag' });
    }
};

export const previewDiff = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const diff = await ccrService.previewCCRDiff(id as string, userRole);
        res.json({ diff });
    } catch (error: any) {
        console.error('Preview CCR diff error:', error);
        res.status(400).json({ error: error.message || 'Failed to generate diff' });
    }
};


