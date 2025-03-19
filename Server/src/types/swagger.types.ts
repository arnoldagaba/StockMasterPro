/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - firstName
 *         - lastName
 *         - roleId
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the user
 *         email:
 *           type: string
 *           description: User's email address
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         roleId:
 *           type: integer
 *           description: User's role ID
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Update timestamp
 *
 *     Product:
 *       type: object
 *       required:
 *         - sku
 *         - name
 *         - categoryId
 *         - price
 *         - cost
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the product
 *         sku:
 *           type: string
 *           description: Stock keeping unit (unique identifier)
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         categoryId:
 *           type: integer
 *           description: Category ID
 *         price:
 *           type: integer
 *           description: Selling price in Ugandan currency
 *         cost:
 *           type: integer
 *           description: Purchase cost in Ugandan currency
 *         barcode:
 *           type: string
 *           description: Product barcode
 *         weight:
 *           type: number
 *           format: float
 *           description: Product weight
 *         reorderPoint:
 *           type: integer
 *           description: Minimum stock level before reordering
 *         reorderQuantity:
 *           type: integer
 *           description: Suggested quantity to reorder
 *
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the category
 *         name:
 *           type: string
 *           description: Category name
 *         description:
 *           type: string
 *           description: Category description
 *         parentId:
 *           type: integer
 *           nullable: true
 *           description: Parent category ID
 *         level:
 *           type: integer
 *           description: Category hierarchy level
 *
 *     Order:
 *       type: object
 *       required:
 *         - orderNumber
 *         - customerId
 *         - userId
 *         - subtotal
 *         - tax
 *         - shippingCost
 *         - total
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the order
 *         orderNumber:
 *           type: string
 *           description: Unique order number
 *         customerId:
 *           type: integer
 *           description: Customer ID
 *         userId:
 *           type: integer
 *           description: User ID who created the order
 *         orderDate:
 *           type: string
 *           format: date-time
 *           description: Order creation date
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELED]
 *           description: Order status
 *         subtotal:
 *           type: integer
 *           description: Order subtotal amount
 *         tax:
 *           type: integer
 *           description: Tax amount
 *         shippingCost:
 *           type: integer
 *           description: Shipping cost
 *         total:
 *           type: integer
 *           description: Total order amount
 *
 *     Inventory:
 *       type: object
 *       required:
 *         - productId
 *         - locationId
 *         - quantity
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the inventory entry
 *         productId:
 *           type: integer
 *           description: Product ID
 *         locationId:
 *           type: integer
 *           description: Location ID
 *         quantity:
 *           type: integer
 *           description: Available quantity
 *         reservedQuantity:
 *           type: integer
 *           description: Reserved quantity (not available for sale)
 *         batchNumber:
 *           type: string
 *           description: Batch or lot number
 */
