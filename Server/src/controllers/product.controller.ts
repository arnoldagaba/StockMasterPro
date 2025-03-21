import { Request, Response, NextFunction } from "express";
import { productServiceInstance } from "@/services";
import { CreateProductInput, UpdateProductInput, AddProductComponentInput } from "@/validators/product.validator";

export const createProduct = async (
    req: Request<Record<string, never>, Record<string, never>, CreateProductInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const productData = req.body;
        const product = await productServiceInstance.createProduct(productData);
        return res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req: Request<{ id: number }, Record<string, never>, UpdateProductInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const productData = req.body;
        const product = await productServiceInstance.updateProduct(id, productData);
        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteProduct = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await productServiceInstance.deleteProduct(id);
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getProductById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const product = await productServiceInstance.getProductById(id);
        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit, sortBy, sortOrder, searchTerm, ...filters } = req.query;

        const paginationParams = {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string,
            sortOrder: sortOrder as "asc" | "desc",
            searchTerm: searchTerm as string,
            filters,
        };

        const products = await productServiceInstance.getAllProducts(paginationParams);
        return res.status(200).json({
            success: true,
            ...products,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductsByCategory = async (req: Request<{ categoryId: number }>, res: Response, next: NextFunction) => {
    try {
        const { categoryId } = req.params;
        const { page, limit, sortBy, sortOrder, searchTerm } = req.query;

        const paginationParams = {
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string,
            sortOrder: sortOrder as "asc" | "desc",
            searchTerm: searchTerm as string,
        };

        const products = await productServiceInstance.findByCategory(categoryId, paginationParams);

        return res.status(200).json({
            success: true,
            ...products,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductBySku = async (
    req: Request<Record<string, never>, Record<string, never>, Record<string, never>, { sku: string }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { sku } = req.query;
        const product = await productServiceInstance.findBySku(sku);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: `Product with SKU ${sku} not found`,
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const updateProductStock = async (
    req: Request<{ id: number }, Record<string, never>, { locationId: number; quantity: number }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { locationId, quantity } = req.body;

        const inventory = await productServiceInstance.updateStock(id, locationId, quantity);

        return res.status(200).json({
            success: true,
            data: inventory,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductWithInventory = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const product = await productServiceInstance.getProductWithInventory(id);

        return res.status(200).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductComponents = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const components = await productServiceInstance.getProductComponents(id);

        return res.status(200).json({
            success: true,
            data: components,
        });
    } catch (error) {
        next(error);
    }
};

export const addProductComponent = async (
    req: Request<{ id: number }, Record<string, never>, AddProductComponentInput>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { componentId, quantity, unit } = req.body;

        const component = await productServiceInstance.addProductComponent(id, componentId, quantity, unit);

        return res.status(201).json({
            success: true,
            data: component,
        });
    } catch (error) {
        next(error);
    }
};

export const removeProductComponent = async (req: Request<{ id: number; componentId: number }>, res: Response, next: NextFunction) => {
    try {
        const { id, componentId } = req.params;

        await productServiceInstance.removeProductComponent(id, componentId);

        return res.status(200).json({
            success: true,
            message: "Component removed successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const addProductImage = async (
    req: Request<{ id: number }, Record<string, never>, { imageUrl: string; isDefault?: boolean }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { imageUrl, isDefault = false } = req.body;

        const product = await productServiceInstance.updateProductImage(id, imageUrl, isDefault);

        return res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};
