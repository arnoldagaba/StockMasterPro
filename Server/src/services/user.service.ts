import { PrismaClient, User, Role, UserSession } from "@prisma/client";
import { CreateUserDTO, UpdateUserDTO, UserLoginDTO, UserLoginResponse, IUserService } from "./interfaces";
import { BaseService } from "./base.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export class UserService extends BaseService implements IUserService {
    constructor(prismaClient: PrismaClient) {
        super(prismaClient);
    }

    /**
     * Creates a new user with hashed password.
     *
     * @param data - The data for creating a new user.
     * @param data.email - The email of the user.
     * @param data.password - The password of the user.
     * @param data.firstName - The first name of the user.
     * @param data.lastName - The last name of the user.
     * @param data.roleId - The ID of the role assigned to the user.
     *
     * @returns A promise that resolves to the created user.
     */
    async create(data: CreateUserDTO): Promise<User> {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return this.executeWithTransaction(
            async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: data.email,
                        password: hashedPassword,
                        firstName: data.firstName,
                        lastName: data.lastName,
                        roleId: data.roleId,
                    },
                });
                return user;
            },
            {
                action: "CREATE",
                entityType: "User",
                entityId: (
                    await this.prisma.user.create({
                        data: {
                            email: data.email,
                            password: hashedPassword,
                            firstName: data.firstName,
                            lastName: data.lastName,
                            roleId: data.roleId,
                        },
                    })
                ).id.toString(),
                newValues: { ...data, password: "[hashed]" },
            },
        );
    }

    /**
     * Finds a user by their unique ID.
     *
     * @param id - The unique identifier of the user to find.
     *
     * @returns A promise that resolves to the found user or `null` if no user is found with the given ID.
     */
    async findById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    /**
     * Finds a user by their email address.
     *
     * @param email - The email address of the user to find.
     *
     * @returns A promise that resolves to the found user or `null` if no user is found with the given email.
     *          The returned user object includes the `id`, `email`, `password`, `firstName`, `lastName`,
     *          `roleId`, `createdAt`, `updatedAt`, and `deletedAt` properties.
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    /**
     * Updates an existing user with the provided data.
     *
     * @param id - The unique identifier of the user to update.
     * @param data - The updated data for the user.
     * @param data.email - The new email of the user.
     * @param data.firstName - The new first name of the user.
     * @param data.lastName - The new last name of the user.
     * @param data.roleId - The new ID of the role assigned to the user.
     * @param data.password - The new password of the user.
     *
     * @returns A promise that resolves to the updated user.
     *
     * @throws Will throw an error if the user with the given ID does not exist.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * const updatedUser = await userService.update(1, {
     *     email: "newuser@example.com",
     *     firstName: "New",
     *     lastName: "User",
     *     roleId: 2,
     *     password: "newPassword123",
     * });
     * console.log(`User updated: ${updatedUser.firstName} ${updatedUser.lastName}`);
     * ```
     */
    async update(id: number, data: UpdateUserDTO): Promise<User> {
        const existingUser = await this.findById(id);
        if (!existingUser) throw new Error("User not found");

        const updateData: Partial<{
            email: string;
            firstName: string;
            lastName: string;
            roleId: number;
            password: string;
        }> = {};

        if (data.email) updateData.email = data.email;
        if (data.firstName) updateData.firstName = data.firstName;
        if (data.lastName) updateData.lastName = data.lastName;
        if (data.roleId) updateData.roleId = data.roleId;
        if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

        return this.executeWithTransaction(
            async (tx) => {
                const updatedUser = await tx.user.update({
                    where: { id },
                    data: updateData,
                });
                return updatedUser;
            },
            {
                action: "UPDATE",
                entityType: "User",
                entityId: id.toString(),
                oldValues: { ...existingUser },
                newValues: { ...updateData, password: data.password ? "[hashed]" : undefined },
            },
        );
    }

    /**
     * Soft deletes a user by setting deletedAt.
     *
     * @param id - The unique identifier of the user to delete.
     *
     * @returns A promise that resolves to the deleted user.
     *
     * @throws Will throw an error if the user with the given ID does not exist.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * const deletedUser = await userService.delete(1);
     * console.log(`User ${deletedUser.firstName} ${deletedUser.lastName} has been deleted.`);
     * ```
     */
    async delete(id: number): Promise<User> {
        return this.executeWithTransaction(
            async (tx) => {
                const user = await tx.user.update({
                    where: { id },
                    data: { deletedAt: new Date() },
                });
                return user;
            },
            {
                action: "DELETE",
                entityType: "User",
                entityId: id.toString(),
            },
        );
    }

    /**
     * Handles user login with JWT and refresh token.
     *
     * @param credentials - The user's login credentials.
     * @param credentials.email - The user's email.
     * @param credentials.password - The user's password.
     * @param credentials.ipAddress - The IP address of the user's device.
     * @param credentials.userAgent - The user agent string of the user's browser.
     *
     * @returns A promise that resolves to a UserLoginResponse object containing the logged-in user,
     *          new JWT token, and new refresh token.
     *          If the provided credentials are invalid, the promise rejects with an error.
     *
     * @throws Will throw an error if the JWT secret is not configured.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * const response = await userService.login({
     *     email: "user@example.com",
     *     password: "password123",
     *     ipAddress: "192.168.0.1",
     *     userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
     * });
     * console.log(`User: ${response.user.firstName} ${response.user.lastName}`);
     * console.log(`JWT Token: ${response.token}`);
     * console.log(`Refresh Token: ${response.refreshToken}`);
     * ```
     */
    async login(credentials: UserLoginDTO): Promise<UserLoginResponse> {
        const user = await this.findByEmail(credentials.email);
        if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
            throw new Error("Invalid credentials");
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT secret is not configured");
        }

        const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "1h" });
        const refreshToken = uuidv4();
        const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return this.executeWithTransaction(
            async (tx) => {
                await tx.user.update({
                    where: { id: user.id },
                    data: {
                        refreshToken,
                        refreshTokenExpiry,
                        lastLoginAt: new Date(),
                    },
                });

                await tx.userSession.create({
                    data: {
                        userId: user.id,
                        token: refreshToken,
                        ipAddress: credentials.ipAddress,
                        userAgent: credentials.userAgent,
                        expiresAt: refreshTokenExpiry,
                    },
                });

                return { user, token, refreshToken };
            },
            {
                action: "LOGIN",
                entityType: "User",
                entityId: user.id.toString(),
                ipAddress: credentials.ipAddress,
                userAgent: credentials.userAgent,
            },
        );
    }

    /**
     * Refreshes the user's JWT token and refresh token.
     *
     * @param token - The refresh token to validate and use for token refresh.
     *
     * @returns A promise that resolves to a UserLoginResponse object containing the refreshed user,
     *          new JWT token, and new refresh token.
     *          If the refresh token is invalid or expired, the promise rejects with an error.
     *
     * @throws Will throw an error if the refresh token is invalid or expired.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * const response = await userService.refreshToken("refreshTokenValue");
     * console.log(`User: ${response.user.firstName} ${response.user.lastName}`);
     * console.log(`New JWT Token: ${response.token}`);
     * console.log(`New Refresh Token: ${response.refreshToken}`);
     * ```
     */
    async refreshToken(token: string): Promise<UserLoginResponse> {
        const session = await this.prisma.userSession.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
            throw new Error("Invalid or expired refresh token");
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error("JWT secret is not configured");
        }

        const newToken = jwt.sign({ userId: session.user.id }, jwtSecret, { expiresIn: "1h" });
        const newRefreshToken = uuidv4();
        const newRefreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return this.executeWithTransaction(
            async (tx) => {
                await tx.user.update({
                    where: { id: session.user.id },
                    data: {
                        refreshToken: newRefreshToken,
                        refreshTokenExpiry: newRefreshTokenExpiry,
                    },
                });

                await tx.userSession.update({
                    where: { id: session.id },
                    data: {
                        token: newRefreshToken,
                        expiresAt: newRefreshTokenExpiry,
                    },
                });

                return { user: session.user, token: newToken, refreshToken: newRefreshToken };
            },
            {
                action: "REFRESH_TOKEN",
                entityType: "User",
                entityId: session.user.id.toString(),
            },
        );
    }

    /**
     * Logs out a user by clearing refresh token.
     *
     * @param userId - The unique identifier of the user to log out.
     *
     * @returns A promise that resolves to `true` if the logout is successful,
     *          otherwise, it rejects with an error.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * await userService.logout(1);
     * console.log("User logged out successfully");
     * ```
     */
    async logout(userId: number): Promise<boolean> {
        await this.executeWithTransaction(
            async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        refreshToken: null,
                        refreshTokenExpiry: null,
                    },
                });
            },
            {
                action: "LOGOUT",
                entityType: "User",
                entityId: userId.toString(),
            },
        );
        return true;
    }

    /**
     * Changes a user's password.
     *
     * @param userId - The unique identifier of the user whose password needs to be changed.
     * @param oldPassword - The current password of the user.
     * @param newPassword - The new password to be set for the user.
     *
     * @returns A promise that resolves to `true` if the password change is successful,
     *          otherwise, it rejects with an error.
     *
     * @throws Will throw an error if the old password is incorrect.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * await userService.changePassword(1, "oldPassword", "newPassword");
     * console.log("Password changed successfully");
     * ```
     */
    async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<boolean> {
        const user = await this.findById(userId);
        if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
            throw new Error("Invalid old password");
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await this.executeWithTransaction(
            async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { password: hashedNewPassword },
                });
            },
            {
                action: "CHANGE_PASSWORD",
                entityType: "User",
                entityId: userId.toString(),
            },
        );
        return true;
    }

    /**
     * Retrieves a user with their associated role.
     *
     * @param userId - The unique identifier of the user to retrieve.
     *
     * @returns A promise that resolves to a tuple containing the user and their associated role.
     *          If no user is found with the given ID, the promise resolves to `null`.
     *          The returned user object includes the `role` property, which is an object representing the user's role.
     *
     * @example
     * ```typescript
     * const userService = new UserService(prismaClient);
     * const userWithRole = await userService.getUserWithRole(1);
     * if (userWithRole) {
     *     console.log(`User: ${userWithRole.firstName} ${userWithRole.lastName}`);
     *     console.log(`Role: ${userWithRole.role.name}`);
     * } else {
     *     console.log("User not found");
     * }
     * ```
     */
    async getUserWithRole(userId: number): Promise<(User & { role: Role }) | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });
    }

    /**
     * Retrieves all sessions for a specific user.
     *
     * @param userId - The unique identifier of the user for which to retrieve sessions.
     *
     * @returns A promise that resolves to an array of user sessions associated with the given user ID.
     *          If no sessions are found, the promise resolves to an empty array.
     */
    async getSessions(userId: number): Promise<UserSession[]> {
        return this.prisma.userSession.findMany({
            where: { userId },
        });
    }

    /**
     * Terminates a specific user session.
     *
     * @param sessionId - The unique identifier of the user session to terminate.
     *
     * @returns A promise that resolves to `true` if the session is successfully terminated,
     *          otherwise, it rejects with an error.
     */
    async terminateSession(sessionId: number): Promise<boolean> {
        await this.executeWithTransaction(
            async (tx) => {
                await tx.userSession.delete({
                    where: { id: sessionId },
                });
            },
            {
                action: "TERMINATE_SESSION",
                entityType: "UserSession",
                entityId: sessionId.toString(),
            },
        );
        return true;
    }
}
