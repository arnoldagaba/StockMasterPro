import { Router } from "express";
import * as supplierController from "../controllers/supplier.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { createSupplierSchema, updateSupplierSchema, getSupplierSchema, searchSuppliersSchema } from "../validators/supplier.validator";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { hasPermission } from "../middlewares/hasPermission";

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Create supplier - requires create_supplier permission
router.post("/", hasPermission("create_supplier"), validateRequest(createSupplierSchema), supplierController.createSupplier);

// Update supplier - requires update_supplier permission
router.put("/:id", hasPermission("update_supplier"), validateRequest(updateSupplierSchema), supplierController.updateSupplier);

// Delete supplier - requires delete_supplier permission
router.delete("/:id", hasPermission("delete_supplier"), validateRequest(getSupplierSchema), supplierController.deleteSupplier);

// Get supplier by ID
router.get("/:id", validateRequest(getSupplierSchema), supplierController.getSupplierById);

// Get all suppliers with optional search and pagination
router.get("/", validateRequest(searchSuppliersSchema), supplierController.getAllSuppliers);

// Search suppliers by name
router.get("/search", supplierController.findSuppliersByName);

// Get supplier with purchase orders
router.get("/:id/purchase-orders", validateRequest(getSupplierSchema), supplierController.getSupplierWithPurchaseOrders);

export default router;
