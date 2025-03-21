import { Request, Response } from "express";
import { customerServiceInstance } from "@/services";
import { CreateCustomerInput, UpdateCustomerInput } from "@/validators/customer.validator";
import { ApiError } from "@/utils/apiError";

// Customer filters interface
interface CustomerFilters {
    name?: string;
    email?: string;
    phone?: string;
    [key: string]: unknown;
}

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const customerData: CreateCustomerInput = req.body;
        const customer = await customerServiceInstance.createCustomer(customerData);

        return res.status(201).json({
            status: "success",
            message: "Customer created successfully",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error creating customer";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customerData: UpdateCustomerInput = req.body;
        const customer = await customerServiceInstance.updateCustomer(id, customerData);

        return res.status(200).json({
            status: "success",
            message: "Customer updated successfully",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error updating customer";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerServiceInstance.deleteCustomer(id);

        return res.status(200).json({
            status: "success",
            message: "Customer deleted successfully",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error deleting customer";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerServiceInstance.getCustomerById(id);

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving customer";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getAllCustomers = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, name, email, phone } = req.query;

        const filters: CustomerFilters = {};

        if (name) {
            filters.name = name as string;
        }

        if (email) {
            filters.email = email as string;
        }

        if (phone) {
            filters.phone = phone as string;
        }

        const customers = await customerServiceInstance.getAllCustomers({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "asc",
            filters,
        });

        return res.status(200).json({
            status: "success",
            ...customers,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving customers";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const findCustomerByEmail = async (req: Request, res: Response) => {
    try {
        const email = req.params.email;
        const customer = await customerServiceInstance.findByEmail(email);

        if (!customer) {
            return res.status(404).json({
                status: "error",
                message: "Customer not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error finding customer by email";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const findCustomerByPhone = async (req: Request, res: Response) => {
    try {
        const phone = req.params.phone;
        const customer = await customerServiceInstance.findByPhone(phone);

        if (!customer) {
            return res.status(404).json({
                status: "error",
                message: "Customer not found",
            });
        }

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error finding customer by phone";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getCustomerWithOrders = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerServiceInstance.getCustomerWithOrders(id);

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving customer with orders";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const searchCustomers = async (req: Request, res: Response) => {
    try {
        const { searchTerm, page, limit, sortBy, sortOrder } = req.query;

        if (!searchTerm) {
            return res.status(400).json({
                status: "error",
                message: "Search term is required",
            });
        }

        const customers = await customerServiceInstance.searchCustomers(searchTerm as string, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "asc",
        });

        return res.status(200).json({
            status: "success",
            ...customers,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error searching customers";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getCustomerOrderStats = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const stats = await customerServiceInstance.getCustomerOrderStats(id);

        return res.status(200).json({
            status: "success",
            data: stats,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving customer order statistics";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};
