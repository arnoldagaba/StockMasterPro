import { PrismaClient, Product, Prisma, Inventory, ProductComponent } from "@prisma/client";
import { IProductService, PaginationParams, SearchFilter } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import prisma from "@/config/prisma";
import { ApiError } from "@/utils/apiError";
import { CreateProductInput, UpdateProductInput } from "@/validators/product.validator";

export class ProductService extends BaseServiceImpl<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> implements IProductService {
    constructor(prisma: PrismaClient) {
        super(prisma, "product");
    }

    /**
     * Override create to handle SKU uniqueness
     */
    async create(data: Prisma.ProductCreateInput): Promise<Product> {
        try {
            // Check if a product with this SKU already exists
            const existingProduct = await this.findBySku(data.sku);
            if (existingProduct) {
                throw new Error(`Product with SKU '${data.sku}' already exists`);
            }

            return await super.create(data);
        } catch (error) {
            this.handleError(error, `Error creating product with SKU: ${data.sku}`);
            throw error;
        }
    }

    /**
     * Override update to handle SKU uniqueness
     */
    async update(id: number, data: Prisma.ProductUpdateInput): Promise<Product> {
        try {
            // If SKU is being updated, check uniqueness
            if (data.sku) {
                const existingProduct = await this.prisma.product.findFirst({
                    where: {
                        sku: data.sku as string,
                        id: { not: id },
                        deletedAt: null,
                    },
                });

                if (existingProduct) {
                    throw new Error(`Product with SKU '${data.sku}' already exists`);
                }
            }

            return await super.update(id, data);
        } catch (error) {
            this.handleError(error, `Error updating product with ID: ${id}`);
            throw error;
        }
    }

    async createProduct(productData: CreateProductInput) {
        try {
            // Check if product with SKU already exists
            const existingProduct = await prisma.product.findUnique({
                where: { sku: productData.sku },
            });

            if (existingProduct) {
                throw new ApiError(400, `Product with SKU "${productData.sku}" already exists`);
            }

            // Verify that the category exists
            const category = await prisma.category.findUnique({
                where: { id: productData.categoryId },
            });

            if (!category) {
                throw new ApiError(404, `Category with ID ${productData.categoryId} not found`);
            }

            const product = await prisma.product.create({
                data: productData,
            });

            return product;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error creating product");
        }
    }

    async updateProduct(id: number, productData: UpdateProductInput) {
        try {
            // Check if product exists
            const existingProduct = await prisma.product.findUnique({
                where: { id },
            });

            if (!existingProduct) {
                throw new ApiError(404, "Product not found");
            }

            // If SKU is being updated, check if it's already in use
            if (productData.sku && productData.sku !== existingProduct.sku) {
                const skuExists = await prisma.product.findUnique({
                    where: { sku: productData.sku },
                });

                if (skuExists) {
                    throw new ApiError(400, `Product with SKU "${productData.sku}" already exists`);
                }
            }

            // If category is being updated, verify it exists
            if (productData.categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: productData.categoryId },
                });

                if (!category) {
                    throw new ApiError(404, `Category with ID ${productData.categoryId} not found`);
                }
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: productData,
            });

            return updatedProduct;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating product");
        }
    }

    async deleteProduct(id: number) {
        try {
            // Check if product exists
            const existingProduct = await prisma.product.findUnique({
                where: { id },
            });

            if (!existingProduct) {
                throw new ApiError(404, "Product not found");
            }

            // Check if product is in any orders
            const orderItems = await prisma.orderItem.findFirst({
                where: { productId: id },
            });

            if (orderItems) {
                throw new ApiError(400, "Cannot delete product that is referenced in orders");
            }

            // Check if product is in any purchase orders
            const purchaseOrderItems = await prisma.purchaseOrderItem.findFirst({
                where: { productId: id },
            });

            if (purchaseOrderItems) {
                throw new ApiError(400, "Cannot delete product that is referenced in purchase orders");
            }

            // Set deletedAt instead of actually deleting
            const deletedProduct = await prisma.product.update({
                where: { id },
                data: { deletedAt: new Date() },
            });

            return deletedProduct;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting product");
        }
    }

    async getProductById(id: number) {
        try {
            const product = await prisma.product.findUnique({
                where: { id },
                include: {
                    category: true,
                    image: true,
                },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            return product;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving product");
        }
    }

    async getAllProducts(params?: PaginationParams & SearchFilter) {
        try {
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", searchTerm = "", filters = {} } = params || {};

            // Build where clause based on search term and filters
            const where: Prisma.ProductWhereInput = {
                deletedAt: null,
            };

            if (searchTerm) {
                where.OR = [{ name: { contains: searchTerm } }, { sku: { contains: searchTerm } }, { description: { contains: searchTerm } }];
            }

            // Add any specific filters
            if (filters.categoryId) {
                where.categoryId = Number(filters.categoryId);
            }

            if (filters.minPrice) {
                where.price = { gte: Number(filters.minPrice) };
            }

            if (filters.maxPrice) {
                if (filters.minPrice) {
                    // Both min and max price filters exist
                    where.price = {
                        gte: Number(filters.minPrice),
                        lte: Number(filters.maxPrice),
                    };
                } else {
                    // Only max price filter exists
                    where.price = { lte: Number(filters.maxPrice) };
                }
            }

            // Count total matching products for pagination
            const total = await prisma.product.count({ where });

            // Get paginated products
            const products = await prisma.product.findMany({
                where,
                include: {
                    category: true,
                    image: {
                        where: { isDefault: true },
                        take: 1,
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: products,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            console.error("Error retrieving products:", error);
            throw new ApiError(500, "Error retrieving products");
        }
    }

    async findByCategory(categoryId: number, params?: PaginationParams & SearchFilter) {
        try {
            const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc", searchTerm = "" } = params || {};

            // Check if category exists
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
            });

            if (!category) {
                throw new ApiError(404, `Category with ID ${categoryId} not found`);
            }

            // Get subcategory IDs for this category
            const subcategories = await prisma.category.findMany({
                where: { parentId: categoryId },
            });

            const categoryIds = [categoryId, ...subcategories.map((sc) => sc.id)];

            // Build where clause
            const where: Prisma.ProductWhereInput = {
                deletedAt: null,
                categoryId: { in: categoryIds },
            };

            if (searchTerm) {
                where.OR = [{ name: { contains: searchTerm } }, { sku: { contains: searchTerm } }, { description: { contains: searchTerm } }];
            }

            // Count total matching products
            const total = await prisma.product.count({ where });

            // Get products
            const products = await prisma.product.findMany({
                where,
                include: {
                    category: true,
                    image: {
                        where: { isDefault: true },
                        take: 1,
                    },
                },
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: products,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving products by category");
        }
    }

    async findBySku(sku: string) {
        try {
            const product = await prisma.product.findUnique({
                where: { sku },
                include: {
                    category: true,
                    image: true,
                },
            });

            return product;
        } catch (error) {
            console.error("Error finding product by SKU:", error);
            throw new ApiError(500, "Error finding product by SKU");
        }
    }

    async updateStock(productId: number, locationId: number, quantity: number) {
        try {
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            // Check if location exists
            const location = await prisma.location.findUnique({
                where: { id: locationId },
            });

            if (!location) {
                throw new ApiError(404, "Location not found");
            }

            // Find or create inventory entry
            let inventory = await prisma.inventory.findUnique({
                where: {
                    unique_product_location: {
                        productId,
                        locationId,
                    },
                },
            });

            if (inventory) {
                // Update existing inventory
                inventory = await prisma.inventory.update({
                    where: {
                        unique_product_location: {
                            productId,
                            locationId,
                        },
                    },
                    data: {
                        quantity,
                    },
                });
            } else {
                // Create new inventory entry
                inventory = await prisma.inventory.create({
                    data: {
                        productId,
                        locationId,
                        quantity,
                    },
                });
            }

            // Create inventory transaction record
            await prisma.inventoryTransaction.create({
                data: {
                    transactionType: quantity >= 0 ? "IN" : "OUT",
                    productId,
                    quantity: Math.abs(quantity),
                    toLocationId: quantity >= 0 ? locationId : undefined,
                    fromLocationId: quantity < 0 ? locationId : undefined,
                    referenceType: "MANUAL_ADJUSTMENT",
                    userId: 1, // This should be the current user's ID from auth context
                    notes: "Manual stock adjustment",
                },
            });

            return inventory;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating stock");
        }
    }

    async getProductWithInventory(productId: number): Promise<Product & { inventory: Inventory[] }> {
        try {
            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: {
                    category: true,
                    image: true,
                    inventoryItems: {
                        include: {
                            location: true,
                        },
                    },
                },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            // Map inventoryItems to inventory for interface compliance
            return {
                ...product,
                inventory: product.inventoryItems,
            };
        } catch (error) {
            console.error("Error retrieving product with inventory:", error);
            throw new ApiError(500, "Error retrieving product with inventory");
        }
    }

    async getProductComponents(productId: number) {
        try {
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            const components = await prisma.productComponent.findMany({
                where: { productId },
                include: {
                    component: true,
                },
            });

            return components;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving product components");
        }
    }

    async addProductComponent(productId: number, componentId: number, quantity: number, unit?: string): Promise<ProductComponent> {
        try {
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            // Check if component exists
            const component = await prisma.product.findUnique({
                where: { id: componentId },
            });

            if (!component) {
                throw new ApiError(404, "Component product not found");
            }

            // Check for circular dependency
            if (productId === componentId) {
                throw new ApiError(400, "Product cannot be a component of itself");
            }

            // Check if component dependency already exists
            const existingComponent = await prisma.productComponent.findUnique({
                where: {
                    unique_product_component: {
                        productId,
                        componentId,
                    },
                },
            });

            if (existingComponent) {
                throw new ApiError(400, "This component is already added to the product");
            }

            // Create the component relationship
            const productComponent = await prisma.productComponent.create({
                data: {
                    productId,
                    componentId,
                    quantity,
                    unit,
                },
            });

            return productComponent;
        } catch (error) {
            console.error("Error adding product component:", error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error adding product component");
        }
    }

    async removeProductComponent(productId: number, componentId: number) {
        try {
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            // Check if component relationship exists
            const component = await prisma.productComponent.findUnique({
                where: {
                    unique_product_component: {
                        productId,
                        componentId,
                    },
                },
            });

            if (!component) {
                throw new ApiError(404, "Component relationship not found");
            }

            // Delete the component relationship
            await prisma.productComponent.delete({
                where: {
                    unique_product_component: {
                        productId,
                        componentId,
                    },
                },
            });

            return true;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error removing product component");
        }
    }

    async updateProductImage(productId: number, imageUrl: string, isDefault = false): Promise<Product> {
        try {
            // Check if product exists
            const product = await prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new ApiError(404, "Product not found");
            }

            // Create image
            const image = await prisma.productImage.create({
                data: {
                    productId,
                    url: imageUrl,
                    isDefault,
                },
            });

            // If this is set as default, update other images to not be default
            if (isDefault) {
                await prisma.productImage.updateMany({
                    where: {
                        productId,
                        id: { not: image.id },
                    },
                    data: {
                        isDefault: false,
                    },
                });
            }

            // Get the updated product with images
            const updatedProduct = await prisma.product.findUnique({
                where: { id: productId },
                include: {
                    image: true,
                },
            });

            if (!updatedProduct) {
                throw new ApiError(404, "Product not found after updating image");
            }

            return updatedProduct;
        } catch (error) {
            console.error("Error updating product image:", error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating product image");
        }
    }
}
