import { Request, Response, NextFunction } from "express";
import { supplierServiceInstance } from "@/services";
import { CreateSupplierInput, UpdateSupplierInput } from "@/validators/supplier.validator";

export const createSupplier = async (
    req: Request<Record<string, never>, Record<string, never>, CreateSupplierInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const supplierData = req.body;
        const supplier = await supplierServiceInstance.createSupplier(supplierData);
        return res.status(201).json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

export const updateSupplier = async (req: Request<{ id: number }, Record<string, never>, UpdateSupplierInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplierData = req.body;
        const supplier = await supplierServiceInstance.updateSupplier(id, supplierData);
        return res.status(200).json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSupplier = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await supplierServiceInstance.deleteSupplier(id);
        return res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getSupplierById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplier = await supplierServiceInstance.getSupplierById(id);
        return res.status(200).json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllSuppliers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, sortBy, sortOrder, searchTerm } = req.query;

        const paginationParams = {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string,
            sortOrder: sortOrder as "asc" | "desc",
            searchTerm: searchTerm as string,
        };

        const suppliers = await supplierServiceInstance.getAllSuppliers(paginationParams);
        return res.status(200).json({
            success: true,
            ...suppliers,
        });
    } catch (error) {
        next(error);
    }
};

export const findSuppliersByName = async (
    req: Request<Record<string, never>, Record<string, never>, Record<string, never>, { name: string }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { name } = req.query;
        const suppliers = await supplierServiceInstance.findByName(name);

        return res.status(200).json({
            success: true,
            data: suppliers,
        });
    } catch (error) {
        next(error);
    }
};

export const getSupplierWithPurchaseOrders = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const supplier = await supplierServiceInstance.getSupplierWithPurchaseOrders(id);

        return res.status(200).json({
            success: true,
            data: supplier,
        });
    } catch (error) {
        next(error);
    }
};
