import { PrismaClient, Role, Prisma, RoleName } from "@prisma/client";
import { IRoleService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

export class RoleService extends BaseServiceImpl<Role, Prisma.RoleCreateInput, Prisma.RoleUpdateInput> implements IRoleService {
    constructor(prisma: PrismaClient) {
        super(prisma, "role");
    }

    /**
     * Find a role by name
     */
    async findByName(name: string): Promise<Role | null> {
        try {
            const role = await this.prisma.role.findFirst({
                where: { name: name as unknown as RoleName },
            });
            return role;
        } catch (error) {
            this.handleError(error, `Error finding role by name: ${name}`);
            throw error;
        }
    }

    /**
     * Assign permissions to a role
     */
    async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
        try {
            // Check if role exists
            const role = await this.prisma.role.findUnique({
                where: { id: roleId },
            });

            if (!role) {
                throw new Error(`Role with ID ${roleId} not found`);
            }

            // Check if all permissions exist
            const permissions = await this.prisma.permission.findMany({
                where: {
                    id: {
                        in: permissionIds,
                    },
                },
            });

            if (permissions.length !== permissionIds.length) {
                throw new Error("One or more permissions not found");
            }

            // Get existing role permissions to avoid duplicates
            const existingPermissions = await this.prisma.rolePermission.findMany({
                where: {
                    roleId,
                },
            });

            const existingPermissionIds = existingPermissions.map((rp) => rp.permissionId);

            // Filter out permissions that are already assigned
            const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));

            // Create the new role-permission connections
            await Promise.all(
                newPermissionIds.map((permissionId) =>
                    this.prisma.rolePermission.create({
                        data: {
                            roleId,
                            permissionId,
                        },
                    }),
                ),
            );

            // Return the updated role with permissions
            return (await this.prisma.role.findUnique({
                where: { id: roleId },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            })) as Role;
        } catch (error) {
            this.handleError(error, `Error assigning permissions to role with ID: ${roleId}`);
            throw error;
        }
    }

    /**
     * Remove permissions from a role
     */
    async removePermissions(roleId: number, permissionIds: number[]): Promise<Role> {
        try {
            // Check if role exists
            const role = await this.prisma.role.findUnique({
                where: { id: roleId },
            });

            if (!role) {
                throw new Error(`Role with ID ${roleId} not found`);
            }

            // Delete the specified role-permission connections
            await this.prisma.rolePermission.deleteMany({
                where: {
                    roleId,
                    permissionId: {
                        in: permissionIds,
                    },
                },
            });

            // Return the updated role with permissions
            return (await this.prisma.role.findUnique({
                where: { id: roleId },
                include: {
                    permissions: {
                        include: {
                            permission: true,
                        },
                    },
                },
            })) as Role;
        } catch (error) {
            this.handleError(error, `Error removing permissions from role with ID: ${roleId}`);
            throw error;
        }
    }

    /**
     * Get roles for a user
     */
    async getUserRoles(userId: number): Promise<Role[]> {
        try {
            // Check if user exists
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new Error(`User with ID ${userId} not found`);
            }

            // In this schema, users have only one role, but we return as array for consistency
            const role = await this.prisma.role.findUnique({
                where: { id: user.roleId },
            });

            return role ? [role] : [];
        } catch (error) {
            this.handleError(error, `Error getting roles for user with ID: ${userId}`);
            throw error;
        }
    }
}
