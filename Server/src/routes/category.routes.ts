import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { createCategorySchema, updateCategorySchema, getCategorySchema } from "../validators/category.validator";
import { isAuthenticated } from "../middlewares/isAuthenticated";
import { hasPermission } from "../middlewares/hasPermission";

const router = Router();

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Create category - requires create_category permission
router.post("/", hasPermission("create_category"), validateRequest(createCategorySchema), categoryController.createCategory);

// Update category - requires update_category permission
router.put("/:id", hasPermission("update_category"), validateRequest(updateCategorySchema), categoryController.updateCategory);

// Delete category - requires delete_category permission
router.delete("/:id", hasPermission("delete_category"), validateRequest(getCategorySchema), categoryController.deleteCategory);

// Get category by ID
router.get("/:id", validateRequest(getCategorySchema), categoryController.getCategoryById);

// Get all categories
router.get("/", categoryController.getAllCategories);

// Get category hierarchy
router.get("/hierarchy", categoryController.getCategoryHierarchy);

// Get subcategories of a category
router.get("/:id/subcategories", validateRequest(getCategorySchema), categoryController.getSubcategories);

// Get category with its products
router.get("/:id/products", validateRequest(getCategorySchema), categoryController.getCategoryWithProducts);

export default router;
