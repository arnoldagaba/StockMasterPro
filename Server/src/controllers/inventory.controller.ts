import { Request, Response } from "express";
import { inventoryService } from "../services/inventory.service";
import {
    AdjustQuantityInput,
    CreateInventoryInput,
    LowStockCheckInput,
    ReserveStockInput,
    TransferInventoryInput,
    UnreserveStockInput,
    UpdateInventoryInput,
} from "../validators/inventory.validator";

export const createInventory = async (req: Request, res: Response) => {
    try {
        const inventoryData: CreateInventoryInput = req.body;
        const inventory = await inventoryService.createInventory(inventoryData);

        return res.status(201).json({
            status: "success",
            message: "Inventory record created successfully",
            data: inventory,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error creating inventory record",
        });
    }
};

export const updateInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventoryData: UpdateInventoryInput = req.body;
        const inventory = await inventoryService.updateInventory(id, inventoryData);

        return res.status(200).json({
            status: "success",
            message: "Inventory record updated successfully",
            data: inventory,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating inventory record",
        });
    }
};

export const deleteInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventory = await inventoryService.deleteInventory(id);

        return res.status(200).json({
            status: "success",
            message: "Inventory record deleted successfully",
            data: inventory,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error deleting inventory record",
        });
    }
};

export const getInventoryById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventory = await inventoryService.getInventoryById(id);

        return res.status(200).json({
            status: "success",
            data: inventory,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving inventory record",
        });
    }
};

export const getAllInventory = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, productId, locationId, minQuantity, maxQuantity } = req.query;

        const filters: any = {};

        if (productId) {
            filters.productId = Number(productId);
        }

        if (locationId) {
            filters.locationId = Number(locationId);
        }

        if (minQuantity) {
            filters.minQuantity = Number(minQuantity);
        }

        if (maxQuantity) {
            filters.maxQuantity = Number(maxQuantity);
        }

        const inventoryItems = await inventoryService.getAllInventory({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "asc",
            filters,
        });

        return res.status(200).json({
            status: "success",
            ...inventoryItems,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving inventory records",
        });
    }
};

export const findByProductAndLocation = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        const locationId = Number(req.params.locationId);

        const inventory = await inventoryService.findByProductAndLocation(productId, locationId);

        if (!inventory) {
            return res.status(404).json({
                status: "error",
                message: "Inventory record not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: inventory,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error finding inventory record",
        });
    }
};

export const adjustQuantity = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, reason }: AdjustQuantityInput = req.body;

        const transaction = await inventoryService.adjustQuantity(productId, locationId, quantity, reason);

        return res.status(200).json({
            status: "success",
            message: "Inventory quantity adjusted successfully",
            data: transaction,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error adjusting inventory quantity",
        });
    }
};

export const transferInventory = async (req: Request, res: Response) => {
    try {
        const { productId, fromLocationId, toLocationId, quantity, notes }: TransferInventoryInput = req.body;

        const transaction = await inventoryService.transferInventory(productId, fromLocationId, toLocationId, quantity);

        return res.status(200).json({
            status: "success",
            message: "Inventory transferred successfully",
            data: transaction,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error transferring inventory",
        });
    }
};

export const reserveStock = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, referenceId, referenceType }: ReserveStockInput = req.body;

        const result = await inventoryService.reserveStock(productId, locationId, quantity, referenceId, referenceType);

        return res.status(200).json({
            status: "success",
            message: "Stock reserved successfully",
            data: { success: result },
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error reserving stock",
        });
    }
};

export const unreserveStock = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, referenceId, referenceType }: UnreserveStockInput = req.body;

        const result = await inventoryService.unreserveStock(productId, locationId, quantity, referenceId, referenceType);

        return res.status(200).json({
            status: "success",
            message: "Stock unreserved successfully",
            data: { success: result },
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error unreserving stock",
        });
    }
};

export const checkLowStock = async (req: Request, res: Response) => {
    try {
        const { threshold, locationId }: LowStockCheckInput = req.query as any;

        const lowStockItems = await inventoryService.getLowStockItems(
            threshold ? Number(threshold) : undefined,
            locationId ? Number(locationId) : undefined,
        );

        return res.status(200).json({
            status: "success",
            data: lowStockItems,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error checking low stock",
        });
    }
};
