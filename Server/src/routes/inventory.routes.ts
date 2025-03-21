import express from "express";
import {
    createInventory,
    updateInventory,
    deleteInventory,
    getInventoryById,
    getAllInventory,
    findByProductAndLocation,
    adjustQuantity,
    transferInventory,
    reserveStock,
    unreserveStock,
    checkLowStock,
} from "../controllers/inventory.controller";
import { validate } from "../middleware/validate";
import {
    createInventorySchema,
    updateInventorySchema,
    getInventorySchema,
    adjustQuantitySchema,
    transferInventorySchema,
    reserveStockSchema,
    unreserveStockSchema,
    lowStockThresholdSchema,
} from "../validators/inventory.validator";
import { auth } from "../middleware/auth";
import { checkPermission } from "../middleware/checkPermission";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create inventory record
router.post("/", checkPermission("inventory:create"), validate(createInventorySchema), createInventory);

// Update inventory record
router.put("/:id", checkPermission("inventory:update"), validate(updateInventorySchema), updateInventory);

// Delete inventory record
router.delete("/:id", checkPermission("inventory:delete"), validate(getInventorySchema), deleteInventory);

// Get inventory record by ID
router.get("/:id", checkPermission("inventory:read"), validate(getInventorySchema), getInventoryById);

// Get all inventory records (with filtering and pagination)
router.get("/", checkPermission("inventory:read"), getAllInventory);

// Get inventory by product and location
router.get("/product/:productId/location/:locationId", checkPermission("inventory:read"), findByProductAndLocation);

// Adjust inventory quantity
router.post("/adjust", checkPermission("inventory:update"), validate(adjustQuantitySchema), adjustQuantity);

// Transfer inventory between locations
router.post("/transfer", checkPermission("inventory:update"), validate(transferInventorySchema), transferInventory);

// Reserve stock
router.post("/reserve", checkPermission("inventory:update"), validate(reserveStockSchema), reserveStock);

// Unreserve stock
router.post("/unreserve", checkPermission("inventory:update"), validate(unreserveStockSchema), unreserveStock);

// Check low stock items
router.get("/low-stock/check", checkPermission("inventory:read"), checkLowStock);

export default router;
