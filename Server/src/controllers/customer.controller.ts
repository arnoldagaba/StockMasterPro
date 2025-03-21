import { Request, Response } from "express";
import { customerService } from "../services/customer.service";
import { CreateCustomerInput, UpdateCustomerInput } from "../validators/customer.validator";

export const createCustomer = async (req: Request, res: Response) => {
    try {
        const customerData: CreateCustomerInput = req.body;
        const customer = await customerService.createCustomer(customerData);

        return res.status(201).json({
            status: "success",
            message: "Customer created successfully",
            data: customer,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error creating customer",
        });
    }
};

export const updateCustomer = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customerData: UpdateCustomerInput = req.body;
        const customer = await customerService.updateCustomer(id, customerData);

        return res.status(200).json({
            status: "success",
            message: "Customer updated successfully",
            data: customer,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating customer",
        });
    }
};

export const deleteCustomer = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerService.deleteCustomer(id);

        return res.status(200).json({
            status: "success",
            message: "Customer deleted successfully",
            data: customer,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error deleting customer",
        });
    }
};

export const getCustomerById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerService.getCustomerById(id);

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving customer",
        });
    }
};

export const getAllCustomers = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, name, email, phone } = req.query;

        const filters: any = {};

        if (name) {
            filters.name = name as string;
        }

        if (email) {
            filters.email = email as string;
        }

        if (phone) {
            filters.phone = phone as string;
        }

        const customers = await customerService.getAllCustomers({
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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving customers",
        });
    }
};

export const findCustomerByEmail = async (req: Request, res: Response) => {
    try {
        const email = req.params.email;
        const customer = await customerService.findByEmail(email);

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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error finding customer by email",
        });
    }
};

export const findCustomerByPhone = async (req: Request, res: Response) => {
    try {
        const phone = req.params.phone;
        const customer = await customerService.findByPhone(phone);

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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error finding customer by phone",
        });
    }
};

export const getCustomerWithOrders = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const customer = await customerService.getCustomerWithOrders(id);

        return res.status(200).json({
            status: "success",
            data: customer,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving customer with orders",
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

        const customers = await customerService.searchCustomers(searchTerm as string, {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "asc",
        });

        return res.status(200).json({
            status: "success",
            ...customers,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error searching customers",
        });
    }
};

export const getCustomerOrderStats = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const stats = await customerService.getCustomerOrderStats(id);

        return res.status(200).json({
            status: "success",
            data: stats,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving customer order statistics",
        });
    }
};
