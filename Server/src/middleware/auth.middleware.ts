import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { userService } from "../services";

// Extend the Request type to include a user property
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number;
                email: string;
                role: string;
            };
        }
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
            return res.status(401).json({ status: "error", message: "Authentication required" });
        }

        // Check for Bearer token
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(401).json({ status: "error", message: "Invalid token format" });
        }

        const token = parts[1];

        // Check if token is valid in the database
        const isValid = await userService.isTokenValid(token);
        if (!isValid) {
            return res.status(401).json({ status: "error", message: "Invalid or expired token" });
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
            return res.status(401).json({ status: "error", message: "Invalid token" });
        }
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ status: "error", message: "Token expired" });
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
            return res.status(401).json({ status: "error", message: "Authentication required" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ status: "error", message: "Access forbidden" });
        }

        next();
    };
};
