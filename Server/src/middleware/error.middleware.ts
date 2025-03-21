import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({
        status: "error",
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction,
) => {
    console.error("Error:", err);

    // Set defaults
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Handle specific error types
    if (err.code === "P2002") {
        // Prisma unique constraint error
        return res.status(409).json({
            status: "error",
            message: "Resource already exists with these details",
        });
    }

    if (err.code === "P2025") {
        // Prisma record not found error
        return res.status(404).json({
            status: "error",
            message: "Resource not found",
        });
    }

    // Send a clean error response
    res.status(statusCode).json({
        status: "error",
        message,
        ...(process.env.NODE_ENV !== "production" && {
            stack: err.stack,
        }),
    });
};
