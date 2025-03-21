import { PrismaClient, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Prisma } from "@prisma/client";
import { ApiError } from "@/utils/apiError";
import { UpdatePurchaseOrderInput } from "../validators/purchaseOrder.validator";
import { PaginationParams, SearchFilter, IPurchaseOrderService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import { generatePurchaseOrderNumber } from "../utils/generators";

export class PurchaseOrderService
    extends BaseServiceImpl<PurchaseOrder, Prisma.PurchaseOrderCreateInput, Prisma.PurchaseOrderUpdateInput>
    implements IPurchaseOrderService
{
    constructor(prisma: PrismaClient) {
        super(prisma, "purchaseOrder");
    }

    async findByPONumber(poNumber: string): Promise<PurchaseOrder | null> {
        try {
            const purchaseOrder = await this.findByPurchaseOrderNumber(poNumber);
            return purchaseOrder;
        } catch (error) {
            this.handleError(error, `Error finding purchase order with number ${poNumber}`);
            throw error;
        }
    }

    async findByPurchaseOrderNumber(poNumber: string): Promise<PurchaseOrder | null> {
        try {
            const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
                where: {
                    poNumber,
                },
            });

            return purchaseOrder;
        } catch (error) {
            this.handleError(error, `Error finding purchase order with number ${poNumber}`);
            throw error;
        }
    }

    async findBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
        try {
            const purchaseOrders = await this.prisma.purchaseOrder.findMany({
                where: {
                    supplierId,
                },
                include: {
                    purchaseOrderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return purchaseOrders;
        } catch (error) {
            this.handleError(error, `Error finding purchase orders for supplier ${supplierId}`);
            throw error;
        }
    }

    async findByStatus(status: string): Promise<PurchaseOrder[]> {
        try {
            const poStatus = status as PurchaseOrderStatus;
            const purchaseOrders = await this.prisma.purchaseOrder.findMany({
                where: {
                    status: poStatus,
                },
                include: {
                    purchaseOrderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return purchaseOrders;
        } catch (error) {
            this.handleError(error, `Error finding purchase orders with status ${status}`);
            throw error;
        }
    }

    async findByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]> {
        try {
            const purchaseOrders = await this.prisma.purchaseOrder.findMany({
                where: {
                    orderDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    purchaseOrderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return purchaseOrders;
        } catch (error) {
            this.handleError(error, `Error finding purchase orders in date range`);
            throw error;
        }
    }

    async createPurchaseOrderWithItems(
        data: Prisma.PurchaseOrderCreateInput,
        items: { productId: number; quantityOrdered: number; unitCost: number }[],
        userId: number,
    ): Promise<PurchaseOrder & { purchaseOrderItems: PurchaseOrderItem[] }> {
        try {
            // Check if supplier exists
            const supplierId = data.supplier?.connect?.id || (data as Record<string, unknown>).supplierId;

            const supplier = await this.prisma.supplier.findUnique({
                where: { id: supplierId as unknown as number },
                select: { id: true, name: true, deletedAt: true },
            });

            if (!supplier) {
                throw new ApiError(404, `Supplier with ID ${supplierId} not found`);
            }

            if (supplier.deletedAt) {
                throw new ApiError(400, `Cannot create purchase order for inactive supplier: ${supplier.name}`);
            }

            // Validate product IDs
            const productIds = items.map((item) => item.productId);
            const products = await this.prisma.product.findMany({
                where: {
                    id: {
                        in: productIds,
                    },
                    deletedAt: null,
                },
            });

            if (products.length !== productIds.length) {
                throw new ApiError(400, "One or more products not found or inactive");
            }

            // Create a map of products for easier lookup
            const productMap = new Map(products.map((product) => [product.id, product]));

            // Calculate order totals
            let subtotal = 0;
            let tax = 0;
            const purchaseOrderItems = [];

            for (const item of items) {
                const product = productMap.get(item.productId);
                if (!product) continue;

                const itemSubtotal = item.unitCost * item.quantityOrdered;
                const itemTax = product.taxRate ? Number(((itemSubtotal * Number(product.taxRate)) / 100).toFixed(0)) : 0;

                subtotal += itemSubtotal;
                tax += itemTax;

                purchaseOrderItems.push({
                    productId: item.productId,
                    quantityOrdered: item.quantityOrdered,
                    quantityReceived: 0, // Initially 0
                    unitCost: item.unitCost,
                    subtotal: itemSubtotal,
                });
            }

            const total = subtotal + tax;

            // Generate purchase order number
            const poNumber = generatePurchaseOrderNumber();

            // First create the base purchase order without subtotal/tax/total
            const purchaseOrder = await this.prisma.purchaseOrder.create({
                data: {
                    poNumber,
                    supplierId: supplierId as number,
                    status: "DRAFT",
                    expectedDeliveryDate: data.expectedDeliveryDate,
                    notes: data.notes,
                    userId: userId,
                    total,
                    purchaseOrderItems: {
                        create: purchaseOrderItems,
                    },
                },
                include: {
                    purchaseOrderItems: true,
                },
            });

            // Then update with raw SQL to add subtotal/tax/total fields
            await this.prisma.$executeRaw`
                UPDATE "PurchaseOrder" 
                SET 
                    subtotal = ${subtotal},
                    tax = ${tax},
                    total = ${total}
                WHERE id = ${purchaseOrder.id}
            `;

            // Fetch the updated PO with items to ensure correct return type
            const updatedPurchaseOrder = await this.prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrder.id },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!updatedPurchaseOrder) {
                throw new ApiError(500, "Failed to retrieve updated purchase order");
            }

            return updatedPurchaseOrder as PurchaseOrder & { purchaseOrderItems: PurchaseOrderItem[] };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error creating purchase order");
            throw new ApiError(500, "Error creating purchase order");
        }
    }

    async updatePurchaseOrder(id: number, poData: UpdatePurchaseOrderInput): Promise<PurchaseOrder> {
        try {
            // Check if purchase order exists
            const existingPO = await this.prisma.purchaseOrder.findUnique({
                where: { id },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!existingPO) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Can only update draft or submitted purchase orders
            if (existingPO.status !== "DRAFT" && existingPO.status !== "SUBMITTED") {
                throw new ApiError(400, `Cannot update purchase order with status ${existingPO.status}`);
            }

            // Check if supplier exists (if supplier ID is being updated)
            if (poData.supplierId) {
                const supplier = await this.prisma.supplier.findUnique({
                    where: { id: poData.supplierId as unknown as number },
                    select: { id: true, name: true, deletedAt: true },
                });

                if (!supplier) {
                    throw new ApiError(404, `Supplier with ID ${poData.supplierId} not found`);
                }

                if (supplier.deletedAt) {
                    throw new ApiError(400, `Cannot update purchase order to use inactive supplier: ${supplier.name}`);
                }
            }

            // Update purchase order
            const updatedPO = await this.prisma.purchaseOrder.update({
                where: { id },
                data: {
                    supplierId: poData.supplierId as unknown as number,
                    expectedDeliveryDate: poData.expectedDeliveryDate,
                    notes: poData.notes,
                },
                include: {
                    purchaseOrderItems: true,
                },
            });

            return updatedPO;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error updating purchase order");
            throw new ApiError(500, "Error updating purchase order");
        }
    }

    async updateStatus(poId: number, status: string): Promise<PurchaseOrder> {
        try {
            // Check if purchase order exists
            const existingPO = await this.prisma.purchaseOrder.findUnique({
                where: { id: poId },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!existingPO) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Validate status transition
            this.validateStatusTransition(existingPO.status, status as PurchaseOrderStatus);

            // Update purchase order status
            const updatedPO = await this.prisma.purchaseOrder.update({
                where: { id: poId },
                data: {
                    status: status as PurchaseOrderStatus,
                },
                include: {
                    purchaseOrderItems: true,
                },
            });

            return updatedPO;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, `Error updating purchase order status to ${status}`);
            throw new ApiError(500, `Error updating purchase order status to ${status}`);
        }
    }

    async receiveItems(
        poId: number,
        receivedItems: { itemId: number; quantityReceived: number; locationId: number }[],
    ): Promise<PurchaseOrderItem[]> {
        try {
            // Check if purchase order exists
            const existingPO = await this.prisma.purchaseOrder.findUnique({
                where: { id: poId },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!existingPO) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Can only receive items for submitted purchase orders
            if (existingPO.status !== "SUBMITTED") {
                throw new ApiError(400, `Cannot receive items for purchase order with status ${existingPO.status}`);
            }

            // Create a map of purchase order items for easier lookup
            const poItemsMap = new Map(existingPO.purchaseOrderItems.map((item) => [item.id, item]));

            // Process each received item
            const results = await this.prisma.$transaction(async (prisma) => {
                // Update each purchase order item
                const updatedItems = [];
                for (const item of receivedItems) {
                    const poItem = poItemsMap.get(item.itemId);
                    if (!poItem) {
                        throw new ApiError(404, `Purchase order item with ID ${item.itemId} not found`);
                    }

                    // Check if location exists
                    const location = await prisma.location.findUnique({
                        where: { id: item.locationId as number },
                    });

                    if (!location) {
                        throw new ApiError(404, `Location with ID ${item.locationId as number} not found`);
                    }

                    // Check that quantity received does not exceed quantity ordered
                    const newQuantityReceived = poItem.quantityReceived + item.quantityReceived;
                    if (newQuantityReceived > poItem.quantityOrdered) {
                        throw new ApiError(400, `Cannot receive more than ordered for item ${item.itemId}`);
                    }

                    // Update purchase order item
                    const updatedItem = await prisma.purchaseOrderItem.update({
                        where: { id: item.itemId },
                        data: {
                            quantityReceived: newQuantityReceived,
                        },
                    });

                    updatedItems.push(updatedItem);

                    // Update or create inventory
                    const existingInventory = await prisma.inventory.findFirst({
                        where: {
                            productId: poItem.productId,
                            locationId: item.locationId as number,
                        },
                    });

                    if (existingInventory) {
                        await prisma.inventory.update({
                            where: { id: existingInventory.id },
                            data: {
                                quantity: existingInventory.quantity + item.quantityReceived,
                            },
                        });
                    } else {
                        await prisma.inventory.create({
                            data: {
                                productId: poItem.productId,
                                locationId: item.locationId as number,
                                quantity: item.quantityReceived,
                                reservedQuantity: 0,
                            },
                        });
                    }

                    // Create inventory transaction
                    await prisma.inventoryTransaction.create({
                        data: {
                            transactionType: "IN",
                            productId: poItem.productId,
                            quantity: item.quantityReceived,
                            toLocationId: item.locationId as number,
                            referenceId: existingPO.id.toString(),
                            referenceType: "PURCHASE_ORDER",
                            userId: existingPO.userId,
                            notes: `Stock received from PO #${existingPO.poNumber}`,
                        },
                    });
                }

                // Check if all items have been fully received
                const updatedPO = await prisma.purchaseOrder.findUnique({
                    where: { id: poId },
                    include: {
                        purchaseOrderItems: true,
                    },
                });

                if (!updatedPO) {
                    throw new ApiError(404, "Purchase order not found");
                }

                const allItemsReceived = updatedPO.purchaseOrderItems.every((item) => item.quantityReceived >= item.quantityOrdered);

                // Update PO status if all items received
                if (allItemsReceived) {
                    await prisma.purchaseOrder.update({
                        where: { id: poId },
                        data: {
                            status: "RECEIVED",
                        },
                    });
                }

                return updatedItems;
            });

            return results;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error receiving purchase order items");
            throw new ApiError(500, "Error receiving purchase order items");
        }
    }

    private validateStatusTransition(currentStatus: PurchaseOrderStatus, newStatus: PurchaseOrderStatus): void {
        const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
            DRAFT: ["SUBMITTED", "CANCELED"],
            SUBMITTED: ["RECEIVED", "CANCELED"],
            RECEIVED: [], // Terminal state
            CANCELED: [], // Terminal state
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
            throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }

    async calculatePurchaseOrderTotals(
        items: { productId: number; quantityOrdered: number; unitCost: number }[],
    ): Promise<{ subtotal: number; tax: number; total: number }> {
        try {
            let subtotal = 0;
            let tax = 0;

            for (const item of items) {
                const product = await this.prisma.product.findUnique({
                    where: { id: item.productId },
                });

                if (!product) {
                    throw new ApiError(404, `Product with ID ${item.productId} not found`);
                }

                const itemSubtotal = item.unitCost * item.quantityOrdered;
                const itemTax = product.taxRate ? Number(((itemSubtotal * Number(product.taxRate)) / 100).toFixed(0)) : 0;

                subtotal += itemSubtotal;
                tax += itemTax;
            }

            const total = subtotal + tax;

            return { subtotal, tax, total };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error calculating purchase order totals");
            throw new ApiError(500, "Error calculating purchase order totals");
        }
    }

    async updateItem(purchaseOrderId: number, itemId: number, updates: { quantityOrdered?: number; unitCost?: number }): Promise<PurchaseOrderItem> {
        try {
            // Check if purchase order exists
            const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!purchaseOrder) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Can only update items for draft purchase orders
            if (purchaseOrder.status !== "DRAFT") {
                throw new ApiError(400, `Cannot update items for purchase order with status ${purchaseOrder.status}`);
            }

            // Check if item exists in this purchase order
            const item = purchaseOrder.purchaseOrderItems.find((item) => item.id === itemId);
            if (!item) {
                throw new ApiError(404, `Item with ID ${itemId} not found in this purchase order`);
            }

            // Calculate new subtotal
            const newQuantity = updates.quantityOrdered ?? item.quantityOrdered;
            const newUnitCost = updates.unitCost ?? item.unitCost;
            const itemSubtotal = newQuantity * newUnitCost;

            // Update item
            const updatedItem = await this.prisma.$transaction(async (prisma) => {
                // Update the PO item
                const updated = await prisma.purchaseOrderItem.update({
                    where: { id: itemId },
                    data: {
                        quantityOrdered: updates.quantityOrdered,
                        unitCost: updates.unitCost,
                        subtotal: itemSubtotal,
                    },
                });

                // Recalculate PO totals
                const allItems = await prisma.purchaseOrderItem.findMany({
                    where: { purchaseOrderId },
                });

                const poSubtotal = allItems.reduce((sum, item) => sum + item.subtotal, 0);

                // For tax, we need to get each product's tax rate
                let newTax = 0;
                for (const item of allItems) {
                    const product = await prisma.product.findUnique({
                        where: { id: item.productId },
                        select: { taxRate: true },
                    });

                    if (product && product.taxRate) {
                        const itemTax = Number(((item.subtotal * Number(product.taxRate)) / 100).toFixed(0));
                        newTax += itemTax;
                    }
                }

                const newTotal = poSubtotal + newTax;

                // Update the PO with new totals using a raw update to bypass type checking
                await prisma.$executeRaw`
                    UPDATE "PurchaseOrder" 
                    SET subtotal = ${poSubtotal}, tax = ${newTax}, total = ${newTotal}
                    WHERE id = ${purchaseOrderId}
                `;

                return updated;
            });

            return updatedItem;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error updating purchase order item");
            throw new ApiError(500, "Error updating purchase order item");
        }
    }

    async addItem(purchaseOrderId: number, item: { productId: number; quantityOrdered: number; unitCost: number }): Promise<PurchaseOrderItem> {
        try {
            // Check if purchase order exists
            const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
            });

            if (!purchaseOrder) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Can only add items to draft purchase orders
            if (purchaseOrder.status !== "DRAFT") {
                throw new ApiError(400, `Cannot add items to purchase order with status ${purchaseOrder.status}`);
            }

            // Check if product exists
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId, deletedAt: null },
            });

            if (!product) {
                throw new ApiError(404, `Product with ID ${item.productId} not found or inactive`);
            }

            // Calculate subtotal
            const subtotal = item.quantityOrdered * item.unitCost;
            const itemTax = product.taxRate ? Number(((subtotal * Number(product.taxRate)) / 100).toFixed(0)) : 0;

            // Add item
            const newItem = await this.prisma.$transaction(async (prisma) => {
                // Create the new PO item
                const created = await prisma.purchaseOrderItem.create({
                    data: {
                        purchaseOrderId,
                        productId: item.productId,
                        quantityOrdered: item.quantityOrdered,
                        quantityReceived: 0,
                        unitCost: item.unitCost,
                        subtotal,
                    },
                });

                // Update PO totals using raw SQL
                await prisma.$executeRaw`
                    UPDATE "PurchaseOrder" 
                    SET 
                        subtotal = (SELECT subtotal FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) + ${subtotal},
                        tax = (SELECT tax FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) + ${itemTax},
                        total = (SELECT total FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) + ${subtotal} + ${itemTax}
                    WHERE id = ${purchaseOrderId}
                `;

                return created;
            });

            return newItem;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error adding item to purchase order");
            throw new ApiError(500, "Error adding item to purchase order");
        }
    }

    async removeItem(purchaseOrderId: number, itemId: number): Promise<void> {
        try {
            // Check if purchase order exists
            const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
                include: {
                    purchaseOrderItems: true,
                },
            });

            if (!purchaseOrder) {
                throw new ApiError(404, "Purchase order not found");
            }

            // Can only remove items from draft purchase orders
            if (purchaseOrder.status !== "DRAFT") {
                throw new ApiError(400, `Cannot remove items from purchase order with status ${purchaseOrder.status}`);
            }

            // Check if item exists in this purchase order
            const item = purchaseOrder.purchaseOrderItems.find((item) => item.id === itemId);
            if (!item) {
                throw new ApiError(404, `Item with ID ${itemId} not found in this purchase order`);
            }

            // Need to ensure there's at least one item left
            if (purchaseOrder.purchaseOrderItems.length <= 1) {
                throw new ApiError(400, "Cannot remove the last item from a purchase order");
            }

            // Get the product to calculate tax
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: { taxRate: true },
            });

            let itemTax = 0;
            if (product && product.taxRate) {
                itemTax = Number(((item.subtotal * Number(product.taxRate)) / 100).toFixed(0));
            }

            // Remove item
            await this.prisma.$transaction(async (prisma) => {
                // Delete the PO item
                await prisma.purchaseOrderItem.delete({
                    where: { id: itemId },
                });

                // Update PO totals using raw SQL
                await prisma.$executeRaw`
                    UPDATE "PurchaseOrder" 
                    SET 
                        subtotal = (SELECT subtotal FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) - ${item.subtotal},
                        tax = (SELECT tax FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) - ${itemTax},
                        total = (SELECT total FROM "PurchaseOrder" WHERE id = ${purchaseOrderId}) - ${item.subtotal} - ${itemTax}
                    WHERE id = ${purchaseOrderId}
                `;
            });
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error removing item from purchase order");
            throw new ApiError(500, "Error removing item from purchase order");
        }
    }

    async filterPurchaseOrders(params?: PaginationParams & SearchFilter): Promise<{
        data: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const { page = 1, limit = 10, sortBy = "orderDate", sortOrder = "desc", filters = {} } = params || {};

            // Build where clause
            const where: Prisma.PurchaseOrderWhereInput = {};

            // Add status filter
            if (filters.status) {
                where.status = filters.status;
            }

            // Add supplier filter
            if (filters.supplierId) {
                where.supplierId = Number(filters.supplierId);
            }

            // Add date range filter
            if (filters.startDate && filters.endDate) {
                where.orderDate = {
                    gte: new Date(filters.startDate as string),
                    lte: new Date(filters.endDate as string),
                };
            } else if (filters.startDate) {
                where.orderDate = {
                    gte: new Date(filters.startDate as string),
                };
            } else if (filters.endDate) {
                where.orderDate = {
                    lte: new Date(filters.endDate as string),
                };
            }

            // Add total amount range filter
            if (filters.minTotal || filters.maxTotal) {
                where.total = {};
                if (filters.minTotal) {
                    where.total.gte = Number(filters.minTotal);
                }
                if (filters.maxTotal) {
                    where.total.lte = Number(filters.maxTotal);
                }
            }

            // Get total count
            const total = await this.prisma.purchaseOrder.count({ where });

            // Get purchase orders
            const purchaseOrders = await this.prisma.purchaseOrder.findMany({
                where,
                include: {
                    supplier: true,
                    purchaseOrderItems: {
                        include: {
                            product: true,
                        },
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: purchaseOrders,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            this.handleError(error, "Error filtering purchase orders");
            throw new ApiError(500, "Error filtering purchase orders");
        }
    }

    async generatePDF(poId: number): Promise<string> {
        try {
            // Placeholder implementation - would generate a PDF in a real app
            return `purchase_order_${poId}.pdf`;
        } catch (error) {
            this.handleError(error, `Error generating PDF for purchase order ${poId}`);
            throw error;
        }
    }
}
