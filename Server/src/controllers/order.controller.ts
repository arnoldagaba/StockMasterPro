import { Request, Response } from "express";
import { orderServiceInstance } from "@/services";
import { CreateOrderInput, UpdateOrderInput, ProcessPaymentInput } from "@/validators/order.validator";
import { Prisma } from "@prisma/client";

// Custom error interface with statusCode property
interface ApiError extends Error {
    statusCode?: number;
}

// Order filters interface
interface OrderFilters {
    status?: string | string[];
    customerId?: string | string[];
    startDate?: string | string[];
    endDate?: string | string[];
    minTotal?: string | string[];
    maxTotal?: string | string[];
    [key: string]: unknown;
}

export const createOrder = async (req: Request, res: Response) => {
    try {
        const orderData: CreateOrderInput = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        // First calculate order totals
        const totals = await orderServiceInstance.calculateOrderTotals(orderData.orderItems);

        // Create order with properly formatted data
        const orderInput: Prisma.OrderCreateInput = {
            orderNumber: `ORD${Date.now()}`,
            orderDate: new Date(),
            status: "PENDING",
            customer: { connect: { id: orderData.customerId } },
            user: { connect: { id: userId } },
            shippingAddress: orderData.shippingAddress,
            shippingMethod: orderData.shippingMethod,
            paymentMethod: orderData.paymentMethod,
            notes: orderData.notes,
            subtotal: totals.subtotal,
            tax: totals.tax,
            shippingCost: totals.shippingCost || 0,
            total: totals.total,
        };

        // Pass the order items with a type assertion
        const order = await orderServiceInstance.createOrderWithItems(orderInput, orderData.orderItems as unknown as Prisma.OrderItemCreateInput[]);

        return res.status(201).json({
            status: "success",
            message: "Order created successfully",
            data: order,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error creating order";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const updateOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const orderData: UpdateOrderInput = req.body;

        const order = await orderServiceInstance.updateOrder(id, orderData);

        return res.status(200).json({
            status: "success",
            message: "Order updated successfully",
            data: order,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error updating order";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const order = await orderServiceInstance.updateStatus(id, status);

        return res.status(200).json({
            status: "success",
            message: `Order status updated to ${status}`,
            data: order,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error updating order status";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const order = await orderServiceInstance.findById(id);

        if (!order) {
            return res.status(404).json({
                status: "error",
                message: "Order not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: order,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving order";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getOrderByNumber = async (req: Request, res: Response) => {
    try {
        const orderNumber = req.params.orderNumber;

        const order = await orderServiceInstance.findByOrderNumber(orderNumber);

        if (!order) {
            return res.status(404).json({
                status: "error",
                message: "Order not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: order,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving order";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, status, customerId, startDate, endDate, minTotal, maxTotal } = req.query;

        const filters: OrderFilters = {};

        if (status) {
            filters.status = status as string | string[];
        }

        if (customerId) {
            filters.customerId = customerId as string | string[];
        }

        if (startDate) {
            filters.startDate = startDate as string | string[];
        }

        if (endDate) {
            filters.endDate = endDate as string | string[];
        }

        if (minTotal) {
            filters.minTotal = minTotal as string | string[];
        }

        if (maxTotal) {
            filters.maxTotal = maxTotal as string | string[];
        }

        const result = await orderServiceInstance.filterOrders({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "desc",
            filters,
        });

        return res.status(200).json({
            status: "success",
            ...result,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving orders";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getOrdersByCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = Number(req.params.customerId);

        const orders = await orderServiceInstance.findByCustomer(customerId);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving customer orders";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const status = req.params.status;

        const orders = await orderServiceInstance.findByStatus(status);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving orders by status";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getOrdersByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const orders = await orderServiceInstance.findByDateRange(start, end);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving orders by date range";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const calculateOrderTotals = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        const totals = await orderServiceInstance.calculateOrderTotals(items);

        return res.status(200).json({
            status: "success",
            data: totals,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error calculating order totals";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const processPayment = async (req: Request, res: Response) => {
    try {
        const paymentData: ProcessPaymentInput = req.body;

        const result = await orderServiceInstance.processPayment(paymentData.orderId, paymentData.paymentMethod, paymentData.amount);

        return res.status(200).json({
            status: "success",
            message: "Payment processed successfully",
            data: { success: result },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error processing payment";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const generateInvoice = async (req: Request, res: Response) => {
    try {
        const orderId = Number(req.params.id);

        const invoiceUrl = await orderServiceInstance.generateInvoice(orderId);

        return res.status(200).json({
            status: "success",
            data: { invoiceUrl },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error generating invoice";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};
