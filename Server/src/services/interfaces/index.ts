import { Prisma } from "@prisma/client";
import {
    User,
    Role,
    Permission,
    Category,
    Product,
    Supplier,
    Location,
    Inventory,
    Customer,
    Order,
    PurchaseOrder,
    InventoryTransaction,
    AlertSetting,
    Report,
    ApiKey,
    IntegrationLog,
    AuditLog,
    ProductComponent,
    ProductionOrder,
    OrderItem,
    PurchaseOrderItem,
    Notification,
} from "@prisma/client";
import { UpdatePurchaseOrderInput } from "../../validators/purchaseOrder.validator";

// Common interface for pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

// Common interface for search filters
export interface SearchFilter {
    searchTerm?: string;
    filters?: Record<string, unknown>;
}

// Base service interface with common CRUD operations
export interface BaseService<T, TCreateInput, TUpdateInput> {
    findAll(params?: PaginationParams & SearchFilter): Promise<{ data: T[]; total: number; page: number; limit: number }>;
    findById(id: number): Promise<T | null>;
    create(data: TCreateInput): Promise<T>;
    update(id: number, data: TUpdateInput): Promise<T>;
    delete(id: number): Promise<T>;
}

// Category hierarchy type
export interface CategoryHierarchyItem extends Category {
    subcategories: CategoryHierarchyItem[];
}

// User service interface
export interface IUserService extends BaseService<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
    findByEmail(email: string): Promise<User | null>;
    updatePassword(id: number, currentPassword: string, newPassword: string): Promise<boolean>;
    validateCredentials(email: string, password: string): Promise<User | null>;
    createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<{ user: User; token: string; refreshToken: string }>;
    refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string } | null>;
    logout(token: string): Promise<boolean>;
    isTokenValid(token: string): Promise<boolean>;
}

// Role service interface
export interface IRoleService extends BaseService<Role, Prisma.RoleCreateInput, Prisma.RoleUpdateInput> {
    findByName(name: string): Promise<Role | null>;
    assignPermissions(roleId: number, permissionIds: number[]): Promise<Role>;
    removePermissions(roleId: number, permissionIds: number[]): Promise<Role>;
    getUserRoles(userId: number): Promise<Role[]>;
}

// Permission service interface
export interface IPermissionService extends BaseService<Permission, Prisma.PermissionCreateInput, Prisma.PermissionUpdateInput> {
    findByName(name: string): Promise<Permission | null>;
    getRolePermissions(roleId: number): Promise<Permission[]>;
}

// Category service interface
export interface ICategoryService extends BaseService<Category, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput> {
    findByName(name: string): Promise<Category | null>;
    findSubcategories(categoryId: number): Promise<Category[]>;
    findWithProducts(categoryId: number): Promise<Category & { products: Product[] }>;
    getHierarchy(): Promise<CategoryHierarchyItem[]>; // Returns hierarchical category structure
}

// Product service interface
export interface IProductService extends BaseService<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> {
    findBySku(sku: string): Promise<Product | null>;
    findByCategory(
        categoryId: number,
        params?: PaginationParams & SearchFilter,
    ): Promise<{ data: Product[]; total: number; page: number; limit: number }>;
    updateStock(productId: number, locationId: number, quantity: number): Promise<Inventory>;
    getProductWithInventory(productId: number): Promise<Product & { inventory: Inventory[] }>;
    getProductComponents(productId: number): Promise<ProductComponent[]>;
    addProductComponent(productId: number, componentId: number, quantity: number, unit?: string): Promise<ProductComponent>;
    removeProductComponent(productId: number, componentId: number): Promise<boolean>;
    updateProductImage(productId: number, imageUrl: string, isDefault?: boolean): Promise<Product>;
}

// Supplier service interface
export interface ISupplierService extends BaseService<Supplier, Prisma.SupplierCreateInput, Prisma.SupplierUpdateInput> {
    findByName(name: string): Promise<Supplier[]>;
    getSupplierWithPurchaseOrders(supplierId: number): Promise<Supplier & { purchaseOrders: PurchaseOrder[] }>;
}

// Location service interface
export interface ILocationService extends BaseService<Location, Prisma.LocationCreateInput, Prisma.LocationUpdateInput> {
    findByName(name: string): Promise<Location | null>;
    findByType(type: string): Promise<Location[]>;
    getLocationWithInventory(locationId: number): Promise<Location & { inventoryItems: Inventory[] }>;
}

// Inventory service interface
export interface IInventoryService extends BaseService<Inventory, Prisma.InventoryCreateInput, Prisma.InventoryUpdateInput> {
    findByProductAndLocation(productId: number, locationId: number): Promise<Inventory | null>;
    adjustQuantity(productId: number, locationId: number, quantity: number, reason: string): Promise<InventoryTransaction>;
    transferInventory(productId: number, fromLocationId: number, toLocationId: number, quantity: number): Promise<InventoryTransaction>;
    checkLowStock(): Promise<Inventory[]>;
    reserveStock(productId: number, locationId: number, quantity: number, referenceId: string, referenceType: string): Promise<boolean>;
    unreserveStock(productId: number, locationId: number, quantity: number, referenceId: string, referenceType: string): Promise<boolean>;
}

// Customer service interface
export interface ICustomerService extends BaseService<Customer, Prisma.CustomerCreateInput, Prisma.CustomerUpdateInput> {
    findByEmail(email: string): Promise<Customer | null>;
    findByPhone(phone: string): Promise<Customer | null>;
    getCustomerWithOrders(customerId: number): Promise<Customer & { orders: Order[] }>;
}

// Order service interface
export interface IOrderService extends BaseService<Order, Prisma.OrderCreateInput, Prisma.OrderUpdateInput> {
    findByOrderNumber(orderNumber: string): Promise<Order | null>;
    findByCustomer(customerId: number): Promise<Order[]>;
    findByStatus(status: string): Promise<Order[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;
    createOrderWithItems(data: Prisma.OrderCreateInput, items: Prisma.OrderItemCreateInput[]): Promise<Order & { orderItems: OrderItem[] }>;
    updateStatus(orderId: number, status: string): Promise<Order>;
    calculateOrderTotals(items: { productId: number; quantity: number }[]): Promise<{ subtotal: number; tax: number; total: number }>;
    processPayment(orderId: number, paymentMethod: string, amount: number): Promise<boolean>;
    generateInvoice(orderId: number): Promise<string>; // Returns invoice URL or path
}

// Purchase Order service interface
export interface IPurchaseOrderService extends BaseService<PurchaseOrder, Prisma.PurchaseOrderCreateInput, Prisma.PurchaseOrderUpdateInput> {
    findByPONumber(poNumber: string): Promise<PurchaseOrder | null>;
    findBySupplier(supplierId: number): Promise<PurchaseOrder[]>;
    findByStatus(status: string): Promise<PurchaseOrder[]>;
    createPurchaseOrderWithItems(
        data: Prisma.PurchaseOrderCreateInput,
        items: Prisma.PurchaseOrderItemCreateInput[],
    ): Promise<PurchaseOrder & { purchaseOrderItems: PurchaseOrderItem[] }>;
    updatePurchaseOrder(id: number, poData: UpdatePurchaseOrderInput): Promise<PurchaseOrder>;
    updateStatus(poId: number, status: string, userId?: number): Promise<PurchaseOrder>;
    receiveItems(poId: number, receivedItems: { itemId: number; quantityReceived: number }[]): Promise<PurchaseOrderItem[]>;
    generatePDF(poId: number): Promise<string>; // Returns PO PDF URL or path
}

// Inventory Transaction service interface
export interface IInventoryTransactionService
    extends BaseService<InventoryTransaction, Prisma.InventoryTransactionCreateInput, Prisma.InventoryTransactionUpdateInput> {
    findByProduct(productId: number): Promise<InventoryTransaction[]>;
    findByLocation(locationId: number): Promise<InventoryTransaction[]>;
    findByType(type: string): Promise<InventoryTransaction[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<InventoryTransaction[]>;
    findByReference(referenceId: string, referenceType: string): Promise<InventoryTransaction[]>;
}

// Report data interface
export type ReportData = Record<string, string | number | boolean | Date | Record<string, unknown>>;

// Alert Setting service interface
export interface IAlertSettingService extends BaseService<AlertSetting, Prisma.AlertSettingCreateInput, Prisma.AlertSettingUpdateInput> {
    findByProduct(productId: number): Promise<AlertSetting[]>;
    findByCategory(categoryId: number): Promise<AlertSetting[]>;
    findByLocation(locationId: number): Promise<AlertSetting[]>;
    findByType(type: string): Promise<AlertSetting[]>;
    findActiveAlerts(): Promise<AlertSetting[]>;
    toggleAlertStatus(alertId: number): Promise<AlertSetting>;
    checkAndTriggerAlerts(): Promise<Notification[]>;
    addRecipientUsers(alertId: number, userIds: number[]): Promise<AlertSetting>;
    removeRecipientUsers(alertId: number, userIds: number[]): Promise<AlertSetting>;
}

// Notification service interface
export interface INotificationService extends BaseService<Notification, Prisma.NotificationCreateInput, Prisma.NotificationUpdateInput> {
    findByUser(userId: number): Promise<Notification[]>;
    findUnreadByUser(userId: number): Promise<Notification[]>;
    markAsRead(notificationId: number): Promise<Notification>;
    markAllAsRead(userId: number): Promise<number>; // Returns count of notifications marked as read
    sendNotification(
        userId: number,
        title: string,
        content: string,
        type: string,
        referenceId?: string,
        referenceType?: string,
    ): Promise<Notification>;
    sendBulkNotifications(
        userIds: number[],
        title: string,
        content: string,
        type: string,
        referenceId?: string,
        referenceType?: string,
    ): Promise<Notification[]>;
}

// Report service interface
export interface IReportService extends BaseService<Report, Prisma.ReportCreateInput, Prisma.ReportUpdateInput> {
    findByType(type: string): Promise<Report[]>;
    findByUser(userId: number): Promise<Report[]>;
    generateReport(reportId: number): Promise<ReportData>; // Returns report data
    runScheduledReports(): Promise<Report[]>;
    exportReport(reportId: number, format: "pdf" | "csv" | "excel"): Promise<string>; // Returns export URL or path
}

// Missing component interface
export interface MissingComponent {
    componentId: number;
    name: string;
    requiredQuantity: number;
    availableQuantity: number;
    shortageAmount: number;
}

// API Key service interface
export interface IApiKeyService extends BaseService<ApiKey, Prisma.ApiKeyCreateInput, Prisma.ApiKeyUpdateInput> {
    generateKey(name: string, userId: number, expiresIn?: number): Promise<{ apiKey: string; apiKeyRecord: ApiKey }>;
    validateKey(apiKey: string): Promise<ApiKey | null>;
    revokeKey(id: number): Promise<ApiKey>;
    updateKeyPermissions(keyId: number, permissions: Prisma.ApiKeyPermissionCreateInput[]): Promise<ApiKey>;
}

// Integration Log service interface
export interface IIntegrationLogService extends BaseService<IntegrationLog, Prisma.IntegrationLogCreateInput, Prisma.IntegrationLogUpdateInput> {
    findByType(type: string): Promise<IntegrationLog[]>;
    findByStatus(status: string): Promise<IntegrationLog[]>;
    findByApiKey(apiKeyId: number): Promise<IntegrationLog[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<IntegrationLog[]>;
    logIntegration(data: Prisma.IntegrationLogCreateInput): Promise<IntegrationLog>;
}

// Audit Log service interface
export interface IAuditLogService extends BaseService<AuditLog, Prisma.AuditLogCreateInput, Prisma.AuditLogUpdateInput> {
    findByUser(userId: number): Promise<AuditLog[]>;
    findByEntityType(entityType: string): Promise<AuditLog[]>;
    findByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
    findByAction(action: string): Promise<AuditLog[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
    logActivity(
        userId: number | null,
        action: string,
        entityType: string,
        entityId: string,
        oldValues?: Record<string, unknown>,
        newValues?: Record<string, unknown>,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuditLog>;
}

// Product Component service interface
export interface IProductComponentService
    extends BaseService<ProductComponent, Prisma.ProductComponentCreateInput, Prisma.ProductComponentUpdateInput> {
    findByProduct(productId: number): Promise<ProductComponent[]>;
    findByComponent(componentId: number): Promise<ProductComponent[]>;
    updateQuantity(productId: number, componentId: number, quantity: number): Promise<ProductComponent>;
}

// Production Order service interface
export interface IProductionOrderService extends BaseService<ProductionOrder, Prisma.ProductionOrderCreateInput, Prisma.ProductionOrderUpdateInput> {
    findByOrderNumber(orderNumber: string): Promise<ProductionOrder | null>;
    findByProduct(productId: number): Promise<ProductionOrder[]>;
    findByStatus(status: string): Promise<ProductionOrder[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<ProductionOrder[]>;
    updateStatus(orderId: number, status: string): Promise<ProductionOrder>;
    checkComponentAvailability(productId: number, quantity: number): Promise<{ available: boolean; missingComponents: MissingComponent[] }>;
    startProduction(orderId: number): Promise<ProductionOrder>;
    completeProduction(orderId: number): Promise<ProductionOrder>;
    cancelProduction(orderId: number): Promise<ProductionOrder>;
}
