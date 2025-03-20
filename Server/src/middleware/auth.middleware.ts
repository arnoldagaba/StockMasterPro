import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import prisma from "@/config/prisma"

export interface AuthRequest extends Request {
    user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }

        const token = authHeader.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("JWT secret is not configured");
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: number };
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            res.status(401).json({ message: "User not found" });
            return;
        }

        req.user = user;
        next();
    } catch (error: unknown) {
        console.log("Invalid token: ", error)
        res.status(401).json({ message: "Invalid token" });
    }
};

export const authorize = (...roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                res.status(401).json({ message: "Authentication required" });
                return
            }

            const userWithRole = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { role: true },
            });

            if (!userWithRole || !roles.includes(userWithRole.role.name)) {
                res.status(403).json({ message: "Insufficient permissions" });
                return;
            }

            next();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error("Authorization error:", errorMessage);
            res.status(500).json({
                message: "Authorization error",
                details: errorMessage,
            });
        }
    };
};
