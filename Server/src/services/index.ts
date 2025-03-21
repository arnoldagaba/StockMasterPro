import { UserService } from "./user.service";
import { RoleService } from "./role.service";
import { PermissionService } from "./permission.service";
import { CategoryService } from "./category.service";
import { ProductService } from "./product.service";
import prisma from "@/config/prisma";

// Create service instances
const userService = new UserService(prisma);
const roleService = new RoleService(prisma);
const permissionService = new PermissionService(prisma);
const categoryService = new CategoryService(prisma);
const productService = new ProductService(prisma);

// Export services
export { userService, roleService, permissionService, categoryService, productService };

// Export service classes
export { UserService, RoleService, PermissionService, CategoryService, ProductService };
