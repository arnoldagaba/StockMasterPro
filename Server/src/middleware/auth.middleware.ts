import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { userServiceInstance } from "@/services";

// Extend the Request type to include a user property
declare module "express" {
    interface Request {
        user?: {
            userId: number;
            email: string;
            role: string;
        };
    }
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ status: "error", message: "Authentication required" });
            return;
        }

        // Check for Bearer token
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            res.status(401).json({ status: "error", message: "Invalid token format" });
            return;
        }

        const token = parts[1];

        // Check if token is valid in the database
        const isValid = await userServiceInstance.isTokenValid(token);
        if (!isValid) {
            res.status(401).json({ status: "error", message: "Invalid or expired token" });
            return;
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret") as {
            userId: number;
            email: string;
            role: string;
        };

        // Attach user information to the request
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ status: "error", message: "Invalid token" });
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ status: "error", message: "Token expired" });
            return;
        }
        next(error);
    }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            res.status(401).json({ status: "error", message: "Authentication required" });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ status: "error", message: "Access forbidden" });
            return;
        }

        next();
    };
};
