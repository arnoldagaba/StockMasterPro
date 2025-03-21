import { PrismaClient, Product, Inventory, ProductComponent, Prisma } from "@prisma/client";
import { IProductService, PaginationParams, SearchFilter } from "./interfaces";
import { BaseServiceImpl } from "./base.service";
import { prisma } from "../utils/prisma";
import { ApiError } from "../utils/apiError";
import { CreateProductInput, UpdateProductInput, AddProductComponentInput } from "../validators/product.validator";

export class ProductService extends BaseServiceImpl<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> implements IProductService {
    constructor(prisma: PrismaClient) {
        super(prisma, "product");
    }

    /**
     * Find a product by SKU
     */
    async findBySku(sku: string): Promise<Product | null> {
        try {
            const product = await this.prisma.product.findFirst({
                where: {
                    sku,
                    deletedAt: null,
                },
            });
            return product;
        } catch (error) {
            this.handleError(error, `Error finding product by SKU: ${sku}`);
            throw error;
        }
    }

    /**
     * Find products by category with pagination and filtering
     */
    async findByCategory(
        categoryId: number,
        params?: PaginationParams & SearchFilter,
    ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
        try {
            const { page = 1, limit = 10, sortBy = "id", sortOrder = "desc", searchTerm = "", filters = {} } = params || {};

            // Convert string values to numbers
            const pageNum = Number(page);
            const limitNum = Number(limit);
            const skip = (pageNum - 1) * limitNum;

            // Build where clause based on filter and search term
            const where: Record<string, unknown> = {
                ...filters,
                categoryId,
                deletedAt: null,
            };

            // Add search functionality if searchTerm is provided
            if (searchTerm) {
                where.OR = [{ name: { contains: searchTerm } }, { sku: { contains: searchTerm } }, { description: { contains: searchTerm } }];
            }

            // Get total count
            const total = await this.prisma.product.count({ where });

            // Get paginated data
            const data = await this.prisma.product.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { [sortBy]: sortOrder },
            });

            return {
                data,
                total,
                page: pageNum,
                limit: limitNum,
            };
        } catch (error) {
            this.handleError(error, `Error finding products for category ID: ${categoryId}`);
            throw error;
        }
    }

    /**
     * Update the stock of a product at a location
     */
    async updateStock(productId: number, locationId: number, quantity: number): Promise<Inventory> {
        try {
            // Check if product exists
            const product = await this.prisma.product.findUnique({
                where: { id: productId },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Check if location exists
            const location = await this.prisma.location.findUnique({
                where: { id: locationId },
            });

            if (!location) {
                throw new Error(`Location with ID ${locationId} not found`);
            }

            // Find existing inventory item or create a new one
            let inventory = await this.prisma.inventory.findFirst({
                where: {
                    productId,
                    locationId,
                },
            });

            if (inventory) {
                // Update existing inventory
                inventory = await this.prisma.inventory.update({
                    where: { id: inventory.id },
                    data: { quantity },
                });
            } else {
                // Create new inventory item
                inventory = await this.prisma.inventory.create({
                    data: {
                        productId,
                        locationId,
                        quantity,
                        reservedQuantity: 0,
                    },
                });
            }

            return inventory;
        } catch (error) {
            this.handleError(error, `Error updating stock for product ID ${productId} at location ID ${locationId}`);
            throw error;
        }
    }

    /**
     * Get a product with all its inventory
     */
    async getProductWithInventory(productId: number): Promise<Product & { inventory: Inventory[] }> {
        try {
            const product = await this.prisma.product.findUnique({
                where: {
                    id: productId,
                    deletedAt: null,
                },
                include: { inventoryItems: true },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            return {
                ...product,
                inventory: product.inventoryItems,
            };
        } catch (error) {
            this.handleError(error, `Error getting product with inventory for ID: ${productId}`);
            throw error;
        }
    }

    /**
     * Get all components of a product
     */
    async getProductComponents(productId: number): Promise<ProductComponent[]> {
        try {
            // Check if product exists
            const product = await this.prisma.product.findUnique({
                where: {
                    id: productId,
                    deletedAt: null,
                },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Get components
            const components = await this.prisma.productComponent.findMany({
                where: { productId },
                include: { component: true },
            });

            return components;
        } catch (error) {
            this.handleError(error, `Error getting components for product ID: ${productId}`);
            throw error;
        }
    }

    /**
     * Add a component to a product
     */
    async addProductComponent(productId: number, componentId: number, quantity: number, unit?: string): Promise<ProductComponent> {
        try {
            // Check if product exists
            const product = await this.prisma.product.findUnique({
                where: {
                    id: productId,
                    deletedAt: null,
                },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Check if component exists
            const component = await this.prisma.product.findUnique({
                where: {
                    id: componentId,
                    deletedAt: null,
                },
            });

            if (!component) {
                throw new Error(`Component with ID ${componentId} not found`);
            }

            // Prevent circular dependencies
            if (productId === componentId) {
                throw new Error("A product cannot be a component of itself");
            }

            // Check if component is already added to prevent duplicates
            const existingComponent = await this.prisma.productComponent.findFirst({
                where: {
                    productId,
                    componentId,
                },
            });

            if (existingComponent) {
                // Update existing component quantity
                return await this.prisma.productComponent.update({
                    where: { id: existingComponent.id },
                    data: {
                        quantity: new Prisma.Decimal(quantity),
                        unit,
                    },
                });
            } else {
                // Add new component
                return await this.prisma.productComponent.create({
                    data: {
                        productId,
                        componentId,
                        quantity: new Prisma.Decimal(quantity),
                        unit,
                    },
                });
            }
        } catch (error) {
            this.handleError(error, `Error adding component ${componentId} to product ${productId}`);
            throw error;
        }
    }

    /**
     * Remove a component from a product
     */
    async removeProductComponent(productId: number, componentId: number): Promise<boolean> {
        try {
            // Check if the component relation exists
            const component = await this.prisma.productComponent.findFirst({
                where: {
                    productId,
                    componentId,
                },
            });

            if (!component) {
                throw new Error(`Component ${componentId} is not part of product ${productId}`);
            }

            // Delete the component relation
            await this.prisma.productComponent.delete({
                where: { id: component.id },
            });

            return true;
        } catch (error) {
            this.handleError(error, `Error removing component ${componentId} from product ${productId}`);
            throw error;
        }
    }

    /**
     * Update product image
     */
    async updateProductImage(productId: number, imageUrl: string, isDefault: boolean = false): Promise<Product> {
        try {
            // Check if product exists
            const product = await this.prisma.product.findUnique({
                where: {
                    id: productId,
                    deletedAt: null,
                },
            });

            if (!product) {
                throw new Error(`Product with ID ${productId} not found`);
            }

            // Get existing images
            const existingImages = await this.prisma.productImage.findMany({
                where: { productId },
            });

            // If this is the default image, unset default flag on other images
            if (isDefault) {
                await Promise.all(
                    existingImages
                        .filter((img) => img.isDefault)
                        .map((img) =>
                            this.prisma.productImage.update({
                                where: { id: img.id },
                                data: { isDefault: false },
                            }),
                        ),
                );
            }

            // Calculate sort order (last position by default)
            const sortOrder = existingImages.length > 0 ? Math.max(...existingImages.map((img) => img.sortOrder)) + 1 : 0;

            // Create the new image
            await this.prisma.productImage.create({
                data: {
                    productId,
                    url: imageUrl,
                    isDefault,
                    sortOrder,
                },
            });

            // Get the updated product with images
            const updatedProduct = await this.prisma.product.findUnique({
                where: { id: productId },
                include: { image: true },
            });

            return updatedProduct as Product;
        } catch (error) {
            this.handleError(error, `Error updating image for product ID: ${productId}`);
            throw error;
        }
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
            const where: any = {
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
                where.price = { ...(where.price || {}), lte: Number(filters.maxPrice) };
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
            const where: any = {
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

    async getProductWithInventory(productId: number) {
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

            return product;
        } catch (error) {
            if (error instanceof ApiError) throw error;
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

    async addProductComponent(productId: number, componentData: AddProductComponentInput) {
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
                where: { id: componentData.componentId },
            });

            if (!component) {
                throw new ApiError(404, "Component product not found");
            }

            // Check for circular dependency
            if (productId === componentData.componentId) {
                throw new ApiError(400, "Product cannot be a component of itself");
            }

            // Check if component dependency already exists
            const existingComponent = await prisma.productComponent.findUnique({
                where: {
                    unique_product_component: {
                        productId,
                        componentId: componentData.componentId,
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
                    componentId: componentData.componentId,
                    quantity: componentData.quantity,
                    unit: componentData.unit,
                },
                include: {
                    component: true,
                },
            });

            return productComponent;
        } catch (error) {
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

    async updateProductImage(productId: number, imageUrl: string, isDefault: boolean = false) {
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

            return updatedProduct;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating product image");
        }
    }
}
