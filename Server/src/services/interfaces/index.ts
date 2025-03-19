import {
    User,
    Role,
    UserSession,
    ProductionOrder,
    ProductionOrderStatus,
    Product,
    AuditLog,
    IntegrationLog,
    IntegrationStatus,
    IntegrationDirection,
    ApiKey,
    PermissionType,
    ApiKeyPermission,
    ReportData,
    ReportType,
    ReportParameter,
    AlertRecipientUser,
    NotificationChannel,
    AlertNotificationChannel,
    AlertSetting,
    AlertType,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Supplier,
    OrderItem,
    Order,
    Customer,
    OrderStatus,
    Inventory,
    LocationType,
    InventoryTransaction,
    InventoryTransactionType,
    Category,
    ProductComponent,
    ProductImage,
    RoleName,
    Permission,
} from "@prisma/client";

export interface CreateUserDTO {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    roleId: number;
}

export interface UpdateUserDTO {
    email?: string;
    firstName?: string;
    lastName?: string;
    roleId?: number;
    password?: string;
}

export interface UserLoginDTO {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface UserLoginResponse {
    user: User;
    token: string;
    refreshToken: string;
}

export interface IUserService {
    create(data: CreateUserDTO): Promise<User>;
    findById(id: number): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    update(id: number, data: UpdateUserDTO): Promise<User>;
    delete(id: number): Promise<User>;
    login(credentials: UserLoginDTO): Promise<UserLoginResponse>;
    refreshToken(token: string): Promise<UserLoginResponse>;
    logout(userId: number): Promise<boolean>;
    changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean>;
    getUserWithRole(userId: number): Promise<(User & { role: Role }) | null>;
    getSessions(userId: number): Promise<UserSession[]>;
    terminateSession(sessionId: number): Promise<boolean>;
}

export interface CreateRoleDTO {
    name: RoleName;
    description?: string;
    permissionIds?: number[];
}

export interface UpdateRoleDTO {
    description?: string;
    permissionIds?: number[];
}

export interface IRoleService {
    create(data: CreateRoleDTO): Promise<Role>;
    findById(id: number): Promise<Role | null>;
    findByName(name: RoleName): Promise<Role | null>;
    findAll(): Promise<Role[]>;
    update(id: number, data: UpdateRoleDTO): Promise<Role>;
    delete(id: number): Promise<Role>;
    addPermission(roleId: number, permissionId: number): Promise<Role>;
    removePermission(roleId: number, permissionId: number): Promise<Role>;
    getRoleWithPermissions(roleId: number): Promise<(Role & { permissions: Permission[] }) | null>;
}

export interface CreatePermissionDTO {
    name: string;
    description?: string;
}

export interface IPermissionService {
    create(data: CreatePermissionDTO): Promise<Permission>;
    findById(id: number): Promise<Permission | null>;
    findByName(name: string): Promise<Permission | null>;
    findAll(): Promise<Permission[]>;
    update(id: number, data: Partial<CreatePermissionDTO>): Promise<Permission>;
    delete(id: number): Promise<Permission>;
}

export interface CreateProductDTO {
    sku: string;
    name: string;
    description?: string;
    categoryId: number;
    price: number;
    cost: number;
    taxRate?: number;
    barcode?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    images?: {
        url: string;
        isDefault?: boolean;
        sortOrder?: number;
    }[];
    components?: {
        componentId: number;
        quantity: number;
        unit?: string;
    }[];
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    categoryId?: number;
    price?: number;
    cost?: number;
    taxRate?: number;
    barcode?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
}

export interface ProductWithRelations extends Product {
    category?: Category;
    images?: ProductImage[];
    components?: (ProductComponent & { component: Product })[];
}

export interface IProductService {
    create(data: CreateProductDTO): Promise<Product>;
    findById(id: number): Promise<Product | null>;
    findBySku(sku: string): Promise<Product | null>;
    findByBarcode(barcode: string): Promise<Product | null>;
    findAll(page?: number, limit?: number): Promise<Product[]>;
    findByCategory(categoryId: number): Promise<Product[]>;
    update(id: number, data: UpdateProductDTO): Promise<Product>;
    delete(id: number): Promise<Product>;
    getFullProductDetails(id: number): Promise<ProductWithRelations | null>;
    addProductImage(productId: number, imageUrl: string, isDefault?: boolean): Promise<ProductImage>;
    removeProductImage(imageId: number): Promise<boolean>;
    setDefaultImage(imageId: number): Promise<ProductImage>;
    addComponent(productId: number, componentId: number, quantity: number, unit?: string): Promise<ProductComponent>;
    removeComponent(productId: number, componentId: number): Promise<boolean>;
    updateComponent(productId: number, componentId: number, quantity: number, unit?: string): Promise<ProductComponent>;
    getProductStock(productId: number): Promise<{ locationId: number; locationName: string; quantity: number }[]>;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    parentId?: number;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    parentId?: number;
}

export interface CategoryWithChildren extends Category {
    subcategories?: CategoryWithChildren[];
}

export interface ICategoryService {
    create(data: CreateCategoryDTO): Promise<Category>;
    findById(id: number): Promise<Category | null>;
    findByName(name: string): Promise<Category | null>;
    findAll(): Promise<Category[]>;
    findRootCategories(): Promise<Category[]>;
    findSubcategories(parentId: number): Promise<Category[]>;
    update(id: number, data: UpdateCategoryDTO): Promise<Category>;
    delete(id: number): Promise<Category>;
    getCategoryTree(): Promise<CategoryWithChildren[]>;
}

export interface CreateSupplierDTO {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface UpdateSupplierDTO {
    name?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface ISupplierService {
    create(data: CreateSupplierDTO): Promise<Supplier>;
    findById(id: number): Promise<Supplier | null>;
    findAll(page?: number, limit?: number): Promise<Supplier[]>;
    update(id: number, data: UpdateSupplierDTO): Promise<Supplier>;
    delete(id: number): Promise<Supplier>;
    getPurchaseOrders(supplierId: number): Promise<PurchaseOrder[]>;
}

export interface CreateInventoryDTO {
    productId: number;
    locationId: number;
    quantity: number;
    reservedQuantity?: number;
    batchNumber?: string;
}

export interface UpdateInventoryDTO {
    quantity?: number;
    reservedQuantity?: number;
    batchNumber?: string;
}

export interface CreateInventoryTransactionDTO {
    transactionType: InventoryTransactionType;
    productId: number;
    quantity: number;
    fromLocationId?: number;
    toLocationId?: number;
    referenceId?: string;
    referenceType?: string;
    userId: number;
    notes?: string;
}

export interface InventoryWithDetails extends Inventory {
    product: Product;
    location: Location;
}

export interface IInventoryService {
    create(data: CreateInventoryDTO): Promise<Inventory>;
    findById(id: number): Promise<Inventory | null>;
    findByProductAndLocation(productId: number, locationId: number): Promise<Inventory | null>;
    findAll(page?: number, limit?: number): Promise<Inventory[]>;
    findByLocation(locationId: number): Promise<Inventory[]>;
    findByProduct(productId: number): Promise<Inventory[]>;
    update(id: number, data: UpdateInventoryDTO): Promise<Inventory>;
    incrementQuantity(productId: number, locationId: number, quantity: number): Promise<Inventory>;
    decrementQuantity(productId: number, locationId: number, quantity: number): Promise<Inventory>;
    reserveStock(productId: number, locationId: number, quantity: number): Promise<Inventory>;
    releaseReservedStock(productId: number, locationId: number, quantity: number): Promise<Inventory>;
    transferStock(productId: number, fromLocationId: number, toLocationId: number, quantity: number, userId: number): Promise<InventoryTransaction>;
    createTransaction(data: CreateInventoryTransactionDTO): Promise<InventoryTransaction>;
    getTransactions(
        productId?: number,
        locationId?: number,
        startDate?: Date,
        endDate?: Date,
        page?: number,
        limit?: number,
    ): Promise<InventoryTransaction[]>;
    getLowStockProducts(
        thresholdPercentage?: number,
    ): Promise<{ productId: number; productName: string; sku: string; currentStock: number; reorderPoint: number }[]>;
}

export interface CreateLocationDTO {
    name: string;
    type: LocationType;
    address?: string;
    contactInfo?: string;
    capacity?: number;
}

export interface UpdateLocationDTO {
    name?: string;
    type?: LocationType;
    address?: string;
    contactInfo?: string;
    capacity?: number;
}

export interface LocationWithInventory extends Location {
    inventoryItems: (Inventory & { product: Product })[];
}

export interface ILocationService {
    create(data: CreateLocationDTO): Promise<Location>;
    findById(id: number): Promise<Location | null>;
    findByName(name: string): Promise<Location | null>;
    findAll(): Promise<Location[]>;
    findByType(type: LocationType): Promise<Location[]>;
    update(id: number, data: UpdateLocationDTO): Promise<Location>;
    delete(id: number): Promise<Location>;
    getInventory(locationId: number): Promise<(Inventory & { product: Product })[]>;
    getLocationCapacityUtilization(locationId: number): Promise<{ capacity: number; used: number; available: number; utilizationPercentage: number }>;
}

export interface CreateCustomerDTO {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface UpdateCustomerDTO {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
}

export interface ICustomerService {
    create(data: CreateCustomerDTO): Promise<Customer>;
    findById(id: number): Promise<Customer | null>;
    findAll(page?: number, limit?: number): Promise<Customer[]>;
    update(id: number, data: UpdateCustomerDTO): Promise<Customer>;
    delete(id: number): Promise<Customer>;
    getOrders(customerId: number): Promise<Order[]>;
    getCustomerStats(customerId: number): Promise<{ totalOrders: number; totalSpent: number; lastOrderDate: Date | null }>;
}

export interface CreateOrderItemDTO {
    productId: number;
    quantity: number;
}

export interface CreateOrderDTO {
    customerId: number;
    userId: number;
    orderItems: CreateOrderItemDTO[];
    shippingAddress?: string;
    shippingMethod?: string;
    paymentMethod?: string;
    notes?: string;
}

export interface UpdateOrderDTO {
    status?: OrderStatus;
    shippingAddress?: string;
    shippingMethod?: string;
    paymentMethod?: string;
    notes?: string;
}

export interface OrderWithDetails extends Order {
    customer: Customer;
    user: User;
    orderItems: (OrderItem & { product: Product })[];
}

export interface IOrderService {
    create(data: CreateOrderDTO): Promise<Order>;
    findById(id: number): Promise<Order | null>;
    findByOrderNumber(orderNumber: string): Promise<Order | null>;
    findAll(page?: number, limit?: number): Promise<Order[]>;
    findByStatus(status: OrderStatus): Promise<Order[]>;
    findByCustomer(customerId: number): Promise<Order[]>;
    update(id: number, data: UpdateOrderDTO): Promise<Order>;
    updateStatus(id: number, status: OrderStatus): Promise<Order>;
    delete(id: number): Promise<Order>;
    getOrderWithDetails(id: number): Promise<OrderWithDetails | null>;
    addOrderItem(orderId: number, productId: number, quantity: number): Promise<OrderItem>;
    removeOrderItem(orderItemId: number): Promise<boolean>;
    updateOrderItem(orderItemId: number, quantity: number): Promise<OrderItem>;
    calculateOrderTotals(orderId: number): Promise<{ subtotal: number; tax: number; shippingCost: number; total: number }>;
}

export interface CreatePurchaseOrderItemDTO {
    productId: number;
    quantityOrdered: number;
    unitCost: number;
}

export interface CreatePurchaseOrderDTO {
    supplierId: number;
    userId: number;
    expectedDeliveryDate?: Date;
    status?: PurchaseOrderStatus;
    notes?: string;
    purchaseOrderItems: CreatePurchaseOrderItemDTO[];
}

export interface UpdatePurchaseOrderDTO {
    expectedDeliveryDate?: Date;
    status?: PurchaseOrderStatus;
    notes?: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
    supplier: Supplier;
    user: User;
    purchaseOrderItems: (PurchaseOrderItem & { product: Product })[];
}

export interface IPurchaseOrderService {
    create(data: CreatePurchaseOrderDTO): Promise<PurchaseOrder>;
    findById(id: number): Promise<PurchaseOrder | null>;
    findByPoNumber(poNumber: string): Promise<PurchaseOrder | null>;
    findAll(page?: number, limit?: number): Promise<PurchaseOrder[]>;
    findByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]>;
    findBySupplier(supplierId: number): Promise<PurchaseOrder[]>;
    update(id: number, data: UpdatePurchaseOrderDTO): Promise<PurchaseOrder>;
    updateStatus(id: number, status: PurchaseOrderStatus): Promise<PurchaseOrder>;
    delete(id: number): Promise<PurchaseOrder>;
    getPurchaseOrderWithDetails(id: number): Promise<PurchaseOrderWithDetails | null>;
    addPurchaseOrderItem(purchaseOrderId: number, productId: number, quantityOrdered: number, unitCost: number): Promise<PurchaseOrderItem>;
    removePurchaseOrderItem(purchaseOrderItemId: number): Promise<boolean>;
    updatePurchaseOrderItem(purchaseOrderItemId: number, quantityOrdered: number, unitCost: number): Promise<PurchaseOrderItem>;
    receiveItems(purchaseOrderId: number, items: { id: number; quantityReceived: number }[]): Promise<PurchaseOrder>;
    calculateTotal(purchaseOrderId: number): Promise<number>;
}

export interface CreateAlertSettingDTO {
    productId?: number;
    categoryId?: number;
    locationId?: number;
    alertType: AlertType;
    threshold?: number;
    isActive?: boolean;
    notificationChannels: NotificationChannel[];
    recipientUserIds: number[];
}

export interface UpdateAlertSettingDTO {
    threshold?: number;
    isActive?: boolean;
    notificationChannels?: NotificationChannel[];
    recipientUserIds?: number[];
}

export interface AlertSettingWithDetails extends AlertSetting {
    notificationChannels: AlertNotificationChannel[];
    recipientUsers: AlertRecipientUser[];
    notifications: Notification[];
}

export interface IAlertService {
    create(data: CreateAlertSettingDTO): Promise<AlertSetting>;
    findById(id: number): Promise<AlertSetting | null>;
    findAll(): Promise<AlertSetting[]>;
    findByType(type: AlertType): Promise<AlertSetting[]>;
    findByProduct(productId: number): Promise<AlertSetting[]>;
    findByCategory(categoryId: number): Promise<AlertSetting[]>;
    findByLocation(locationId: number): Promise<AlertSetting[]>;
    update(id: number, data: UpdateAlertSettingDTO): Promise<AlertSetting>;
    delete(id: number): Promise<AlertSetting>;
    toggleActive(id: number): Promise<AlertSetting>;
    getAlertWithDetails(id: number): Promise<AlertSettingWithDetails | null>;
    checkLowStockAlerts(): Promise<Notification[]>;
    checkExpiringAlerts(): Promise<Notification[]>;
    checkOverstockAlerts(): Promise<Notification[]>;
    addNotificationChannel(alertId: number, channel: NotificationChannel): Promise<AlertNotificationChannel>;
    removeNotificationChannel(alertId: number, channel: NotificationChannel): Promise<boolean>;
    addRecipientUser(alertId: number, userId: number): Promise<AlertRecipientUser>;
    removeRecipientUser(alertId: number, userId: number): Promise<boolean>;
}

export interface CreateNotificationDTO {
    type: string;
    title: string;
    content: string;
    recipientUserId: number;
    alertId?: number;
    referenceId?: string;
    referenceType?: string;
}

export interface INotificationService {
    create(data: CreateNotificationDTO): Promise<Notification>;
    findById(id: number): Promise<Notification | null>;
    findByUser(userId: number, includeRead?: boolean): Promise<Notification[]>;
    markAsRead(id: number): Promise<Notification>;
    markAllAsRead(userId: number): Promise<number>;
    delete(id: number): Promise<Notification>;
    deleteAllRead(userId: number): Promise<number>;
    countUnread(userId: number): Promise<number>;
    sendEmail(notificationId: number): Promise<boolean>;
    sendSms(notificationId: number): Promise<boolean>;
}

export interface CreateReportDTO {
    name: string;
    description?: string;
    reportType: ReportType;
    createdBy: number;
    isScheduled?: boolean;
    scheduleFrequency?: string;
    parameters: Record<string, string>;
}

export interface UpdateReportDTO {
    name?: string;
    description?: string;
    isScheduled?: boolean;
    scheduleFrequency?: string;
    parameters?: Record<string, string>;
}

export interface ReportWithDetails extends Report {
    parameters: ReportParameter[];
    reportData: ReportData[];
    user: User;
}

export interface IReportService {
    create(data: CreateReportDTO): Promise<Report>;
    findById(id: number): Promise<Report | null>;
    findAll(): Promise<Report[]>;
    findByType(type: ReportType): Promise<Report[]>;
    findByUser(userId: number): Promise<Report[]>;
    update(id: number, data: UpdateReportDTO): Promise<Report>;
    delete(id: number): Promise<Report>;
    getReportWithDetails(id: number): Promise<ReportWithDetails | null>;
    generateReport(id: number): Promise<ReportData>;
    getLatestReportData(id: number): Promise<ReportData | null>;
    runScheduledReports(): Promise<void>;
    salesReport(startDate: Date, endDate: Date): Promise<any>;
    inventoryReport(): Promise<any>;
    financialReport(startDate: Date, endDate: Date): Promise<any>;
    productionReport(startDate: Date, endDate: Date): Promise<any>;
}

export interface CreateApiKeyDTO {
    name: string;
    createdBy: number;
    expiresAt?: Date;
    permissions: {
        resource: string;
        permissionType: PermissionType;
    }[];
}

export interface ApiKeyWithPermissions extends ApiKey {
    permissions: ApiKeyPermission[];
}

export interface IApiKeyService {
    create(data: CreateApiKeyDTO): Promise<{ apiKey: ApiKey; plainTextKey: string }>;
    findById(id: number): Promise<ApiKey | null>;
    findByKey(key: string): Promise<ApiKey | null>;
    findByUser(userId: number): Promise<ApiKey[]>;
    findAll(): Promise<ApiKey[]>;
    update(id: number, name: string): Promise<ApiKey>;
    delete(id: number): Promise<ApiKey>;
    validateKey(key: string): Promise<ApiKey | null>;
    revokeKey(id: number): Promise<ApiKey>;
    refreshKey(id: number): Promise<{ apiKey: ApiKey; plainTextKey: string }>;
    getApiKeyWithPermissions(id: number): Promise<ApiKeyWithPermissions | null>;
    addPermission(apiKeyId: number, resource: string, permissionType: PermissionType): Promise<ApiKeyPermission>;
    removePermission(apiKeyId: number, resource: string, permissionType: PermissionType): Promise<boolean>;
    trackUsage(apiKeyId: number): Promise<ApiKey>;
}

export interface CreateIntegrationLogDTO {
    integrationType: string;
    direction: IntegrationDirection;
    status: IntegrationStatus;
    requestPayload?: string;
    responsePayload?: string;
    errorMessage?: string;
    apiKeyId?: number;
}

export interface IIntegrationService {
    logIntegration(data: CreateIntegrationLogDTO): Promise<IntegrationLog>;
    findById(id: number): Promise<IntegrationLog | null>;
    findAll(page?: number, limit?: number): Promise<IntegrationLog[]>;
    findByType(type: string): Promise<IntegrationLog[]>;
    findByStatus(status: IntegrationStatus): Promise<IntegrationLog[]>;
    findByApiKey(apiKeyId: number): Promise<IntegrationLog[]>;
    delete(id: number): Promise<IntegrationLog>;
    exportToCsv(startDate: Date, endDate: Date): Promise<string>;
    retryFailedIntegrations(): Promise<number>;
}

export interface CreateAuditLogDTO {
    userId?: number;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface IAuditService {
    log(data: CreateAuditLogDTO): Promise<AuditLog>;
    findById(id: number): Promise<AuditLog | null>;
    findAll(page?: number, limit?: number): Promise<AuditLog[]>;
    findByUser(userId: number): Promise<AuditLog[]>;
    findByEntityType(entityType: string): Promise<AuditLog[]>;
    findByEntityId(entityType: string, entityId: string): Promise<AuditLog[]>;
    findByAction(action: string): Promise<AuditLog[]>;
    findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
    exportToCsv(startDate: Date, endDate: Date): Promise<string>;
}

export interface CreateProductionOrderDTO {
    productId: number;
    quantity: number;
    status?: ProductionOrderStatus;
    startDate?: Date;
    endDate?: Date;
    createdBy: number;
    notes?: string;
}

export interface UpdateProductionOrderDTO {
    quantity?: number;
    status?: ProductionOrderStatus;
    startDate?: Date;
    endDate?: Date;
    notes?: string;
}

export interface ProductionOrderWithDetails extends ProductionOrder {
    product: Product;
    user: User;
}

export interface MaterialRequirement {
    productId: number;
    productName: string;
    sku: string;
    quantityRequired: number;
    quantityAvailable: number;
    unit: string;
    sufficient: boolean;
}

export interface IProductionService {
    create(data: CreateProductionOrderDTO): Promise<ProductionOrder>;
    findById(id: number): Promise<ProductionOrder | null>;
    findByOrderNumber(orderNumber: string): Promise<ProductionOrder | null>;
    findAll(page?: number, limit?: number): Promise<ProductionOrder[]>;
    findByStatus(status: ProductionOrderStatus): Promise<ProductionOrder[]>;
    findByProduct(productId: number): Promise<ProductionOrder[]>;
    update(id: number, data: UpdateProductionOrderDTO): Promise<ProductionOrder>;
    updateStatus(id: number, status: ProductionOrderStatus): Promise<ProductionOrder>;
    delete(id: number): Promise<ProductionOrder>;
    getProductionOrderWithDetails(id: number): Promise<ProductionOrderWithDetails | null>;
    checkMaterialRequirements(productId: number, quantity: number): Promise<MaterialRequirement[]>;
    startProduction(id: number): Promise<ProductionOrder>;
    completeProduction(id: number): Promise<ProductionOrder>;
    cancelProduction(id: number): Promise<ProductionOrder>;
}
