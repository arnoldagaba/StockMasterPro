import { PrismaClient, Order, OrderItem, OrderStatus, Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";
import { UpdateOrderInput } from "../validators/order.validator";
import { PaginationParams, SearchFilter, IOrderService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import { generateInvoiceNumber } from "../utils/generators";

export class OrderService extends BaseServiceImpl<Order, Prisma.OrderCreateInput, Prisma.OrderUpdateInput> implements IOrderService {
    constructor(prisma: PrismaClient) {
        super(prisma, "order");
    }

    async findByOrderNumber(orderNumber: string): Promise<Order | null> {
        try {
            const order = await this.prisma.order.findUnique({
                where: {
                    orderNumber,
                },
            });

            return order;
        } catch (error) {
            this.handleError(error, `Error finding order with order number ${orderNumber}`);
            throw error;
        }
    }

    async findByCustomer(customerId: number): Promise<Order[]> {
        try {
            const orders = await this.prisma.order.findMany({
                where: {
                    customerId,
                },
                include: {
                    orderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return orders;
        } catch (error) {
            this.handleError(error, `Error finding orders for customer ${customerId}`);
            throw error;
        }
    }

    async findByStatus(status: string): Promise<Order[]> {
        try {
            const orderStatus = status as OrderStatus;
            const orders = await this.prisma.order.findMany({
                where: {
                    status: orderStatus,
                },
                include: {
                    orderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return orders;
        } catch (error) {
            this.handleError(error, `Error finding orders with status ${status}`);
            throw error;
        }
    }

    async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
        try {
            const orders = await this.prisma.order.findMany({
                where: {
                    orderDate: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    orderItems: true,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            return orders;
        } catch (error) {
            this.handleError(error, `Error finding orders in date range`);
            throw error;
        }
    }

    async createOrderWithItems(data: Prisma.OrderCreateInput, items: Prisma.OrderItemCreateInput[]): Promise<Order & { orderItems: OrderItem[] }> {
        try {
            // Extract data for convenience
            const customerId = (data.customer as Prisma.CustomerCreateNestedOneWithoutOrdersInput)?.connect?.id;
            const shippingAddress = data.shippingAddress as string | undefined;
            const shippingMethod = data.shippingMethod as string | undefined;
            const paymentMethod = data.paymentMethod as string | undefined;
            const notes = data.notes as string | undefined;
            const userId = (data.user as Prisma.UserCreateNestedOneWithoutOrdersInput)?.connect?.id;

            if (!customerId) {
                throw new ApiError(400, "Customer ID is required");
            }

            if (!userId) {
                throw new ApiError(400, "User ID is required");
            }

            // Check if customer exists
            const customer = await this.prisma.customer.findUnique({
                where: { id: customerId },
            });

            if (!customer) {
                throw new ApiError(404, `Customer with ID ${customerId} not found`);
            }

            // Validate product IDs and check stock
            const productIds: number[] = [];
            const productIdsWithQuantity: { productId: number; quantity: number }[] = [];

            // Extract product IDs and quantities from items
            for (const item of items) {
                const productConnect = (item.product as Prisma.ProductCreateNestedOneWithoutOrderItemsInput)?.connect;
                if (!productConnect?.id) {
                    throw new ApiError(400, "Each item must have a valid product");
                }
                const productId = productConnect.id;
                const quantity = item.quantity as number;

                productIds.push(productId);
                productIdsWithQuantity.push({ productId, quantity });
            }

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

            // Check stock for each product
            for (const { productId, quantity } of productIdsWithQuantity) {
                const product = productMap.get(productId);
                if (!product) continue; // Should not happen due to earlier check

                // Get inventory for this product
                const inventory = await this.prisma.inventory.findMany({
                    where: {
                        productId,
                    },
                });

                // Calculate total available quantity across all locations
                const totalAvailable = inventory.reduce((sum, inv) => sum + inv.quantity - inv.reservedQuantity, 0);

                if (totalAvailable < quantity) {
                    throw new ApiError(
                        400,
                        `Not enough stock for product: ${product.name} (SKU: ${product.sku}). Available: ${totalAvailable}, Requested: ${quantity}`,
                    );
                }
            }

            // Calculate order totals
            let subtotal = 0;
            let tax = 0;
            const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

            for (const { productId, quantity } of productIdsWithQuantity) {
                const product = productMap.get(productId);
                if (!product) continue;

                const unitPrice = product.price;
                const unitCost = product.cost;
                const itemSubtotal = unitPrice * quantity;
                const itemTax = product.taxRate ? Number(((itemSubtotal * Number(product.taxRate)) / 100).toFixed(0)) : 0;

                subtotal += itemSubtotal;
                tax += itemTax;

                orderItems.push({
                    product: { connect: { id: productId } },
                    quantity,
                    unitPrice,
                    unitCost,
                    subtotal: itemSubtotal,
                });
            }

            const shippingCost = 0; // Can be calculated based on shipping method
            const total = subtotal + tax + shippingCost;

            // Generate order number
            const orderNumber = generateInvoiceNumber();

            // Create order with items in a single transaction
            const order = await this.prisma.$transaction(async (prisma) => {
                // Create order with items
                const createdOrder = await prisma.order.create({
                    data: {
                        orderNumber,
                        customer: { connect: { id: customerId } },
                        user: { connect: { id: userId } },
                        status: "PENDING",
                        shippingAddress,
                        shippingMethod,
                        paymentMethod,
                        subtotal,
                        tax,
                        shippingCost,
                        total,
                        notes,
                        orderItems: {
                            create: orderItems,
                        },
                    },
                    include: {
                        orderItems: true,
                    },
                });

                // Reserve inventory
                for (const { productId, quantity } of productIdsWithQuantity) {
                    // Find the location with most available stock
                    const inventoryItems = await prisma.inventory.findMany({
                        where: {
                            productId,
                        },
                        orderBy: {
                            quantity: "desc",
                        },
                    });

                    if (inventoryItems.length === 0) {
                        throw new ApiError(400, `No inventory found for product ID: ${productId}`);
                    }

                    let remainingQuantity = quantity;

                    // Reserve stock from locations until we fulfill the entire quantity
                    for (const invItem of inventoryItems) {
                        const availableQuantity = invItem.quantity - invItem.reservedQuantity;
                        if (availableQuantity <= 0) continue;

                        const quantityToReserve = Math.min(remainingQuantity, availableQuantity);

                        await prisma.inventory.update({
                            where: {
                                id: invItem.id,
                            },
                            data: {
                                reservedQuantity: invItem.reservedQuantity + quantityToReserve,
                            },
                        });

                        // Create inventory transaction for reservation
                        await prisma.inventoryTransaction.create({
                            data: {
                                transactionType: "OUT",
                                productId,
                                quantity: quantityToReserve,
                                fromLocationId: invItem.locationId,
                                referenceId: createdOrder.id.toString(),
                                referenceType: "ORDER",
                                userId,
                                notes: `Stock reserved for order #${orderNumber}`,
                            },
                        });

                        remainingQuantity -= quantityToReserve;
                        if (remainingQuantity <= 0) break;
                    }

                    if (remainingQuantity > 0) {
                        // This should not happen due to previous checks, but just in case
                        throw new ApiError(400, `Could not reserve enough stock for product ID: ${productId}`);
                    }
                }

                return createdOrder;
            });

            return order;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error creating order");
            throw new ApiError(500, "Error creating order");
        }
    }

    async updateOrder(id: number, orderData: UpdateOrderInput): Promise<Order> {
        try {
            // Check if order exists
            const existingOrder = await this.prisma.order.findUnique({
                where: { id },
                include: {
                    orderItems: true,
                },
            });

            if (!existingOrder) {
                throw new ApiError(404, "Order not found");
            }

            // Check order status - only allow updates to PENDING orders
            if (existingOrder.status !== "PENDING") {
                throw new ApiError(400, `Cannot update order with status ${existingOrder.status}`);
            }

            // Check if customer exists (if customer ID is being updated)
            if (orderData.customerId) {
                const customerId = Number(orderData.customerId);
                const customer = await this.prisma.customer.findUnique({
                    where: { id: customerId },
                });

                if (!customer) {
                    throw new ApiError(404, `Customer with ID ${customerId} not found`);
                }
            }

            // Update order
            const updatedOrder = await this.prisma.order.update({
                where: { id },
                data: {
                    // Convert customerId to proper number if provided
                    customerId: orderData.customerId ? Number(orderData.customerId) : undefined,
                    shippingAddress: orderData.shippingAddress,
                    shippingMethod: orderData.shippingMethod,
                    paymentMethod: orderData.paymentMethod,
                    notes: orderData.notes,
                },
                include: {
                    orderItems: true,
                },
            });

            return updatedOrder;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error updating order");
            throw new ApiError(500, "Error updating order");
        }
    }

    async updateStatus(orderId: number, status: string): Promise<Order> {
        try {
            // Implementation needs userId, get it from a context or default value
            const userId = 1; // Default user ID or get from auth context

            // Cast status to OrderStatus
            const orderStatus = status as OrderStatus;

            // Check if order exists
            const existingOrder = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: true,
                },
            });

            if (!existingOrder) {
                throw new ApiError(404, "Order not found");
            }

            // Validate status transition
            this.validateStatusTransition(existingOrder.status, orderStatus);

            // Handle status change in a transaction
            const updatedOrder = await this.prisma.$transaction(async (prisma) => {
                // Update order status
                const order = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        status: orderStatus,
                    },
                    include: {
                        orderItems: true,
                    },
                });

                // Handle inventory based on status change
                if (status === "SHIPPED" || status === "DELIVERED") {
                    // If order is shipped or delivered, convert reserved stock to actual deduction
                    for (const item of existingOrder.orderItems) {
                        // Find inventory entries with reserved quantities for this product
                        const inventoryItems = await prisma.inventory.findMany({
                            where: {
                                productId: item.productId,
                                reservedQuantity: {
                                    gt: 0,
                                },
                            },
                        });

                        let remainingQuantity = item.quantity;

                        // Process each inventory entry
                        for (const invItem of inventoryItems) {
                            if (remainingQuantity <= 0) break;

                            const quantityToDeduct = Math.min(remainingQuantity, invItem.reservedQuantity);

                            // Update inventory
                            await prisma.inventory.update({
                                where: {
                                    id: invItem.id,
                                },
                                data: {
                                    quantity: invItem.quantity - quantityToDeduct,
                                    reservedQuantity: invItem.reservedQuantity - quantityToDeduct,
                                },
                            });

                            // Create inventory transaction
                            await prisma.inventoryTransaction.create({
                                data: {
                                    transactionType: "OUT",
                                    productId: item.productId,
                                    quantity: quantityToDeduct,
                                    fromLocationId: invItem.locationId,
                                    referenceId: order.id.toString(),
                                    referenceType: "ORDER",
                                    userId,
                                    notes: `Stock removed for order #${order.orderNumber} (${status})`,
                                },
                            });

                            remainingQuantity -= quantityToDeduct;
                        }
                    }
                } else if (status === "CANCELED") {
                    // If order is canceled, unreserve stock
                    for (const item of existingOrder.orderItems) {
                        // Find inventory entries with reserved quantities for this product
                        const inventoryItems = await prisma.inventory.findMany({
                            where: {
                                productId: item.productId,
                                reservedQuantity: {
                                    gt: 0,
                                },
                            },
                        });

                        let remainingQuantity = item.quantity;

                        // Process each inventory entry
                        for (const invItem of inventoryItems) {
                            if (remainingQuantity <= 0) break;

                            const quantityToUnreserve = Math.min(remainingQuantity, invItem.reservedQuantity);

                            // Update inventory
                            await prisma.inventory.update({
                                where: {
                                    id: invItem.id,
                                },
                                data: {
                                    reservedQuantity: invItem.reservedQuantity - quantityToUnreserve,
                                },
                            });

                            // Create inventory transaction
                            await prisma.inventoryTransaction.create({
                                data: {
                                    transactionType: "IN",
                                    productId: item.productId,
                                    quantity: quantityToUnreserve,
                                    toLocationId: invItem.locationId,
                                    referenceId: order.id.toString(),
                                    referenceType: "ORDER_CANCELED",
                                    userId,
                                    notes: `Stock unreserved due to order #${order.orderNumber} cancellation`,
                                },
                            });

                            remainingQuantity -= quantityToUnreserve;
                        }
                    }
                }

                return order;
            });

            return updatedOrder;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, `Error updating order status to ${status}`);
            throw new ApiError(500, `Error updating order status to ${status}`);
        }
    }

    private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
        const validTransitions: Record<OrderStatus, OrderStatus[]> = {
            PENDING: ["PROCESSING", "CANCELED"],
            PROCESSING: ["SHIPPED", "CANCELED"],
            SHIPPED: ["DELIVERED", "CANCELED"],
            DELIVERED: [], // Terminal state
            CANCELED: [], // Terminal state
        };

        if (!validTransitions[currentStatus].includes(newStatus)) {
            throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }

    async calculateOrderTotals(
        items: { productId: number; quantity: number }[],
    ): Promise<{ subtotal: number; tax: number; total: number; shippingCost: number }> {
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

                const itemSubtotal = product.price * item.quantity;
                const itemTax = product.taxRate ? Number(((itemSubtotal * Number(product.taxRate)) / 100).toFixed(0)) : 0;

                subtotal += itemSubtotal;
                tax += itemTax;
            }

            const shippingCost = 0; // Can be calculated based on shipping method
            const total = subtotal + tax + shippingCost;

            return { subtotal, tax, total, shippingCost };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error calculating order totals");
            throw new ApiError(500, "Error calculating order totals");
        }
    }

    async processPayment(orderId: number, paymentMethod: string, amount: number): Promise<boolean> {
        try {
            // Check if order exists
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
            });

            if (!order) {
                throw new ApiError(404, "Order not found");
            }

            // Check if amount matches total
            if (amount !== order.total) {
                throw new ApiError(400, `Payment amount ${amount} does not match order total ${order.total}`);
            }

            // In a real-world scenario, this would integrate with a payment gateway
            // For now, we'll just update the order's payment method
            await this.prisma.order.update({
                where: { id: orderId },
                data: {
                    paymentMethod,
                },
            });

            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error processing payment");
            throw new ApiError(500, "Error processing payment");
        }
    }

    async generateInvoice(orderId: number): Promise<string> {
        try {
            // Check if order exists
            const order = await this.prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    customer: true,
                    orderItems: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!order) {
                throw new ApiError(404, "Order not found");
            }

            // In a real-world scenario, this would generate a PDF invoice
            // For now, we'll just return a dummy URL
            return `https://stockmaster.com/invoices/${order.orderNumber}.pdf`;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            this.handleError(error, "Error generating invoice");
            throw new ApiError(500, "Error generating invoice");
        }
    }

    async filterOrders(params?: PaginationParams & SearchFilter): Promise<{
        data: Order[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const { page = 1, limit = 10, sortBy = "orderDate", sortOrder = "desc", filters = {} } = params || {};

            // Build where clause
            const where: Prisma.OrderWhereInput = {};

            // Add status filter
            if (filters.status) {
                where.status = filters.status;
            }

            // Add customer filter
            if (filters.customerId) {
                where.customerId = Number(filters.customerId);
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
            const total = await this.prisma.order.count({ where });

            // Get orders
            const orders = await this.prisma.order.findMany({
                where,
                include: {
                    customer: true,
                    orderItems: {
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
                data: orders,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            this.handleError(error, "Error filtering orders");
            throw new ApiError(500, "Error filtering orders");
        }
    }
}
