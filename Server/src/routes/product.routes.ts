import { Router } from "express";
import * as productController from "../controllers/product.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
    createProductSchema,
    updateProductSchema,
    getProductSchema,
    getProductsByCategorySchema,
    addProductComponentSchema,
    removeProductComponentSchema,
    updateProductImageSchema,
} from "../validators/product.validator";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { hasPermission } from "../middlewares/hasPermission";

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Create product - requires create_product permission
router.post("/", hasPermission("create_product"), validateRequest(createProductSchema), productController.createProduct);

// Update product - requires update_product permission
router.put("/:id", hasPermission("update_product"), validateRequest(updateProductSchema), productController.updateProduct);

// Delete product - requires delete_product permission
router.delete("/:id", hasPermission("delete_product"), validateRequest(getProductSchema), productController.deleteProduct);

// Get product by ID
router.get("/:id", validateRequest(getProductSchema), productController.getProductById);

// Get all products
router.get("/", productController.getAllProducts);

// Get product by SKU
router.get("/sku", productController.getProductBySku);

// Get products by category
router.get("/category/:categoryId", validateRequest(getProductsByCategorySchema), productController.getProductsByCategory);

// Update product stock - requires manage_inventory permission
router.post("/:id/stock", hasPermission("manage_inventory"), validateRequest(getProductSchema), productController.updateProductStock);

// Get product with inventory
router.get("/:id/inventory", validateRequest(getProductSchema), productController.getProductWithInventory);

// Get product components
router.get("/:id/components", validateRequest(getProductSchema), productController.getProductComponents);

// Add component to product - requires update_product permission
router.post("/:id/components", hasPermission("update_product"), validateRequest(addProductComponentSchema), productController.addProductComponent);

// Remove component from product - requires update_product permission
router.delete(
    "/:id/components/:componentId",
    hasPermission("update_product"),
    validateRequest(removeProductComponentSchema),
    productController.removeProductComponent,
);

// Add image to product - requires update_product permission
router.post("/:id/images", hasPermission("update_product"), validateRequest(updateProductImageSchema), productController.addProductImage);

export default router;
