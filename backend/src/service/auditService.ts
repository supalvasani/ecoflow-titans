import { db } from '../libs/prisma.js';

/**
 * Get audit logs with optional filtering and pagination
 */
export const getAuditLogs = async (filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}) => {
    const {
        entity,
        entityId,
        userId,
        limit = 50,
        offset = 0,
    } = filters;

    // Build where clause
    const where: any = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    // Get total count for pagination
    const total = await db.auditLog.count({ where });

    // Get logs with user information
    const logs = await db.auditLog.findMany({
        where,
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            timestamp: 'desc',
        },
        take: limit,
        skip: offset,
    });

    return {
        logs,
        total,
        limit,
        offset,
    };
};

/**
 * Get audit logs for a specific ECO
 */
export const getAuditLogsByECO = async (ecoId: string) => {
    const logs = await db.auditLog.findMany({
        where: {
            ecoId,
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            timestamp: 'desc',
        },
    });

    return { logs };
};

/**
 * Get audit logs for a specific entity
 */
export const getAuditLogsByEntity = async (entity: string, entityId: string) => {
    const logs = await db.auditLog.findMany({
        where: {
            entity,
            entityId,
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: {
            timestamp: 'desc',
        },
    });

    return { logs };
};

export const auditService = {
    getAuditLogs,
    getAuditLogsByECO,
    getAuditLogsByEntity,
};
