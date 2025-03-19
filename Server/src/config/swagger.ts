import swaggerJSDoc from "swagger-jsdoc";
import { version } from "../../package.json";

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Inventory Management API",
            version,
            description: "API for managing inventory, orders, and related operations",
            contact: {
                name: "API Support",
                email: "support@example.com",
            },
        },
        servers: [
            {
                url: "http://localhost:3000/api",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
        tags: [
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Users", description: "User management" },
            { name: "Products", description: "Product operations" },
            { name: "Categories", description: "Product categories" },
            { name: "Inventory", description: "Inventory management" },
            { name: "Orders", description: "Customer orders" },
            { name: "PurchaseOrders", description: "Supplier purchase orders" },
            { name: "Reports", description: "Reporting functionality" },
        ],
    },
    apis: ["./src/routes/*.ts", "./src/models/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
