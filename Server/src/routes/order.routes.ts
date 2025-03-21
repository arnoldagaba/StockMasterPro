import express from "express";
import {
    createOrder,
    updateOrder,
    updateOrderStatus,
    getOrderById,
    getOrderByNumber,
    getAllOrders,
    getOrdersByCustomer,
    getOrdersByStatus,
    getOrdersByDateRange,
    calculateOrderTotals,
    processPayment,
    generateInvoice,
} from "../controllers/order.controller";
import { validate } from "../middleware/validate";
import {
    createOrderSchema,
    updateOrderSchema,
    getOrderSchema,
    updateOrderStatusSchema,
    getOrdersByCustomerSchema,
    getOrdersByDateRangeSchema,
    filterOrdersSchema,
    processPaymentSchema,
} from "../validators/order.validator";
import { auth } from "../middleware/auth";
import { checkPermission } from "../middleware/checkPermission";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create order
router.post("/", checkPermission("order:create"), validate(createOrderSchema), createOrder);

// Update order
router.put("/:id", checkPermission("order:update"), validate(updateOrderSchema), updateOrder);

// Update order status
router.patch("/:id/status", checkPermission("order:update"), validate(updateOrderStatusSchema), updateOrderStatus);

// Get order by ID
router.get("/:id", checkPermission("order:read"), validate(getOrderSchema), getOrderById);

// Get order by order number
router.get("/number/:orderNumber", checkPermission("order:read"), getOrderByNumber);

// Get all orders with filtering and pagination
router.get("/", checkPermission("order:read"), validate(filterOrdersSchema), getAllOrders);

// Get orders by customer
router.get("/customer/:customerId", checkPermission("order:read"), validate(getOrdersByCustomerSchema), getOrdersByCustomer);

// Get orders by status
router.get("/status/:status", checkPermission("order:read"), getOrdersByStatus);

// Get orders by date range
router.post("/date-range", checkPermission("order:read"), validate(getOrdersByDateRangeSchema), getOrdersByDateRange);

// Calculate order totals
router.post("/calculate-totals", checkPermission("order:read"), calculateOrderTotals);

// Process payment
router.post("/payment", checkPermission("order:update"), validate(processPaymentSchema), processPayment);

// Generate invoice
router.get("/:id/invoice", checkPermission("order:read"), validate(getOrderSchema), generateInvoice);

export default router;
