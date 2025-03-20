import { RoleName, PermissionType, Permission, Role } from "@prisma/client";
import prisma from "@/config/prisma";

async function main() {
    console.log("Starting seeding process...");

    // Step 1: Create all the necessary permissions
    console.log("Creating permissions...");

    // Define all resources in the system
    const resources = [
        "users",
        "roles",
        "categories",
        "suppliers",
        "products",
        "locations",
        "inventory",
        "customers",
        "orders",
        "purchaseOrders",
        "inventoryTransactions",
        "alertSettings",
        "notifications",
        "reports",
        "apiKeys",
        "integrationLogs",
        "auditLogs",
        "productComponents",
        "productionOrders",
    ];

    // Define permission types from the enum
    const permissionTypes = Object.values(PermissionType);

    // Create all permissions by combining resources and permission types
    const permissionsData: { name: string; description: string }[] = [];

    for (const resource of resources) {
        for (const permType of permissionTypes) {
            const permissionName = `${resource}:${permType.toLowerCase()}`;
            const description = `Can ${permType.toLowerCase()} ${resource}`;

            permissionsData.push({
                name: permissionName,
                description: description,
            });
        }
    }

    // Additional special permissions for specific operations
    const specialPermissions = [
        { name: "dashboard:view", description: "Can view dashboard" },
        { name: "reports:export", description: "Can export reports" },
        { name: "reports:schedule", description: "Can schedule reports" },
        { name: "inventory:transfer", description: "Can transfer inventory between locations" },
        { name: "inventory:adjust", description: "Can make inventory adjustments" },
        { name: "orders:cancel", description: "Can cancel orders" },
        { name: "orders:ship", description: "Can mark orders as shipped" },
        { name: "orders:deliver", description: "Can mark orders as delivered" },
        { name: "purchaseOrders:receive", description: "Can receive purchase orders" },
        { name: "purchaseOrders:cancel", description: "Can cancel purchase orders" },
        { name: "productionOrders:start", description: "Can start production orders" },
        { name: "productionOrders:complete", description: "Can complete production orders" },
        { name: "system:settings", description: "Can modify system settings" },
        { name: "alerts:manage", description: "Can manage alert settings" },
    ];

    permissionsData.push(...specialPermissions);

    // Create all permissions in the database
    const permissions: Permission[] = [];
    for (const permData of permissionsData) {
        const permission = await prisma.permission.upsert({
            where: { name: permData.name },
            update: {
                description: permData.description,
            },
            create: {
                name: permData.name,
                description: permData.description,
            },
        });
        permissions.push(permission);
        console.log(`Created permission: ${permission.name}`);
    }

    // Step 2: Create all roles
    console.log("Creating roles...");

    const rolesData = [
        {
            name: RoleName.ADMIN,
            description: "Administrator with full system access",
        },
        {
            name: RoleName.MANAGER,
            description: "Manager with access to most system functions",
        },
        {
            name: RoleName.INVENTORY_SPECIALIST,
            description: "Manages inventory and stock levels",
        },
        {
            name: RoleName.SALES_REPRESENTATIVE,
            description: "Handles sales and customer orders",
        },
        {
            name: RoleName.PURCHASING_AGENT,
            description: "Manages supplier relationships and purchase orders",
        },
        {
            name: RoleName.PRODUCTION_MANAGER,
            description: "Oversees production planning and execution",
        },
        {
            name: RoleName.STAFF,
            description: "General staff with limited access",
        },
        {
            name: RoleName.CUSTOMER,
            description: "External customer with very limited access",
        },
    ];

    const roles = {} as Record<RoleName, Role>;
    for (const roleData of rolesData) {
        const role = await prisma.role.upsert({
            where: { name: roleData.name },
            update: {
                description: roleData.description,
            },
            create: {
                name: roleData.name,
                description: roleData.description,
            },
        });
        roles[roleData.name] = role;
        console.log(`Created role: ${role.name}`);
    }

    // Step 3: Assign permissions to roles
    console.log("Assigning permissions to roles...");

    // Helper function to get permissions by pattern
    const getPermissionsByPattern = (pattern: string | RegExp): Permission[] => {
        return permissions.filter((p) => {
            if (typeof pattern === "string") {
                return p.name.includes(pattern);
            } else if (pattern instanceof RegExp) {
                return pattern.test(p.name);
            }
            return false;
        });
    };

    // Admin role - all permissions
    await assignPermissionsToRole(roles[RoleName.ADMIN].id, permissions);

    // Manager role - most permissions except some system and admin functions
    const managerPermissions = permissions.filter(
        (p) => !p.name.includes("system:settings") && !p.name.includes("apiKeys:") && !p.name.includes("roles:"),
    );
    await assignPermissionsToRole(roles[RoleName.MANAGER].id, managerPermissions);

    // Inventory Specialist
    const inventorySpecialistPermissions = [
        ...getPermissionsByPattern("inventory:"),
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern("locations:read"),
        ...getPermissionsByPattern("categories:read"),
        ...getPermissionsByPattern("suppliers:read"),
        ...getPermissionsByPattern("inventoryTransactions:"),
        ...getPermissionsByPattern("dashboard:view"),
        ...getPermissionsByPattern("reports:read"),
        ...getPermissionsByPattern("reports:export"),
        ...getPermissionsByPattern("alerts:manage"),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.INVENTORY_SPECIALIST].id, inventorySpecialistPermissions);

    // Sales Representative
    const salesRepPermissions = [
        ...getPermissionsByPattern("customers:"),
        ...getPermissionsByPattern("orders:"),
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern("inventory:read"),
        ...getPermissionsByPattern("dashboard:view"),
        ...getPermissionsByPattern("reports:read"),
        ...getPermissionsByPattern("reports:export"),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.SALES_REPRESENTATIVE].id, salesRepPermissions);

    // Purchasing Agent
    const purchasingAgentPermissions = [
        ...getPermissionsByPattern("purchaseOrders:"),
        ...getPermissionsByPattern("suppliers:"),
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern("inventory:read"),
        ...getPermissionsByPattern("dashboard:view"),
        ...getPermissionsByPattern("reports:read"),
        ...getPermissionsByPattern("reports:export"),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.PURCHASING_AGENT].id, purchasingAgentPermissions);

    // Production Manager
    const productionManagerPermissions = [
        ...getPermissionsByPattern("productionOrders:"),
        ...getPermissionsByPattern("productComponents:"),
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern("inventory:read"),
        ...getPermissionsByPattern("dashboard:view"),
        ...getPermissionsByPattern("reports:read"),
        ...getPermissionsByPattern("reports:export"),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.PRODUCTION_MANAGER].id, productionManagerPermissions);

    // Staff
    const staffPermissions = [
        ...getPermissionsByPattern("dashboard:view"),
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern("customers:read"),
        ...getPermissionsByPattern("orders:read"),
        ...getPermissionsByPattern("inventory:read"),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.STAFF].id, staffPermissions);

    // Customer (very limited)
    const customerPermissions = [
        ...getPermissionsByPattern("products:read"),
        ...getPermissionsByPattern(/^orders:(read|create)$/),
        ...getPermissionsByPattern("notifications:read"),
    ];
    await assignPermissionsToRole(roles[RoleName.CUSTOMER].id, customerPermissions);

    console.log("Seeding completed successfully.");
}

// Helper function to assign permissions to a role
async function assignPermissionsToRole(roleId: number, permissions: Permission[]): Promise<void> {
    for (const permission of permissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: roleId,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: roleId,
                permissionId: permission.id,
            },
        });
    }
    console.log(`Assigned ${permissions.length} permissions to role ID: ${roleId}`);
}

// Execute the main function
main()
    .catch((e) => {
        console.error("Error during seeding:", e);
        process.exit(1);
    })
    .finally(async () => {
        // Close Prisma client connection
        await prisma.$disconnect();
    });
