import { PrismaClient, Product, Inventory, ProductComponent, Prisma } from '@prisma/client';
import { IProductService, PaginationParams, SearchFilter } from './interfaces';
import { BaseServiceImpl } from './base.service';

export class ProductService extends BaseServiceImpl<Product, Prisma.ProductCreateInput, Prisma.ProductUpdateInput> implements IProductService {
  constructor(prisma: PrismaClient) {
    super(prisma, 'product');
  }

  /**
   * Find a product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    try {
      const product = await this.prisma.product.findFirst({
        where: {
          sku,
          deletedAt: null
        }
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
    params?: PaginationParams & SearchFilter
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'id',
        sortOrder = 'desc',
        searchTerm = '',
        filters = {},
      } = params || {};
      
      // Convert string values to numbers
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;
      
      // Build where clause based on filter and search term
      const where: Record<string, unknown> = { 
        ...filters,
        categoryId,
        deletedAt: null 
      };
      
      // Add search functionality if searchTerm is provided
      if (searchTerm) {
        where.OR = [
          { name: { contains: searchTerm } },
          { sku: { contains: searchTerm } },
          { description: { contains: searchTerm } },
        ];
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
        where: { id: productId }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Check if location exists
      const location = await this.prisma.location.findUnique({
        where: { id: locationId }
      });

      if (!location) {
        throw new Error(`Location with ID ${locationId} not found`);
      }

      // Find existing inventory item or create a new one
      let inventory = await this.prisma.inventory.findFirst({
        where: {
          productId,
          locationId
        }
      });

      if (inventory) {
        // Update existing inventory
        inventory = await this.prisma.inventory.update({
          where: { id: inventory.id },
          data: { quantity }
        });
      } else {
        // Create new inventory item
        inventory = await this.prisma.inventory.create({
          data: {
            productId,
            locationId,
            quantity,
            reservedQuantity: 0
          }
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
          deletedAt: null
        },
        include: { inventoryItems: true }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      return {
        ...product,
        inventory: product.inventoryItems
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
          deletedAt: null
        }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Get components
      const components = await this.prisma.productComponent.findMany({
        where: { productId },
        include: { component: true }
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
          deletedAt: null
        }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Check if component exists
      const component = await this.prisma.product.findUnique({
        where: {
          id: componentId,
          deletedAt: null
        }
      });

      if (!component) {
        throw new Error(`Component with ID ${componentId} not found`);
      }

      // Prevent circular dependencies
      if (productId === componentId) {
        throw new Error('A product cannot be a component of itself');
      }

      // Check if component is already added to prevent duplicates
      const existingComponent = await this.prisma.productComponent.findFirst({
        where: {
          productId,
          componentId
        }
      });

      if (existingComponent) {
        // Update existing component quantity
        return await this.prisma.productComponent.update({
          where: { id: existingComponent.id },
          data: { 
            quantity: new Prisma.Decimal(quantity),
            unit 
          }
        });
      } else {
        // Add new component
        return await this.prisma.productComponent.create({
          data: {
            productId,
            componentId,
            quantity: new Prisma.Decimal(quantity),
            unit
          }
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
          componentId
        }
      });

      if (!component) {
        throw new Error(`Component ${componentId} is not part of product ${productId}`);
      }

      // Delete the component relation
      await this.prisma.productComponent.delete({
        where: { id: component.id }
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
          deletedAt: null
        }
      });

      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Get existing images
      const existingImages = await this.prisma.productImage.findMany({
        where: { productId }
      });

      // If this is the default image, unset default flag on other images
      if (isDefault) {
        await Promise.all(
          existingImages
            .filter(img => img.isDefault)
            .map(img => this.prisma.productImage.update({
              where: { id: img.id },
              data: { isDefault: false }
            }))
        );
      }

      // Calculate sort order (last position by default)
      const sortOrder = existingImages.length > 0
        ? Math.max(...existingImages.map(img => img.sortOrder)) + 1
        : 0;

      // Create the new image
      await this.prisma.productImage.create({
        data: {
          productId,
          url: imageUrl,
          isDefault,
          sortOrder
        }
      });

      // Get the updated product with images
      const updatedProduct = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { image: true }
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
            deletedAt: null
          }
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
} 