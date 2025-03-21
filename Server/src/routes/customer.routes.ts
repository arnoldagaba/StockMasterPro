import express from "express";
import {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getAllCustomers,
    findCustomerByEmail,
    findCustomerByPhone,
    getCustomerWithOrders,
    searchCustomers,
    getCustomerOrderStats,
} from "../controllers/customer.controller";
import { validate } from "../middleware/validate";
import { createCustomerSchema, updateCustomerSchema, getCustomerSchema, searchCustomersSchema } from "../validators/customer.validator";
import { auth } from "../middleware/auth";
import { checkPermission } from "../middleware/checkPermission";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create customer
router.post("/", checkPermission("customer:create"), validate(createCustomerSchema), createCustomer);

// Update customer
router.put("/:id", checkPermission("customer:update"), validate(updateCustomerSchema), updateCustomer);

// Delete customer
router.delete("/:id", checkPermission("customer:delete"), validate(getCustomerSchema), deleteCustomer);

// Get customer by ID
router.get("/:id", checkPermission("customer:read"), validate(getCustomerSchema), getCustomerById);

// Get all customers (with filtering and pagination)
router.get("/", checkPermission("customer:read"), validate(searchCustomersSchema), getAllCustomers);

// Find customer by email
router.get("/email/:email", checkPermission("customer:read"), findCustomerByEmail);

// Find customer by phone
router.get("/phone/:phone", checkPermission("customer:read"), findCustomerByPhone);

// Get customer with orders
router.get("/:id/orders", checkPermission("customer:read"), validate(getCustomerSchema), getCustomerWithOrders);

// Search customers
router.get("/search", checkPermission("customer:read"), searchCustomers);

// Get customer order statistics
router.get("/:id/order-stats", checkPermission("customer:read"), validate(getCustomerSchema), getCustomerOrderStats);

export default router;
