import { Request, Response } from "express";
import { orderService } from "../services/order.service";
import { CreateOrderInput, UpdateOrderInput, UpdateOrderStatusInput, ProcessPaymentInput } from "../validators/order.validator";

export const createOrder = async (req: Request, res: Response) => {
    try {
        const orderData: CreateOrderInput = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const order = await orderService.createOrderWithItems(orderData, userId);

        return res.status(201).json({
            status: "success",
            message: "Order created successfully",
            data: order,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error creating order",
        });
    }
};

export const updateOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const orderData: UpdateOrderInput = req.body;

        const order = await orderService.updateOrder(id, orderData);

        return res.status(200).json({
            status: "success",
            message: "Order updated successfully",
            data: order,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating order",
        });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const order = await orderService.updateStatus(id, status, userId);

        return res.status(200).json({
            status: "success",
            message: `Order status updated to ${status}`,
            data: order,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating order status",
        });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const order = await orderService.findById(id, {
            include: {
                customer: true,
                orderItems: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving order",
        });
    }
};

export const getOrderByNumber = async (req: Request, res: Response) => {
    try {
        const orderNumber = req.params.orderNumber;

        const order = await orderService.findByOrderNumber(orderNumber);

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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving order",
        });
    }
};

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, status, customerId, startDate, endDate, minTotal, maxTotal } = req.query;

        const filters: any = {};

        if (status) {
            filters.status = status;
        }

        if (customerId) {
            filters.customerId = customerId;
        }

        if (startDate) {
            filters.startDate = startDate;
        }

        if (endDate) {
            filters.endDate = endDate;
        }

        if (minTotal) {
            filters.minTotal = minTotal;
        }

        if (maxTotal) {
            filters.maxTotal = maxTotal;
        }

        const result = await orderService.filterOrders({
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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving orders",
        });
    }
};

export const getOrdersByCustomer = async (req: Request, res: Response) => {
    try {
        const customerId = Number(req.params.customerId);

        const orders = await orderService.findByCustomer(customerId);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving customer orders",
        });
    }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const status = req.params.status;

        const orders = await orderService.findByStatus(status);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving orders by status",
        });
    }
};

export const getOrdersByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const orders = await orderService.findByDateRange(start, end);

        return res.status(200).json({
            status: "success",
            data: orders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving orders by date range",
        });
    }
};

export const calculateOrderTotals = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        const totals = await orderService.calculateOrderTotals(items);

        return res.status(200).json({
            status: "success",
            data: totals,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error calculating order totals",
        });
    }
};

export const processPayment = async (req: Request, res: Response) => {
    try {
        const paymentData: ProcessPaymentInput = req.body;

        const result = await orderService.processPayment(paymentData.orderId, paymentData.paymentMethod, paymentData.amount);

        return res.status(200).json({
            status: "success",
            message: "Payment processed successfully",
            data: { success: result },
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error processing payment",
        });
    }
};

export const generateInvoice = async (req: Request, res: Response) => {
    try {
        const orderId = Number(req.params.id);

        const invoiceUrl = await orderService.generateInvoice(orderId);

        return res.status(200).json({
            status: "success",
            data: { invoiceUrl },
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error generating invoice",
        });
    }
};
