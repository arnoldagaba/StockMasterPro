import express from "express";
import {
    createPurchaseOrder,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    getPurchaseOrderById,
    getPurchaseOrderByNumber,
    getAllPurchaseOrders,
    getPurchaseOrdersBySupplier,
    getPurchaseOrdersByStatus,
    getPurchaseOrdersByDateRange,
    calculatePurchaseOrderTotals,
    receiveItems,
    updateItem,
    addItem,
    removeItem,
} from "../controllers/purchaseOrder.controller";
import { validate } from "../middleware/validate";
import {
    createPurchaseOrderSchema,
    updatePurchaseOrderSchema,
    getPurchaseOrderSchema,
    updatePurchaseOrderStatusSchema,
    getPurchaseOrdersBySupplierSchema,
    getPurchaseOrdersByDateRangeSchema,
    filterPurchaseOrdersSchema,
    receiveItemsSchema,
} from "../validators/purchaseOrder.validator";
import { auth } from "../middleware/auth";
import { checkPermission } from "../middleware/checkPermission";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create purchase order
router.post("/", checkPermission("purchaseOrder:create"), validate(createPurchaseOrderSchema), createPurchaseOrder);

// Update purchase order
router.put("/:id", checkPermission("purchaseOrder:update"), validate(updatePurchaseOrderSchema), updatePurchaseOrder);

// Update purchase order status
router.patch("/:id/status", checkPermission("purchaseOrder:update"), validate(updatePurchaseOrderStatusSchema), updatePurchaseOrderStatus);

// Get purchase order by ID
router.get("/:id", checkPermission("purchaseOrder:read"), validate(getPurchaseOrderSchema), getPurchaseOrderById);

// Get purchase order by number
router.get("/number/:poNumber", checkPermission("purchaseOrder:read"), getPurchaseOrderByNumber);

// Get all purchase orders with filtering and pagination
router.get("/", checkPermission("purchaseOrder:read"), validate(filterPurchaseOrdersSchema), getAllPurchaseOrders);

// Get purchase orders by supplier
router.get("/supplier/:supplierId", checkPermission("purchaseOrder:read"), validate(getPurchaseOrdersBySupplierSchema), getPurchaseOrdersBySupplier);

// Get purchase orders by status
router.get("/status/:status", checkPermission("purchaseOrder:read"), getPurchaseOrdersByStatus);

// Get purchase orders by date range
router.post("/date-range", checkPermission("purchaseOrder:read"), validate(getPurchaseOrdersByDateRangeSchema), getPurchaseOrdersByDateRange);

// Calculate purchase order totals
router.post("/calculate-totals", checkPermission("purchaseOrder:read"), calculatePurchaseOrderTotals);

// Receive items
router.post("/receive", checkPermission("purchaseOrder:update"), validate(receiveItemsSchema), receiveItems);

// Add item to purchase order
router.post("/:id/items", checkPermission("purchaseOrder:update"), addItem);

// Update item in purchase order
router.put("/:id/items/:itemId", checkPermission("purchaseOrder:update"), updateItem);

// Remove item from purchase order
router.delete("/:id/items/:itemId", checkPermission("purchaseOrder:update"), removeItem);

export default router;
