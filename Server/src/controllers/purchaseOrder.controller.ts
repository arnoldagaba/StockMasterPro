import { Request, Response } from "express";
import { purchaseOrderService } from "../services/purchaseOrder.service";
import { CreatePurchaseOrderInput, UpdatePurchaseOrderInput, ReceiveItemsInput } from "../validators/purchaseOrder.validator";

export const createPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const poData: CreatePurchaseOrderInput = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const purchaseOrder = await purchaseOrderService.createPurchaseOrderWithItems(poData, userId);

        return res.status(201).json({
            status: "success",
            message: "Purchase order created successfully",
            data: purchaseOrder,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error creating purchase order",
        });
    }
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const poData: UpdatePurchaseOrderInput = req.body;

        const purchaseOrder = await purchaseOrderService.updatePurchaseOrder(id, poData);

        return res.status(200).json({
            status: "success",
            message: "Purchase order updated successfully",
            data: purchaseOrder,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating purchase order",
        });
    }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
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

        const purchaseOrder = await purchaseOrderService.updateStatus(id, status, userId);

        return res.status(200).json({
            status: "success",
            message: `Purchase order status updated to ${status}`,
            data: purchaseOrder,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating purchase order status",
        });
    }
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        const purchaseOrder = await purchaseOrderService.findById(id, {
            include: {
                supplier: true,
                purchaseOrderItems: {
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

        if (!purchaseOrder) {
            return res.status(404).json({
                status: "error",
                message: "Purchase order not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: purchaseOrder,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving purchase order",
        });
    }
};

export const getPurchaseOrderByNumber = async (req: Request, res: Response) => {
    try {
        const poNumber = req.params.poNumber;

        const purchaseOrder = await purchaseOrderService.findByPurchaseOrderNumber(poNumber);

        if (!purchaseOrder) {
            return res.status(404).json({
                status: "error",
                message: "Purchase order not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: purchaseOrder,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving purchase order",
        });
    }
};

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, status, supplierId, startDate, endDate, minTotal, maxTotal } = req.query;

        const filters: any = {};

        if (status) {
            filters.status = status;
        }

        if (supplierId) {
            filters.supplierId = supplierId;
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

        const result = await purchaseOrderService.filterPurchaseOrders({
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
            message: error.message || "Error retrieving purchase orders",
        });
    }
};

export const getPurchaseOrdersBySupplier = async (req: Request, res: Response) => {
    try {
        const supplierId = Number(req.params.supplierId);

        const purchaseOrders = await purchaseOrderService.findBySupplier(supplierId);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving supplier purchase orders",
        });
    }
};

export const getPurchaseOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const status = req.params.status;

        const purchaseOrders = await purchaseOrderService.findByStatus(status);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving purchase orders by status",
        });
    }
};

export const getPurchaseOrdersByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const purchaseOrders = await purchaseOrderService.findByDateRange(start, end);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving purchase orders by date range",
        });
    }
};

export const calculatePurchaseOrderTotals = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        const totals = await purchaseOrderService.calculatePurchaseOrderTotals(items);

        return res.status(200).json({
            status: "success",
            data: totals,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error calculating purchase order totals",
        });
    }
};

export const receiveItems = async (req: Request, res: Response) => {
    try {
        const receiveData: ReceiveItemsInput = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const result = await purchaseOrderService.receiveItems(receiveData, userId);

        return res.status(200).json({
            status: "success",
            message: "Items received successfully",
            data: result,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error receiving purchase order items",
        });
    }
};

export const updateItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemId = Number(req.params.itemId);
        const updates = req.body;

        const updatedItem = await purchaseOrderService.updateItem(purchaseOrderId, itemId, updates);

        return res.status(200).json({
            status: "success",
            message: "Item updated successfully",
            data: updatedItem,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating purchase order item",
        });
    }
};

export const addItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemData = req.body;

        const newItem = await purchaseOrderService.addItem(purchaseOrderId, itemData);

        return res.status(201).json({
            status: "success",
            message: "Item added successfully",
            data: newItem,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error adding item to purchase order",
        });
    }
};

export const removeItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemId = Number(req.params.itemId);

        await purchaseOrderService.removeItem(purchaseOrderId, itemId);

        return res.status(200).json({
            status: "success",
            message: "Item removed successfully",
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error removing item from purchase order",
        });
    }
};
