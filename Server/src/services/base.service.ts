import { CreateAuditLogDTO } from "./interfaces";
import { PrismaClient } from "@prisma/client";

export class BaseService {
    protected prisma: PrismaClient;

    constructor(prismaClient: PrismaClient) {
        this.prisma = prismaClient;
    }

    protected async executeWithTransaction<T>(
        operation: (tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">) => Promise<T>,
        auditLog?: CreateAuditLogDTO,
    ): Promise<T> {
        return this.prisma.$transaction(async (tx) => {
            try {
                const result = await operation(tx);

                // Create audit log if provided
                if (auditLog) {
                    await tx.auditLog.create({
                        data: {
                            userId: auditLog.userId,
                            action: auditLog.action,
                            entityType: auditLog.entityType,
                            entityId: auditLog.entityId,
                            oldValues: auditLog.oldValues || {},
                            newValues: auditLog.newValues || {},
                            ipAddress: auditLog.ipAddress,
                            userAgent: auditLog.userAgent,
                        },
                    });
                }

                return result;
            } catch (error) {
                console.error("Transaction failed:", error);
                throw error;
            }
        });
    }

    protected handleError(error: Error, message: string): never {
        console.error(`${message}: `, error);

        // You can customize error handling based on error types
        if (error.name === "PrismaClientKnownRequestError") {
            // Handle Prisma specific errors
            throw new Error(`Database error: ${message}`);
        }

        throw new Error(message);
    }
}
