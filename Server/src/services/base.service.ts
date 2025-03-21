import { PaginationParams, SearchFilter, BaseService } from "./interfaces";
import { PrismaClient } from "@prisma/client";

export abstract class BaseServiceImpl<T, TCreateInput, TUpdateInput> implements BaseService<T, TCreateInput, TUpdateInput> {
    protected prisma: PrismaClient;
    protected modelName: string;

    constructor(prisma: PrismaClient, modelName: string) {
        this.prisma = prisma;
        this.modelName = modelName;
    }

    /**
     * Find all entries with pagination and search
     */
    async findAll(params?: PaginationParams & SearchFilter): Promise<{ data: T[]; total: number; page: number; limit: number }> {
        try {
            const { page = 1, limit = 10, sortBy = "id", sortOrder = "desc", searchTerm = "", filters = {} } = params || {};

            // Convert string values to numbers
            const pageNum = Number(page);
            const limitNum = Number(limit);
            const skip = (pageNum - 1) * limitNum;

            // Build where clause based on filter and search term
            const where: Record<string, unknown> = { ...filters };

            // Handle deleted records if the model has deletedAt field
            // @ts-ignore - we check at runtime if the field exists
            if ("deletedAt" in (this.prisma[this.modelName] as any).fields) {
                where.deletedAt = null;
            }

            // Add search functionality if searchTerm is provided
            // This is a simplified approach - specific services might need more complex search logic
            if (searchTerm) {
                // For example, if the model has a name field, search by name
                where.OR = [
                    { name: { contains: searchTerm } },
                    // Add more fields to search as needed
                ];
            }

            // Dynamic model access using the modelName
            // @ts-ignore - Prisma clients are type-safe but we use dynamic access
            const model = this.prisma[this.modelName];

            // Get total count of records matching the where clause
            const total = await model.count({ where });

            // Get paginated data
            const data = await model.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { [sortBy]: sortOrder },
            });

            return {
                data: data as T[],
                total,
                page: pageNum,
                limit: limitNum,
            };
        } catch (error) {
            this.handleError(error, `Error finding all ${this.modelName}`);
            throw error;
        }
    }

    /**
     * Find entry by ID
     */
    async findById(id: number): Promise<T | null> {
        try {
            // @ts-ignore - Prisma clients are type-safe but we use dynamic access
            const model = this.prisma[this.modelName];

            // Handle deleted records if the model has deletedAt field
            const where: Record<string, unknown> = { id };
            // @ts-ignore - we check at runtime if the field exists
            if ("deletedAt" in (model as any).fields) {
                where.deletedAt = null;
            }

            const result = await model.findFirst({ where });
            return result as T | null;
        } catch (error) {
            this.handleError(error, `Error finding ${this.modelName} with ID ${id}`);
            throw error;
        }
    }

    /**
     * Create a new entry
     */
    async create(data: TCreateInput): Promise<T> {
        try {
            // @ts-ignore - Prisma clients are type-safe but we use dynamic access
            const model = this.prisma[this.modelName];
            const result = await model.create({ data });
            return result as T;
        } catch (error) {
            this.handleError(error, `Error creating ${this.modelName}`);
            throw error;
        }
    }

    /**
     * Update an existing entry
     */
    async update(id: number, data: TUpdateInput): Promise<T> {
        try {
            // @ts-ignore - Prisma clients are type-safe but we use dynamic access
            const model = this.prisma[this.modelName];
            const result = await model.update({
                where: { id },
                data,
            });
            return result as T;
        } catch (error) {
            this.handleError(error, `Error updating ${this.modelName} with ID ${id}`);
            throw error;
        }
    }

    /**
     * Delete an entry (soft delete if supported, otherwise hard delete)
     */
    async delete(id: number): Promise<T> {
        try {
            // @ts-ignore - Prisma clients are type-safe but we use dynamic access
            const model = this.prisma[this.modelName];

            // Check if the model supports soft delete
            // @ts-ignore - we check at runtime if the field exists
            if ("deletedAt" in (model as any).fields) {
                // Soft delete
                const result = await model.update({
                    where: { id },
                    data: { deletedAt: new Date() },
                });
                return result as T;
            } else {
                // Hard delete
                const result = await model.delete({
                    where: { id },
                });
                return result as T;
            }
        } catch (error) {
            this.handleError(error, `Error deleting ${this.modelName} with ID ${id}`);
            throw error;
        }
    }

    /**
     * Handle errors consistently across service methods
     */
    protected handleError(error: unknown, message: string): void {
        // Log the error
        console.error(`${message}:`, error);

        // Check if the error is from Prisma
        if (error instanceof Error) {
            if (error.message.includes("Record not found") || error.message.includes("No records found")) {
                throw new Error(`${this.modelName} not found`);
            }

            if (error.message.includes("Unique constraint failed")) {
                throw new Error(`${this.modelName} with these details already exists`);
            }

            if (error.message.includes("Foreign key constraint failed")) {
                throw new Error(`Related record not found`);
            }
        }

        // Re-throw the error with a more specific message
        if (error instanceof Error) {
            error.message = `${message}: ${error.message}`;
        }
    }
}
