import { Request, Response } from "express";
import { inventoryServiceInstance } from "@/services";
import {
    AdjustQuantityInput,
    CreateInventoryInput,
    ReserveStockInput,
    TransferInventoryInput,
    UnreserveStockInput,
    UpdateInventoryInput,
} from "@/validators/inventory.validator";
import { ApiError } from "@/utils/apiError";

// Inventory filters interface
interface InventoryFilters {
    productId?: number;
    locationId?: number;
    minQuantity?: number;
    maxQuantity?: number;
    [key: string]: unknown;
}

export const createInventory = async (req: Request, res: Response) => {
    try {
        const inventoryData: CreateInventoryInput = req.body;
        const inventory = await inventoryServiceInstance.createInventory(inventoryData);

        return res.status(201).json({
            status: "success",
            message: "Inventory record created successfully",
            data: inventory,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error creating inventory record";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const updateInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventoryData: UpdateInventoryInput = req.body;
        const inventory = await inventoryServiceInstance.updateInventory(id, inventoryData);

        return res.status(200).json({
            status: "success",
            message: "Inventory record updated successfully",
            data: inventory,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error updating inventory record";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const deleteInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventory = await inventoryServiceInstance.deleteInventory(id);

        return res.status(200).json({
            status: "success",
            message: "Inventory record deleted successfully",
            data: inventory,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error deleting inventory record";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getInventoryById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const inventory = await inventoryServiceInstance.getInventoryById(id);

        return res.status(200).json({
            status: "success",
            data: inventory,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving inventory record";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getAllInventory = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, productId, locationId, minQuantity, maxQuantity } = req.query;

        const filters: InventoryFilters = {};

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

        const inventoryItems = await inventoryServiceInstance.getAllInventory({
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving inventory records";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const findByProductAndLocation = async (req: Request, res: Response) => {
    try {
        const productId = Number(req.params.productId);
        const locationId = Number(req.params.locationId);

        const inventory = await inventoryServiceInstance.findByProductAndLocation(productId, locationId);

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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error finding inventory record";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const adjustQuantity = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, reason }: AdjustQuantityInput = req.body;

        const transaction = await inventoryServiceInstance.adjustQuantity(productId, locationId, quantity, reason);

        return res.status(200).json({
            status: "success",
            message: "Inventory quantity adjusted successfully",
            data: transaction,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error adjusting inventory quantity";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const transferInventory = async (req: Request, res: Response) => {
    try {
        const { productId, fromLocationId, toLocationId, quantity }: TransferInventoryInput = req.body;

        const transaction = await inventoryServiceInstance.transferInventory(productId, fromLocationId, toLocationId, quantity);

        return res.status(200).json({
            status: "success",
            message: "Inventory transferred successfully",
            data: transaction,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error transferring inventory";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const reserveStock = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, referenceId, referenceType }: ReserveStockInput = req.body;

        const result = await inventoryServiceInstance.reserveStock(productId, locationId, quantity, referenceId, referenceType);

        return res.status(200).json({
            status: "success",
            message: "Stock reserved successfully",
            data: { success: result },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error reserving stock";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const unreserveStock = async (req: Request, res: Response) => {
    try {
        const { productId, locationId, quantity, referenceId, referenceType }: UnreserveStockInput = req.body;

        const result = await inventoryServiceInstance.unreserveStock(productId, locationId, quantity, referenceId, referenceType);

        return res.status(200).json({
            status: "success",
            message: "Stock unreserved successfully",
            data: { success: result },
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error unreserving stock";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const checkLowStock = async (req: Request, res: Response) => {
    try {
        // Type casting to LowStockCheckInput with safe parsing
        const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
        const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;

        const lowStockItems = await inventoryServiceInstance.getLowStockItems(threshold, locationId);

        return res.status(200).json({
            status: "success",
            data: lowStockItems,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error checking low stock";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};
