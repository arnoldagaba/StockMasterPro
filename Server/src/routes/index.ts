import express from "express";
import healthRouter from "./health.routes";
import userRouter from "./user.routes";
import roleRouter from "./role.routes";
import permissionRouter from "./permission.routes";
import categoryRouter from "./category.routes";
import productRouter from "./product.routes";
import supplierRouter from "./supplier.routes";
import inventoryRouter from "./inventory.routes";
import locationRouter from "./location.routes";
import customerRouter from "./customer.routes";
import orderRouter from "./order.routes";
import purchaseOrderRouter from "./purchaseOrder.routes";

const router = express.Router();

router.use("/health", healthRouter);
router.use("/users", userRouter);
router.use("/roles", roleRouter);
router.use("/permissions", permissionRouter);
router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/suppliers", supplierRouter);
router.use("/inventory", inventoryRouter);
router.use("/locations", locationRouter);
router.use("/customers", customerRouter);
router.use("/orders", orderRouter);
router.use("/purchase-orders", purchaseOrderRouter);

export default router;
