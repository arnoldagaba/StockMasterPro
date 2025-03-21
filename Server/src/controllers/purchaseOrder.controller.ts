import { Request, Response } from "express";
import { purchaseOrderServiceInstance } from "@/services";
import { CreatePurchaseOrderInput, UpdatePurchaseOrderInput, ReceiveItemsInput } from "@/validators/purchaseOrder.validator";

export const createPurchaseOrder = async (req: Request, res: Response) => {
    try {
        const poData: CreatePurchaseOrderInput = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const { purchaseOrderItems } = poData;

        const purchaseOrder = await purchaseOrderServiceInstance.createPurchaseOrderWithItems(
            {
                supplier: { connect: { id: poData.supplierId } },
                expectedDeliveryDate: poData.expectedDeliveryDate,
                notes: poData.notes,
                user: { connect: { id: userId } },
                poNumber: "",
                total: 0,
            },
            purchaseOrderItems || [],
            userId,
        );

        return res.status(201).json({
            status: "success",
            message: "Purchase order created successfully",
            data: purchaseOrder,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error creating purchase order",
        });
    }
};

export const updatePurchaseOrder = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const poData: UpdatePurchaseOrderInput = req.body;

        const purchaseOrder = await purchaseOrderServiceInstance.updatePurchaseOrder(id, poData);

        return res.status(200).json({
            status: "success",
            message: "Purchase order updated successfully",
            data: purchaseOrder,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error updating purchase order",
        });
    }
};

export const updatePurchaseOrderStatus = async (req: Request, res: Response) => {
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

        const purchaseOrder = await purchaseOrderServiceInstance.updateStatus(id, status);

        return res.status(200).json({
            status: "success",
            message: `Purchase order status updated to ${status}`,
            data: purchaseOrder,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error updating purchase order status",
        });
    }
};

export const getPurchaseOrderById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);

        // First get the basic purchase order
        const purchaseOrder = await purchaseOrderServiceInstance.findById(id);

        if (!purchaseOrder) {
            return res.status(404).json({
                status: "error",
                message: "Purchase order not found",
            });
        }

        // Then manually get the related data
        const purchaseOrderWithDetails = await purchaseOrderServiceInstance.findByPurchaseOrderNumber(purchaseOrder.poNumber);

        return res.status(200).json({
            status: "success",
            data: purchaseOrderWithDetails,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving purchase order",
        });
    }
};

export const getPurchaseOrderByNumber = async (req: Request, res: Response) => {
    try {
        const poNumber = req.params.poNumber;

        const purchaseOrder = await purchaseOrderServiceInstance.findByPurchaseOrderNumber(poNumber);

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
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving purchase order",
        });
    }
};

export const getAllPurchaseOrders = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, status, supplierId, startDate, endDate, minTotal, maxTotal } = req.query;

        const filters: Record<string, unknown> = {};

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

        const result = await purchaseOrderServiceInstance.filterPurchaseOrders({
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
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving purchase orders",
        });
    }
};

export const getPurchaseOrdersBySupplier = async (req: Request, res: Response) => {
    try {
        const supplierId = Number(req.params.supplierId);

        const purchaseOrders = await purchaseOrderServiceInstance.findBySupplier(supplierId);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving supplier purchase orders",
        });
    }
};

export const getPurchaseOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const status = req.params.status;

        const purchaseOrders = await purchaseOrderServiceInstance.findByStatus(status);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving purchase orders by status",
        });
    }
};

export const getPurchaseOrdersByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.body;

        const start = new Date(startDate);
        const end = new Date(endDate);

        const purchaseOrders = await purchaseOrderServiceInstance.findByDateRange(start, end);

        return res.status(200).json({
            status: "success",
            data: purchaseOrders,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error retrieving purchase orders by date range",
        });
    }
};

export const calculatePurchaseOrderTotals = async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        const totals = await purchaseOrderServiceInstance.calculatePurchaseOrderTotals(items);

        return res.status(200).json({
            status: "success",
            data: totals,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error calculating purchase order totals",
        });
    }
};

export const receiveItems = async (req: Request, res: Response) => {
    try {
        const receiveData: ReceiveItemsInput = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                status: "error",
                message: "User not authenticated",
            });
        }

        const result = await purchaseOrderServiceInstance.receiveItems(receiveData.purchaseOrderId, receiveData.receivedItems);

        return res.status(200).json({
            status: "success",
            message: "Items received successfully",
            data: result,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error receiving purchase order items",
        });
    }
};

export const updateItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemId = Number(req.params.itemId);
        const updates = req.body;

        const updatedItem = await purchaseOrderServiceInstance.updateItem(purchaseOrderId, itemId, updates);

        return res.status(200).json({
            status: "success",
            message: "Item updated successfully",
            data: updatedItem,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error updating purchase order item",
        });
    }
};

export const addItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemData = req.body;

        const newItem = await purchaseOrderServiceInstance.addItem(purchaseOrderId, itemData);

        return res.status(201).json({
            status: "success",
            message: "Item added successfully",
            data: newItem,
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error adding item to purchase order",
        });
    }
};

export const removeItem = async (req: Request, res: Response) => {
    try {
        const purchaseOrderId = Number(req.params.id);
        const itemId = Number(req.params.itemId);

        await purchaseOrderServiceInstance.removeItem(purchaseOrderId, itemId);

        return res.status(200).json({
            status: "success",
            message: "Item removed successfully",
        });
    } catch (error: unknown) {
        const err = error as Error & { statusCode?: number };
        return res.status(err.statusCode || 500).json({
            status: "error",
            message: err.message || "Error removing item from purchase order",
        });
    }
};
