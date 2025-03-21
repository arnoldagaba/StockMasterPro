import { Request, Response, NextFunction } from "express";
import { productService } from "../services";
import { CreateProductInput, UpdateProductInput, AddProductComponentInput } from "../validators/product.validator";

export const createProduct = async (req: Request<{}, {}, CreateProductInput>, res: Response, next: NextFunction) => {
    try {
        const productData = req.body;
        const product = await productService.createProduct(productData);
        return res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};

export const updateProduct = async (req: Request<{ id: number }, {}, UpdateProductInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const productData = req.body;
        const product = await productService.updateProduct(id, productData);
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
        await productService.deleteProduct(id);
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
        const product = await productService.getProductById(id);
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

        const products = await productService.getAllProducts(paginationParams);
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

        const products = await productService.findByCategory(categoryId, paginationParams);

        return res.status(200).json({
            success: true,
            ...products,
        });
    } catch (error) {
        next(error);
    }
};

export const getProductBySku = async (req: Request<{}, {}, {}, { sku: string }>, res: Response, next: NextFunction) => {
    try {
        const { sku } = req.query;
        const product = await productService.findBySku(sku);

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
    req: Request<{ id: number }, {}, { locationId: number; quantity: number }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { locationId, quantity } = req.body;

        const inventory = await productService.updateStock(id, locationId, quantity);

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
        const product = await productService.getProductWithInventory(id);

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
        const components = await productService.getProductComponents(id);

        return res.status(200).json({
            success: true,
            data: components,
        });
    } catch (error) {
        next(error);
    }
};

export const addProductComponent = async (req: Request<{ id: number }, {}, AddProductComponentInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const componentData = req.body;

        const component = await productService.addProductComponent(id, componentData);

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

        await productService.removeProductComponent(id, componentId);

        return res.status(200).json({
            success: true,
            message: "Component removed successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const addProductImage = async (
    req: Request<{ id: number }, {}, { imageUrl: string; isDefault?: boolean }>,
    res: Response,
    next: NextFunction,
) => {
    try {
        const { id } = req.params;
        const { imageUrl, isDefault = false } = req.body;

        const product = await productService.updateProductImage(id, imageUrl, isDefault);

        return res.status(201).json({
            success: true,
            data: product,
        });
    } catch (error) {
        next(error);
    }
};
