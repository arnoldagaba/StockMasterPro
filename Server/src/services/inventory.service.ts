import { PrismaClient, Inventory, InventoryTransaction, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/apiError";
import {
    CreateInventoryInput,
    UpdateInventoryInput,
    AdjustQuantityInput,
    TransferInventoryInput,
    ReserveStockInput,
} from "../validators/inventory.validator";
import { PaginationParams, SearchFilter, IInventoryService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

export class InventoryService
    extends BaseServiceImpl<Inventory, Prisma.InventoryCreateInput, Prisma.InventoryUpdateInput>
    implements IInventoryService
{
    constructor(prisma: PrismaClient) {
        super(prisma, "inventory");
    }

    async findByProductAndLocation(productId: number, locationId: number): Promise<Inventory | null> {
        try {
            const inventory = await this.prisma.inventory.findUnique({
                where: {
                    unique_product_location: {
                        productId,
                        locationId,
                    },
                },
                include: {
                    product: true,
                    location: true,
                },
            });

            return inventory;
        } catch (error) {
            this.handleError(error, `Error finding inventory for product ${productId} at location ${locationId}`);
            throw error;
        }
    }

    async adjustQuantity(productId: number, locationId: number, quantity: number, reason: string): Promise<InventoryTransaction> {
        try {
            // Verify product exists
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Verify location exists
            const location = await this.prisma.location.findUnique({
                where: { id: locationId },
            });

            if (!location) {
                throw new Error(`Location with ID ${locationId} not found`);
            }

            // Begin transaction
            return await this.prisma.$transaction(async (tx) => {
                // Find or create inventory record
                let inventory = await tx.inventory.findUnique({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                });

                if (inventory) {
                    // Update existing inventory
                    const newQuantity = inventory.quantity + quantity;

                    // Check if the adjustment would result in negative inventory
                    if (newQuantity < 0) {
                        throw new Error(`Adjustment would result in negative inventory. Current: ${inventory.quantity}, Adjustment: ${quantity}`);
                    }

                    inventory = await tx.inventory.update({
                        where: {
                            unique_product_location: {
                                productId,
                                locationId,
                            },
                        },
                        data: {
                            quantity: newQuantity,
                        },
                    });
                } else {
                    // Create new inventory record
                    if (quantity < 0) {
                        throw new Error(`Cannot create inventory with negative quantity: ${quantity}`);
                    }

                    inventory = await tx.inventory.create({
                        data: {
                            productId,
                            locationId,
                            quantity,
                        },
                    });
                }

                // Create transaction record
                const transaction = await tx.inventoryTransaction.create({
                    data: {
                        transactionType: quantity >= 0 ? "IN" : "OUT",
                        productId,
                        quantity: Math.abs(quantity),
                        fromLocationId: quantity < 0 ? locationId : null,
                        toLocationId: quantity >= 0 ? locationId : null,
                        referenceType: "ADJUSTMENT",
                        notes: reason,
                        userId: 1, // This should be the current user's ID from auth context
                    },
                });

                return transaction;
            });
        } catch (error) {
            this.handleError(error, `Error adjusting inventory for product ${productId} at location ${locationId}`);
            throw error;
        }
    }

    async transferInventory(productId: number, fromLocationId: number, toLocationId: number, quantity: number): Promise<InventoryTransaction> {
        try {
            if (fromLocationId === toLocationId) {
                throw new Error("Source and destination locations cannot be the same");
            }

            if (quantity <= 0) {
                throw new Error("Transfer quantity must be greater than zero");
            }

            // Verify product exists
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Verify source location exists
            const sourceLocation = await this.prisma.location.findUnique({
                where: { id: fromLocationId },
            });

            if (!sourceLocation) {
                throw new Error(`Source location with ID ${fromLocationId} not found`);
            }

            // Verify destination location exists
            const destLocation = await this.prisma.location.findUnique({
                where: { id: toLocationId },
            });

            if (!destLocation) {
                throw new Error(`Destination location with ID ${toLocationId} not found`);
            }

            // Begin transaction
            return await this.prisma.$transaction(async (tx) => {
                // Check source inventory
                const sourceInventory = await tx.inventory.findUnique({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId: fromLocationId,
                        },
                    },
                });

                if (!sourceInventory) {
                    throw new Error(`No inventory found for product ${productId} at source location ${fromLocationId}`);
                }

                if (sourceInventory.quantity < quantity) {
                    throw new Error(`Insufficient inventory at source location. Available: ${sourceInventory.quantity}, Requested: ${quantity}`);
                }

                // Update source inventory
                await tx.inventory.update({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId: fromLocationId,
                        },
                    },
                    data: {
                        quantity: sourceInventory.quantity - quantity,
                    },
                });

                // Find or create destination inventory
                let destInventory = await tx.inventory.findUnique({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId: toLocationId,
                        },
                    },
                });

                if (destInventory) {
                    // Update existing destination inventory
                    await tx.inventory.update({
                        where: {
                            unique_product_location: {
                                productId,
                                locationId: toLocationId,
                            },
                        },
                        data: {
                            quantity: destInventory.quantity + quantity,
                        },
                    });
                } else {
                    // Create new destination inventory
                    await tx.inventory.create({
                        data: {
                            productId,
                            locationId: toLocationId,
                            quantity,
                        },
                    });
                }

                // Create transaction record
                const transaction = await tx.inventoryTransaction.create({
                    data: {
                        transactionType: "TRANSFER",
                        productId,
                        quantity,
                        fromLocationId,
                        toLocationId,
                        referenceType: "TRANSFER",
                        userId: 1, // This should be the current user's ID from auth context
                    },
                });

                return transaction;
            });
        } catch (error) {
            this.handleError(error, `Error transferring inventory for product ${productId} from location ${fromLocationId} to ${toLocationId}`);
            throw error;
        }
    }

    async checkLowStock(): Promise<Inventory[]> {
        try {
            // Get all products with their reorder points
            const products = await this.prisma.product.findMany({
                where: {
                    deletedAt: null,
                },
                select: {
                    id: true,
                    name: true,
                    reorderPoint: true,
                },
            });

            const lowStockItems: Inventory[] = [];

            // Check each product's inventory levels
            for (const product of products) {
                const inventoryItems = await this.prisma.inventory.findMany({
                    where: {
                        productId: product.id,
                    },
                    include: {
                        product: true,
                        location: true,
                    },
                });

                // Calculate total quantity across all locations
                const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

                // Check if below reorder point
                if (totalQuantity <= product.reorderPoint) {
                    lowStockItems.push(...inventoryItems);
                }
            }

            return lowStockItems;
        } catch (error) {
            this.handleError(error, "Error checking for low stock items");
            throw error;
        }
    }

    async reserveStock(productId: number, locationId: number, quantity: number, referenceId: string, referenceType: string): Promise<boolean> {
        try {
            // Verify product exists
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Verify location exists
            const location = await this.prisma.location.findUnique({
                where: { id: locationId },
            });

            if (!location) {
                throw new Error(`Location with ID ${locationId} not found`);
            }

            // Begin transaction
            return await this.prisma.$transaction(async (tx) => {
                // Check inventory
                const inventory = await tx.inventory.findUnique({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                });

                if (!inventory) {
                    throw new Error(`No inventory found for product ${productId} at location ${locationId}`);
                }

                const availableQuantity = inventory.quantity - inventory.reservedQuantity;

                if (availableQuantity < quantity) {
                    throw new Error(`Insufficient available inventory. Available: ${availableQuantity}, Requested: ${quantity}`);
                }

                // Update reserved quantity
                await tx.inventory.update({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                    data: {
                        reservedQuantity: inventory.reservedQuantity + quantity,
                    },
                });

                // Create transaction record
                await tx.inventoryTransaction.create({
                    data: {
                        transactionType: "OUT",
                        productId,
                        quantity,
                        fromLocationId: locationId,
                        referenceId,
                        referenceType,
                        notes: `Reserved for ${referenceType} ${referenceId}`,
                        userId: 1, // This should be the current user's ID from auth context
                    },
                });

                return true;
            });
        } catch (error) {
            this.handleError(error, `Error reserving stock for product ${productId} at location ${locationId}`);
            throw error;
        }
    }

    async unreserveStock(productId: number, locationId: number, quantity: number, referenceId: string, referenceType: string): Promise<boolean> {
        try {
            // Begin transaction
            return await this.prisma.$transaction(async (tx) => {
                // Check inventory
                const inventory = await tx.inventory.findUnique({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                });

                if (!inventory) {
                    throw new Error(`No inventory found for product ${productId} at location ${locationId}`);
                }

                if (inventory.reservedQuantity < quantity) {
                    throw new Error(
                        `Attempting to unreserve more than is reserved. Reserved: ${inventory.reservedQuantity}, Unreserve request: ${quantity}`,
                    );
                }

                // Update reserved quantity
                await tx.inventory.update({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                    data: {
                        reservedQuantity: inventory.reservedQuantity - quantity,
                    },
                });

                // Create transaction record
                await tx.inventoryTransaction.create({
                    data: {
                        transactionType: "IN",
                        productId,
                        quantity,
                        toLocationId: locationId,
                        referenceId,
                        referenceType,
                        notes: `Unreserved from ${referenceType} ${referenceId}`,
                        userId: 1, // This should be the current user's ID from auth context
                    },
                });

                return true;
            });
        } catch (error) {
            this.handleError(error, `Error unreserving stock for product ${productId} at location ${locationId}`);
            throw error;
        }
    }

    // Additional methods specific to this service implementation
    async createInventory(inventoryData: CreateInventoryInput) {
        try {
            // Verify product exists
            const product = await prisma.product.findUnique({
                where: { id: inventoryData.productId },
            });

            if (!product) {
                throw new ApiError(404, `Product with ID ${inventoryData.productId} not found`);
            }

            // Verify location exists
            const location = await prisma.location.findUnique({
                where: { id: inventoryData.locationId },
            });

            if (!location) {
                throw new ApiError(404, `Location with ID ${inventoryData.locationId} not found`);
            }

            // Check if inventory record already exists
            const existingInventory = await prisma.inventory.findUnique({
                where: {
                    unique_product_location: {
                        productId: inventoryData.productId,
                        locationId: inventoryData.locationId,
                    },
                },
            });

            if (existingInventory) {
                throw new ApiError(
                    400,
                    `Inventory record already exists for product ${inventoryData.productId} at location ${inventoryData.locationId}`,
                );
            }

            // Create inventory record
            const inventory = await prisma.inventory.create({
                data: inventoryData,
            });

            return inventory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error creating inventory record");
        }
    }

    async updateInventory(id: number, inventoryData: UpdateInventoryInput) {
        try {
            // Check if inventory record exists
            const existingInventory = await prisma.inventory.findUnique({
                where: { id },
            });

            if (!existingInventory) {
                throw new ApiError(404, "Inventory record not found");
            }

            // Validate reserved quantity
            if (
                inventoryData.reservedQuantity !== undefined &&
                inventoryData.quantity !== undefined &&
                inventoryData.reservedQuantity > inventoryData.quantity
            ) {
                throw new ApiError(400, "Reserved quantity cannot exceed total quantity");
            } else if (
                inventoryData.reservedQuantity !== undefined &&
                inventoryData.quantity === undefined &&
                inventoryData.reservedQuantity > existingInventory.quantity
            ) {
                throw new ApiError(400, "Reserved quantity cannot exceed total quantity");
            }

            // Update inventory record
            const updatedInventory = await prisma.inventory.update({
                where: { id },
                data: inventoryData,
            });

            return updatedInventory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating inventory record");
        }
    }

    async deleteInventory(id: number) {
        try {
            // Check if inventory record exists
            const existingInventory = await prisma.inventory.findUnique({
                where: { id },
            });

            if (!existingInventory) {
                throw new ApiError(404, "Inventory record not found");
            }

            // Check if inventory has any transactions
            const transactionCount = await prisma.inventoryTransaction.count({
                where: {
                    OR: [
                        { fromLocationId: existingInventory.locationId, productId: existingInventory.productId },
                        { toLocationId: existingInventory.locationId, productId: existingInventory.productId },
                    ],
                },
            });

            if (transactionCount > 0) {
                throw new ApiError(400, "Cannot delete inventory record with associated transactions");
            }

            // Delete inventory record
            const deletedInventory = await prisma.inventory.delete({
                where: { id },
            });

            return deletedInventory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting inventory record");
        }
    }

    async getInventoryById(id: number) {
        try {
            const inventory = await prisma.inventory.findUnique({
                where: { id },
                include: {
                    product: true,
                    location: true,
                },
            });

            if (!inventory) {
                throw new ApiError(404, "Inventory record not found");
            }

            return inventory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving inventory record");
        }
    }

    async getAllInventory(params?: PaginationParams & SearchFilter) {
        try {
            const { page = 1, limit = 10, sortBy = "id", sortOrder = "asc", filters = {} } = params || {};

            // Build where clause for filtering
            const where: any = {};

            // Add product filter if provided
            if (filters.productId) {
                where.productId = Number(filters.productId);
            }

            // Add location filter if provided
            if (filters.locationId) {
                where.locationId = Number(filters.locationId);
            }

            // Add quantity range filters
            if (filters.minQuantity) {
                where.quantity = { gte: Number(filters.minQuantity) };
            }

            if (filters.maxQuantity) {
                where.quantity = { ...(where.quantity || {}), lte: Number(filters.maxQuantity) };
            }

            // Count total inventory records
            const total = await prisma.inventory.count({ where });

            // Get paginated inventory records
            const inventoryItems = await prisma.inventory.findMany({
                where,
                include: {
                    product: true,
                    location: true,
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: inventoryItems,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            throw new ApiError(500, "Error retrieving inventory records");
        }
    }

    async getLowStockItems(threshold?: number, locationId?: number) {
        try {
            // Get all products with their reorder points
            const products = await prisma.product.findMany({
                where: {
                    deletedAt: null,
                },
                include: {
                    inventoryItems: true,
                },
            });

            const lowStockItems: any[] = [];

            // Check each product's inventory levels
            for (const product of products) {
                let inventoryItems = product.inventoryItems;

                // Filter by location if provided
                if (locationId) {
                    inventoryItems = inventoryItems.filter((item) => item.locationId === locationId);
                }

                // Calculate total quantity across all locations (or the specified location)
                const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);

                // Determine threshold to use (either provided or product's reorder point)
                const checkThreshold = threshold || product.reorderPoint;

                // Check if below threshold
                if (totalQuantity <= checkThreshold) {
                    lowStockItems.push({
                        product,
                        locations: inventoryItems,
                        totalQuantity,
                        threshold: checkThreshold,
                        deficit: checkThreshold - totalQuantity,
                    });
                }
            }

            return lowStockItems;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving low stock items");
        }
    }
}