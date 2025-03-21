import { Request, Response, NextFunction } from "express";
import { categoryService } from "../services";
import { CreateCategoryInput, UpdateCategoryInput } from "../validators/category.validator";

export const createCategory = async (req: Request<{}, {}, CreateCategoryInput>, res: Response, next: NextFunction) => {
    try {
        const categoryData = req.body;
        const category = await categoryService.createCategory(categoryData);
        return res.status(201).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const updateCategory = async (req: Request<{ id: number }, {}, UpdateCategoryInput>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const categoryData = req.body;
        const category = await categoryService.updateCategory(id, categoryData);
        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const deleteCategory = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await categoryService.deleteCategory(id);
        return res.status(200).json({
            success: true,
            message: "Category deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryById = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const category = await categoryService.getCategoryById(id);
        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error) {
        next(error);
    }
};

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await categoryService.getAllCategories();
        return res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryHierarchy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const hierarchy = await categoryService.getCategoryHierarchy();
        return res.status(200).json({
            success: true,
            data: hierarchy,
        });
    } catch (error) {
        next(error);
    }
};

export const getSubcategories = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const subcategories = await categoryService.getSubcategories(id);
        return res.status(200).json({
            success: true,
            data: subcategories,
        });
    } catch (error) {
        next(error);
    }
};

export const getCategoryWithProducts = async (req: Request<{ id: number }>, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const categoryWithProducts = await categoryService.getCategoryWithProducts(id);
        return res.status(200).json({
            success: true,
            data: categoryWithProducts,
        });
    } catch (error) {
        next(error);
    }
};
