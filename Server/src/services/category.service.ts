import { PrismaClient, Category, Product, Prisma } from "@prisma/client";
import { ICategoryService, CategoryHierarchyItem } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import prisma from "@/config/prisma";
import { ApiError } from "@/utils/apiError";
import { CreateCategoryInput, UpdateCategoryInput } from "@/validators/category.validator";

export class CategoryService extends BaseServiceImpl<Category, Prisma.CategoryCreateInput, Prisma.CategoryUpdateInput> implements ICategoryService {
    constructor(prisma: PrismaClient) {
        super(prisma, "category");
    }

    /**
     * Find a category by name
     */
    async findByName(name: string): Promise<Category | null> {
        try {
            const category = await this.prisma.category.findFirst({
                where: { name },
            });
            return category;
        } catch (error) {
            this.handleError(error, `Error finding category by name: ${name}`);
            throw error;
        }
    }

    /**
     * Find subcategories of a parent category
     */
    async findSubcategories(categoryId: number): Promise<Category[]> {
        try {
            const subcategories = await this.prisma.category.findMany({
                where: { parentId: categoryId },
            });
            return subcategories;
        } catch (error) {
            this.handleError(error, `Error finding subcategories for category ID: ${categoryId}`);
            throw error;
        }
    }

    /**
     * Find a category with its products
     */
    async findWithProducts(categoryId: number): Promise<Category & { products: Product[] }> {
        try {
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId },
                include: { products: true },
            });

            if (!category) {
                throw new Error(`Category with ID ${categoryId} not found`);
            }

            return category;
        } catch (error) {
            this.handleError(error, `Error finding category with products for ID: ${categoryId}`);
            throw error;
        }
    }

    /**
     * Get the complete hierarchy of categories
     */
    async getHierarchy(): Promise<CategoryHierarchyItem[]> {
        try {
            // First, get all categories
            const allCategories = await this.prisma.category.findMany({
                orderBy: { level: "asc" },
            });

            // Build the hierarchy recursively
            const buildHierarchy = (parentId: number | null): CategoryHierarchyItem[] => {
                return allCategories
                    .filter((c) => c.parentId === parentId)
                    .map((category) => {
                        return {
                            ...category,
                            subcategories: buildHierarchy(category.id),
                        };
                    });
            };

            return buildHierarchy(null);
        } catch (error) {
            this.handleError(error, "Error retrieving category hierarchy");
            throw error;
        }
    }

    /**
     * Override create to handle level calculation and validation
     */
    async create(data: Prisma.CategoryCreateInput): Promise<Category> {
        try {
            // Check if a category with this name already exists
            const existingCategory = await this.findByName(data.name);
            if (existingCategory) {
                throw new Error(`Category with name '${data.name}' already exists`);
            }

            // If parent ID is provided, verify parent exists and calculate level
            let level = 0;
            if (data.parent) {
                const parentId = (data.parent as Prisma.CategoryCreateNestedOneWithoutSubcategoriesInput).connect?.id;
                if (parentId) {
                    const parent = await this.prisma.category.findUnique({
                        where: { id: parentId },
                    });

                    if (!parent) {
                        throw new Error(`Parent category with ID ${parentId} not found`);
                    }

                    level = parent.level + 1;
                }
            }

            // Set the level
            const newData = {
                ...data,
                level,
            };

            return await this.prisma.category.create({ data: newData });
        } catch (error) {
            this.handleError(error, `Error creating category with name: ${data.name}`);
            throw error;
        }
    }

    /**
     * Override update to handle level updates when parent changes
     */
    async update(id: number, data: Prisma.CategoryUpdateInput): Promise<Category> {
        try {
            // If name is being updated, check uniqueness
            if (data.name) {
                const existingCategory = await this.prisma.category.findFirst({
                    where: {
                        name: data.name as string,
                        id: { not: id },
                    },
                });

                if (existingCategory) {
                    throw new Error(`Category with name '${data.name}' already exists`);
                }
            }

            // If parent is being updated, recalculate level
            if (data.parent) {
                const parentConnectId = (data.parent as Prisma.CategoryUpdateOneWithoutSubcategoriesNestedInput).connect?.id;

                if (parentConnectId) {
                    // Check for circular dependency
                    const isCircular = await this.checkCircularDependency(id, parentConnectId);
                    if (isCircular) {
                        throw new Error("Cannot create circular dependency in category hierarchy");
                    }

                    // Get the new parent's level
                    const parent = await this.prisma.category.findUnique({
                        where: { id: parentConnectId },
                    });

                    if (parent) {
                        // Set new level based on parent's level
                        data.level = parent.level + 1;

                        // Also update levels of all subcategories
                        await this.updateSubcategoryLevels(id, parent.level + 1);
                    }
                } else if ((data.parent as Prisma.CategoryUpdateOneWithoutSubcategoriesNestedInput).disconnect) {
                    // If parent is being removed, set level to 0
                    data.level = 0;

                    // Also update levels of all subcategories
                    await this.updateSubcategoryLevels(id, 0);
                }
            }

            return await super.update(id, data);
        } catch (error) {
            this.handleError(error, `Error updating category with ID: ${id}`);
            throw error;
        }
    }

    /**
     * Check if a parent-child relationship would create a circular dependency
     */
    private async checkCircularDependency(categoryId: number, parentId: number): Promise<boolean> {
        // If trying to set itself as parent, that's a circular dependency
        if (categoryId === parentId) {
            return true;
        }

        // Get all ancestors of the potential parent
        const ancestors = await this.getAllAncestors(parentId);

        // If the category is in the ancestors, it would create a circular dependency
        return ancestors.some((a) => a.id === categoryId);
    }

    /**
     * Get all ancestors of a category
     */
    private async getAllAncestors(categoryId: number): Promise<Category[]> {
        const result: Category[] = [];
        let currentId = categoryId;

        // Loop until we reach the root
        while (true) {
            const category = await this.prisma.category.findUnique({
                where: { id: currentId },
            });

            if (!category || category.parentId === null) {
                break;
            }

            const parent = await this.prisma.category.findUnique({
                where: { id: category.parentId },
            });

            if (!parent) {
                break;
            }

            result.push(parent);
            currentId = parent.id;
        }

        return result;
    }

    /**
     * Update the levels of all subcategories recursively
     */
    private async updateSubcategoryLevels(categoryId: number, parentLevel: number): Promise<void> {
        const level = parentLevel + 1;

        // Get direct subcategories
        const subcategories = await this.prisma.category.findMany({
            where: { parentId: categoryId },
        });

        for (const subcategory of subcategories) {
            // Update the subcategory level
            await this.prisma.category.update({
                where: { id: subcategory.id },
                data: { level },
            });

            // Recursively update any deeper subcategories
            await this.updateSubcategoryLevels(subcategory.id, level);
        }
    }

    async createCategory(categoryData: CreateCategoryInput) {
        try {
            const category = await prisma.category.create({
                data: categoryData,
            });

            return category;
        } catch {
            throw new ApiError(500, "Error creating category");
        }
    }

    async updateCategory(id: number, categoryData: UpdateCategoryInput) {
        try {
            const existingCategory = await prisma.category.findUnique({
                where: { id },
            });

            if (!existingCategory) {
                throw new ApiError(404, "Category not found");
            }

            const updatedCategory = await prisma.category.update({
                where: { id },
                data: categoryData,
            });

            return updatedCategory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating category");
        }
    }

    async deleteCategory(id: number) {
        try {
            // Check if there are any subcategories
            const subcategories = await prisma.category.findMany({
                where: { parentId: id },
            });

            if (subcategories.length > 0) {
                throw new ApiError(400, "Cannot delete category with subcategories");
            }

            // Check if there are any products in this category
            const productsInCategory = await prisma.product.findMany({
                where: { categoryId: id },
            });

            if (productsInCategory.length > 0) {
                throw new ApiError(400, "Cannot delete category with products");
            }

            const existingCategory = await prisma.category.findUnique({
                where: { id },
            });

            if (!existingCategory) {
                throw new ApiError(404, "Category not found");
            }

            await prisma.category.delete({
                where: { id },
            });

            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting category");
        }
    }

    async getCategoryById(id: number) {
        try {
            const category = await prisma.category.findUnique({
                where: { id },
                include: {
                    parent: true,
                },
            });

            if (!category) {
                throw new ApiError(404, "Category not found");
            }

            return category;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving category");
        }
    }

    async getAllCategories() {
        try {
            const categories = await prisma.category.findMany({
                include: {
                    parent: true,
                },
            });

            return categories;
        } catch {
            throw new ApiError(500, "Error retrieving categories");
        }
    }

    async getCategoryHierarchy() {
        try {
            // Get all categories
            const allCategories = await prisma.category.findMany();

            // Build hierarchy tree
            type CategoryWithChildren = Category & { children: CategoryWithChildren[] };

            const buildTree = (parentId: number | null = null): CategoryWithChildren[] => {
                return allCategories
                    .filter((category) => category.parentId === parentId)
                    .map(
                        (category): CategoryWithChildren => ({
                            ...category,
                            children: buildTree(category.id),
                        }),
                    );
            };

            const hierarchy = buildTree();

            return hierarchy;
        } catch {
            throw new ApiError(500, "Error retrieving category hierarchy");
        }
    }

    async getSubcategories(parentId: number) {
        try {
            // Check if parent category exists
            const parentCategory = await prisma.category.findUnique({
                where: { id: parentId },
            });

            if (!parentCategory) {
                throw new ApiError(404, "Parent category not found");
            }

            const subcategories = await prisma.category.findMany({
                where: { parentId },
            });

            return subcategories;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving subcategories");
        }
    }

    async getCategoryWithProducts(id: number) {
        try {
            const category = await prisma.category.findUnique({
                where: { id },
                include: {
                    products: true,
                },
            });

            if (!category) {
                throw new ApiError(404, "Category not found");
            }

            return category;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving category with products");
        }
    }
}
