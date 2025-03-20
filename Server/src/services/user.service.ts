import { User, Role, UserSession } from "@prisma/client";
import { CreateUserDTO, UpdateUserDTO, UserLoginDTO, UserLoginResponse, IUserService } from "./interfaces";
import { BaseService } from "./base.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export class UserService extends BaseService implements IUserService {
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

    async findById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

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

    async getUserWithRole(userId: number): Promise<(User & { role: Role }) | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });
    }

    async getSessions(userId: number): Promise<UserSession[]> {
        return this.prisma.userSession.findMany({
            where: { userId },
        });
    }

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
