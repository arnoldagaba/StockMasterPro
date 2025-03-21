import { UserService } from "./user.service";
import { RoleService } from "./role.service";
import { PermissionService } from "./permission.service";
import { CategoryService } from "./category.service";
import { ProductService } from "./product.service";
import { SupplierService } from "./supplier.service";
import prisma from "@/config/prisma";
import { CustomerService } from "./customer.service";
import { InventoryService } from "./inventory.service";
import { LocationService } from "./location.service";
import { OrderService } from "./order.service";
import { PurchaseOrderService } from "./purchaseOrder.service";

// Create service instances
const userServiceInstance = new UserService(prisma);
const roleServiceInstance = new RoleService(prisma);
const permissionServiceInstance = new PermissionService(prisma);
const categoryServiceInstance = new CategoryService(prisma);
const productServiceInstance = new ProductService(prisma);
const supplierServiceInstance = new SupplierService(prisma);
const customerServiceInstance = new CustomerService(prisma);
const inventoryServiceInstance = new InventoryService(prisma);
const locationServiceInstance = new LocationService(prisma);
const orderServiceInstance = new OrderService(prisma);
const purchaseOrderServiceInstance = new PurchaseOrderService(prisma);

// Export service instances
export { userServiceInstance, roleServiceInstance, permissionServiceInstance, categoryServiceInstance, productServiceInstance, supplierServiceInstance, customerServiceInstance, inventoryServiceInstance, locationServiceInstance, orderServiceInstance, purchaseOrderServiceInstance };

// Export service classes
export { UserService, RoleService, PermissionService, CategoryService, ProductService, SupplierService };

