import { Request, Response } from "express";
import { UserService } from "@/services/user.service";
import prisma from "@/config/prisma";
import { AuthRequest } from "@/middleware/auth.middleware";
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput } from "@/validators/user.validator";
import { User } from "@prisma/client";
import { LoginResponse, RefreshTokenResponse } from "@/services/interfaces";

const userService = new UserService(prisma);

export class UserController {
    async register(req: Request<Record<string, never>, User, CreateUserInput>, res: Response) {
        try {
            const user = await userService.create(req.body);
            res.status(201).json(user);
        } catch (error) {
            console.error("Registration error:", error);
            res.status(400).json({ message: "User registration failed" });
        }
    }

    async login(req: Request<Record<string, never>, LoginResponse, LoginInput>, res: Response) {
        try {
            const loginResponse = await userService.login({
                ...req.body,
                ipAddress: req.ip,
                userAgent: req.headers["user-agent"],
            });
            res.status(200).json(loginResponse);
        } catch (error) {
            console.error("Login error:", error);
            res.status(401).json({ message: "Invalid credentials" });
        }
    }

    async refreshToken(req: Request<Record<string, never>, RefreshTokenResponse, { refreshToken: string }>, res: Response) {
        try {
            const { refreshToken } = req.body;
            const response = await userService.refreshToken(refreshToken);
            res.status(200).json(response);
        } catch (error) {
            console.error("Token refresh error:", error);
            res.status(401).json({ message: "Invalid refresh token" });
        }
    }

    async logout(req: AuthRequest, res: Response) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }
            await userService.logout(req.user.id);
            res.status(200).json({ message: "Logged out successfully" });
        } catch (error) {
            console.error("Logout error:", error);
            res.status(500).json({ message: "Logout failed" });
        }
    }

    async getCurrentUser(req: AuthRequest, res: Response) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }
            const user = await userService.getUserWithRole(req.user.id);
            res.status(200).json(user);
        } catch (error) {
            console.error("Get current user error:", error);
            res.status(500).json({ message: "Failed to get user details" });
        }
    }

    async updateUser(
        req: Request<
            { id: string }, // Route params type
            Partial<User>, // Response body type
            UpdateUserInput // Request body type
        >,
        res: Response,
    ) {
        try {
            const user = await userService.update(parseInt(req.params.id), req.body);
            res.status(200).json(user);
        } catch (error) {
            console.error("Update user error:", error);
            res.status(400).json({ message: "Failed to update user" });
        }
    }

    async changePassword(req: AuthRequest & { body: ChangePasswordInput }, res: Response) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }
            await userService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
            res.status(200).json({ message: "Password changed successfully" });
        } catch (error) {
            console.error("Password change error:", error);
            res.status(400).json({ message: "Failed to change password" });
        }
    }

    async getUserSessions(req: AuthRequest, res: Response) {
        try {
            if (!req.user?.id) {
                res.status(401).json({ message: "Authentication required" });
                return;
            }
            const sessions = await userService.getSessions(req.user.id);
            res.status(200).json(sessions);
        } catch (error) {
            console.error("Get sessions error:", error);
            res.status(500).json({ message: "Failed to get user sessions" });
        }
    }

    async terminateSession(req: Request<{ sessionId: string }>, res: Response) {
        try {
            await userService.terminateSession(parseInt(req.params.sessionId));
            res.status(200).json({ message: "Session terminated successfully" });
        } catch (error) {
            console.error("Terminate session error:", error);
            res.status(400).json({ message: "Failed to terminate session" });
        }
    }
}
