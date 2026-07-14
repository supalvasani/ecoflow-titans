import { db, schema } from '../db/index.js';
import { eq, and, desc, count } from 'drizzle-orm';

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

    const conditions = [];
    if (entity) conditions.push(eq(schema.auditLogs.entity, entity));
    if (entityId) conditions.push(eq(schema.auditLogs.entityId, entityId));
    if (userId) conditions.push(eq(schema.auditLogs.userId, userId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db
        .select({ value: count() })
        .from(schema.auditLogs)
        .where(whereClause);

    const total = countResult[0]?.value || 0;

    const logs = await db.query.auditLogs.findMany({
        where: whereClause,
        with: {
            user: {
                columns: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: [desc(schema.auditLogs.timestamp)],
        limit,
        offset,
    });

    return {
        logs,
        total,
        limit,
        offset,
    };
};

export const getAuditLogsByECO = async (ecoId: string) => {
    const logs = await db.query.auditLogs.findMany({
        where: eq(schema.auditLogs.ecoId, ecoId),
        with: {
            user: {
                columns: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: [desc(schema.auditLogs.timestamp)],
    });

    return { logs };
};

export const getAuditLogsByEntity = async (entity: string, entityId: string) => {
    const logs = await db.query.auditLogs.findMany({
        where: and(
            eq(schema.auditLogs.entity, entity),
            eq(schema.auditLogs.entityId, entityId)
        ),
        with: {
            user: {
                columns: {
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: [desc(schema.auditLogs.timestamp)],
    });

    return { logs };
};

export const auditService = {
    getAuditLogs,
    getAuditLogsByECO,
    getAuditLogsByEntity,
};
