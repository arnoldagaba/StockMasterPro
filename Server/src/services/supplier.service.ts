import { PrismaClient, Supplier, Prisma } from "@prisma/client";
import prisma from "@/config/prisma";
import { ApiError } from "@/utils/apiError";
import { CreateSupplierInput, UpdateSupplierInput } from "@/validators/supplier.validator";
import { PaginationParams, SearchFilter, ISupplierService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

export class SupplierService extends BaseServiceImpl<Supplier, Prisma.SupplierCreateInput, Prisma.SupplierUpdateInput> implements ISupplierService {
    constructor(prisma: PrismaClient) {
        super(prisma, "supplier");
    }

    async findByName(name: string): Promise<Supplier[]> {
        try {
            const suppliers = await this.prisma.supplier.findMany({
                where: {
                    name: {
                        contains: name,
                    },
                    deletedAt: null,
                },
            });

            return suppliers;
        } catch (error) {
            this.handleError(error, `Error finding suppliers by name: ${name}`);
            throw error;
        }
    }

    async getSupplierWithPurchaseOrders(
        supplierId: number,
    ): Promise<Supplier & { purchaseOrders: Prisma.PurchaseOrderGetPayload<{ include: { purchaseOrderItems: { include: { product: true } } } }>[] }> {
        try {
            const supplier = await this.prisma.supplier.findUnique({
                where: {
                    id: supplierId,
                    deletedAt: null,
                },
                include: {
                    purchaseOrders: {
                        include: {
                            purchaseOrderItems: {
                                include: {
                                    product: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!supplier) {
                throw new Error("Supplier not found");
            }

            return supplier as Supplier & {
                purchaseOrders: Prisma.PurchaseOrderGetPayload<{ include: { purchaseOrderItems: { include: { product: true } } } }>[];
            };
        } catch (error) {
            this.handleError(error, `Error retrieving supplier with purchase orders: ${supplierId}`);
            throw error;
        }
    }

    // Add additional methods specific to this service implementation
    async createSupplier(supplierData: CreateSupplierInput) {
        try {
            const supplier = await prisma.supplier.create({
                data: supplierData,
            });

            return supplier;
        } catch (error) {
            console.error("Error creating supplier:", error);
            throw new ApiError(500, "Error creating supplier");
        }
    }

    async updateSupplier(id: number, supplierData: UpdateSupplierInput) {
        try {
            const existingSupplier = await prisma.supplier.findUnique({
                where: { id },
            });

            if (!existingSupplier) {
                throw new ApiError(404, "Supplier not found");
            }

            const updatedSupplier = await prisma.supplier.update({
                where: { id },
                data: supplierData,
            });

            return updatedSupplier;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating supplier");
        }
    }

    async deleteSupplier(id: number) {
        try {
            // Check if supplier exists
            const existingSupplier = await prisma.supplier.findUnique({
                where: { id },
            });

            if (!existingSupplier) {
                throw new ApiError(404, "Supplier not found");
            }

            // Check if supplier is associated with any purchase orders
            const purchaseOrderCount = await prisma.purchaseOrder.count({
                where: { supplierId: id },
            });

            if (purchaseOrderCount > 0) {
                // Set deletedAt instead of actually deleting (soft delete)
                const deletedSupplier = await prisma.supplier.update({
                    where: { id },
                    data: { deletedAt: new Date() },
                });

                return deletedSupplier;
            }

            // If no purchase orders, we can hard delete
            const deletedSupplier = await prisma.supplier.delete({
                where: { id },
            });

            return deletedSupplier;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting supplier");
        }
    }

    async getSupplierById(id: number) {
        try {
            const supplier = await prisma.supplier.findUnique({
                where: { id },
            });

            if (!supplier) {
                throw new ApiError(404, "Supplier not found");
            }

            return supplier;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving supplier");
        }
    }

    async getAllSuppliers(params?: PaginationParams & SearchFilter) {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc", searchTerm = "" } = params || {};

            // Build where clause for filtering
            const where: Prisma.SupplierWhereInput = {};

            // Add deletedAt = null to only get active suppliers
            where.deletedAt = null;

            // Add name search if provided
            if (searchTerm) {
                where.OR = [{ name: { contains: searchTerm } }, { contactName: { contains: searchTerm } }, { email: { contains: searchTerm } }];
            }

            // Count total suppliers for pagination
            const total = await prisma.supplier.count({ where });

            // Get paginated suppliers
            const suppliers = await prisma.supplier.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: suppliers,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            console.error("Error retrieving suppliers:", error);
            throw new ApiError(500, "Error retrieving suppliers");
        }
    }
}
