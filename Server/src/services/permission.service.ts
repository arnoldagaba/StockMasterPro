import { PrismaClient, Permission, Prisma } from "@prisma/client";
import { IPermissionService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

export class PermissionService
    extends BaseServiceImpl<Permission, Prisma.PermissionCreateInput, Prisma.PermissionUpdateInput>
    implements IPermissionService
{
    constructor(prisma: PrismaClient) {
        super(prisma, "permission");
    }

    /**
     * Find a permission by name
     */
    async findByName(name: string): Promise<Permission | null> {
        try {
            const permission = await this.prisma.permission.findFirst({
                where: { name },
            });
            return permission;
        } catch (error) {
            this.handleError(error, `Error finding permission by name: ${name}`);
            throw error;
        }
    }

    /**
     * Get all permissions for a role
     */
    async getRolePermissions(roleId: number): Promise<Permission[]> {
        try {
            // Check if role exists
            const role = await this.prisma.role.findUnique({
                where: { id: roleId },
            });

            if (!role) {
                throw new Error(`Role with ID ${roleId} not found`);
            }

            // Get role permissions
            const rolePermissions = await this.prisma.rolePermission.findMany({
                where: { roleId },
                include: { permission: true },
            });

            return rolePermissions.map((rp) => rp.permission);
        } catch (error) {
            this.handleError(error, `Error getting permissions for role with ID: ${roleId}`);
            throw error;
        }
    }

    /**
     * Create a new permission
     * Override the base create method to enforce unique names
     */
    async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
        try {
            // Check if a permission with this name already exists
            const existingPermission = await this.findByName(data.name);
            if (existingPermission) {
                throw new Error(`Permission with name '${data.name}' already exists`);
            }

            return await super.create(data);
        } catch (error) {
            this.handleError(error, `Error creating permission with name: ${data.name}`);
            throw error;
        }
    }

    /**
     * Update a permission
     * Override to ensure name uniqueness
     */
    async update(id: number, data: Prisma.PermissionUpdateInput): Promise<Permission> {
        try {
            // If name is being updated, check uniqueness
            if (data.name) {
                const existingPermission = await this.prisma.permission.findFirst({
                    where: {
                        name: data.name as string,
                        id: { not: id },
                    },
                });

                if (existingPermission) {
                    throw new Error(`Permission with name '${data.name}' already exists`);
                }
            }

            return await super.update(id, data);
        } catch (error) {
            this.handleError(error, `Error updating permission with ID: ${id}`);
            throw error;
        }
    }
}
