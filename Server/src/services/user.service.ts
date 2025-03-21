import { PrismaClient, User, Prisma } from "@prisma/client";
import { IUserService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export class UserService extends BaseServiceImpl<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> implements IUserService {
    constructor(prisma: PrismaClient) {
        super(prisma, "user");
    }

    /**
     * Find a user by email
     */
    async findByEmail(email: string): Promise<User | null> {
        try {
            const user = await this.prisma.user.findFirst({
                where: {
                    email,
                    deletedAt: null,
                },
            });
            return user;
        } catch (error) {
            this.handleError(error, `Error finding user by email: ${email}`);
            throw error;
        }
    }

    /**
     * Update user's password
     */
    async updatePassword(id: number, currentPassword: string, newPassword: string): Promise<boolean> {
        try {
            // Find the user
            const user = await this.prisma.user.findUnique({
                where: { id },
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Verify current password
            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                throw new Error("Current password is incorrect");
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update the password
            await this.prisma.user.update({
                where: { id },
                data: { password: hashedPassword },
            });

            return true;
        } catch (error) {
            this.handleError(error, `Error updating password for user ID: ${id}`);
            throw error;
        }
    }

    /**
     * Validate user credentials for login
     */
    async validateCredentials(email: string, password: string): Promise<User | null> {
        try {
            // Find the user
            const user = await this.prisma.user.findFirst({
                where: {
                    email,
                    deletedAt: null,
                },
            });

            if (!user) {
                return null;
            }

            // Verify password
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return null;
            }

            // Update last login time
            await this.prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
            });

            return user;
        } catch (error) {
            this.handleError(error, `Error validating credentials for email: ${email}`);
            throw error;
        }
    }

    /**
     * Create a new user session
     */
    async createSession(userId: number, ipAddress?: string, userAgent?: string): Promise<{ user: User; token: string; refreshToken: string }> {
        try {
            // Get the user
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { role: true },
            });

            if (!user) {
                throw new Error("User not found");
            }

            // Generate access token
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role.name,
                },
                process.env.JWT_SECRET || "default-secret",
                { expiresIn: "1h" },
            );

            // Generate refresh token
            const refreshToken = uuidv4();
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

            // Save refresh token to database
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    refreshToken,
                    refreshTokenExpiry,
                    lastLoginAt: new Date(),
                },
            });

            // Create session record
            await this.prisma.userSession.create({
                data: {
                    userId,
                    token,
                    ipAddress: ipAddress || "",
                    userAgent: userAgent || "",
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                },
            });

            // Remove password from returned user
            const { password, ...userWithoutPassword } = user;
            return {
                user: userWithoutPassword as User,
                token,
                refreshToken,
            };
        } catch (error) {
            this.handleError(error, `Error creating session for user ID: ${userId}`);
            throw error;
        }
    }

    /**
     * Refresh an access token using a refresh token
     */
    async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string } | null> {
        try {
            // Find user with this refresh token
            const user = await this.prisma.user.findFirst({
                where: {
                    refreshToken,
                    refreshTokenExpiry: {
                        gt: new Date(),
                    },
                    deletedAt: null,
                },
                include: { role: true },
            });

            if (!user) {
                return null;
            }

            // Generate new access token
            const newToken = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role.name,
                },
                process.env.JWT_SECRET || "default-secret",
                { expiresIn: "1h" },
            );

            // Generate new refresh token
            const newRefreshToken = uuidv4();
            const refreshTokenExpiry = new Date();
            refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days expiry

            // Update in database
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    refreshToken: newRefreshToken,
                    refreshTokenExpiry,
                },
            });

            // Create new session record
            await this.prisma.userSession.create({
                data: {
                    userId: user.id,
                    token: newToken,
                    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                },
            });

            return { token: newToken, refreshToken: newRefreshToken };
        } catch (error) {
            this.handleError(error, "Error refreshing token");
            throw error;
        }
    }

    /**
     * Invalidate a session token (logout)
     */
    async logout(token: string): Promise<boolean> {
        try {
            // Delete the session
            await this.prisma.userSession.deleteMany({
                where: { token },
            });
            return true;
        } catch (error) {
            this.handleError(error, "Error logging out");
            throw error;
        }
    }

    /**
     * Check if a token is valid
     */
    async isTokenValid(token: string): Promise<boolean> {
        try {
            // Find the session
            const session = await this.prisma.userSession.findFirst({
                where: {
                    token,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });

            return !!session;
        } catch (error) {
            this.handleError(error, "Error validating token");
            throw error;
        }
    }

    /**
     * Override the create method to hash passwords
     */
    async create(data: Prisma.UserCreateInput): Promise<User> {
        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(data.password, 10);

            // Create user with hashed password
            const user = await this.prisma.user.create({
                data: {
                    ...data,
                    password: hashedPassword,
                },
            });

            return user;
        } catch (error) {
            this.handleError(error, "Error creating user");
            throw error;
        }
    }

    /**
     * Override the update method to handle password updates
     */
    async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
        try {
            // If password is being updated, hash it
            if (data.password) {
                data.password = await bcrypt.hash(data.password as string, 10);
            }

            const user = await this.prisma.user.update({
                where: { id },
                data,
            });

            return user;
        } catch (error) {
            this.handleError(error, `Error updating user with ID: ${id}`);
            throw error;
        }
    }
}
