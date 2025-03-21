import swaggerJSDoc from "swagger-jsdoc";
import { version } from "../../package.json";

const PORT = process.env.PORT ?? 5000;

const swaggerDefinition = {
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
            url: `http://localhost:${PORT}/api`,
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
        schemas: {
            User: {
                type: "object",
                properties: {
                    id: { type: "integer" },
                    email: { type: "string", format: "email" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    roleId: { type: "integer" },
                    createdAt: { type: "string", format: "date-time" },
                    updatedAt: { type: "string", format: "date-time" },
                },
            },
            Login: {
                type: "object",
                properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                },
                required: ["email", "password"],
            },
            RefreshToken: {
                type: "object",
                properties: {
                    refreshToken: { type: "string" },
                },
                required: ["refreshToken"],
            },
            ChangePassword: {
                type: "object",
                properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string" },
                },
                required: ["currentPassword", "newPassword"],
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    tags: [
        { name: "Users", description: "User management" },
        { name: "Products", description: "Product operations" },
        { name: "Categories", description: "Product categories" },
        { name: "Inventory", description: "Inventory management" },
        { name: "Orders", description: "Customer orders" },
        { name: "PurchaseOrders", description: "Supplier purchase orders" },
        { name: "Reports", description: "Reporting functionality" },
    ],
    paths: {
        "/api/users/login": {
            post: {
                tags: ["Users"],
                summary: "Login a user",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Login",
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Successful login",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        success: { type: "boolean" },
                                        data: {
                                            type: "object",
                                            properties: {
                                                user: { $ref: "#/components/schemas/User" },
                                                token: { type: "string" },
                                                refreshToken: { type: "string" },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    401: {
                        description: "Invalid credentials",
                    },
                },
            },
        },
        "/api/users/refresh-token": {
            post: {
                tags: ["Users"],
                summary: "Refresh access token",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/RefreshToken",
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Token refreshed successfully",
                    },
                    401: {
                        description: "Invalid refresh token",
                    },
                },
            },
        },
        "/api/users/profile": {
            get: {
                tags: ["Users"],
                summary: "Get current user profile",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "User profile retrieved successfully",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                },
            },
        },
        "/api/users": {
            post: {
                tags: ["Users"],
                summary: "Create a new user",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    email: { type: "string", format: "email" },
                                    password: { type: "string", minLength: 8 },
                                    firstName: { type: "string", minLength: 2 },
                                    lastName: { type: "string", minLength: 2 },
                                    roleId: { type: "integer" },
                                },
                                required: ["email", "password", "firstName", "lastName", "roleId"],
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: "User created successfully",
                    },
                    400: {
                        description: "Invalid input",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                    403: {
                        description: "Forbidden - requires admin role",
                    },
                },
            },
            get: {
                tags: ["Users"],
                summary: "Get all users",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "List of users retrieved successfully",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                    403: {
                        description: "Forbidden - requires admin role",
                    },
                },
            },
        },
        "/api/users/{id}": {
            get: {
                tags: ["Users"],
                summary: "Get user by ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: {
                            type: "integer",
                        },
                    },
                ],
                responses: {
                    200: {
                        description: "User retrieved successfully",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                    404: {
                        description: "User not found",
                    },
                },
            },
            put: {
                tags: ["Users"],
                summary: "Update user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: {
                            type: "integer",
                        },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    email: { type: "string", format: "email" },
                                    firstName: { type: "string", minLength: 2 },
                                    lastName: { type: "string", minLength: 2 },
                                    roleId: { type: "integer" },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "User updated successfully",
                    },
                    400: {
                        description: "Invalid input",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                    404: {
                        description: "User not found",
                    },
                },
            },
            delete: {
                tags: ["Users"],
                summary: "Delete user",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: {
                            type: "integer",
                        },
                    },
                ],
                responses: {
                    200: {
                        description: "User deleted successfully",
                    },
                    401: {
                        description: "Unauthorized",
                    },
                    403: {
                        description: "Forbidden - requires admin role",
                    },
                    404: {
                        description: "User not found",
                    },
                },
            },
        },
        "/api/users/{id}/change-password": {
            post: {
                tags: ["Users"],
                summary: "Change user password",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: {
                            type: "integer",
                        },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/ChangePassword",
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: "Password changed successfully",
                    },
                    400: {
                        description: "Invalid input",
                    },
                    401: {
                        description: "Unauthorized or current password is incorrect",
                    },
                    404: {
                        description: "User not found",
                    },
                },
            },
        },
    },
};

const options = {
    swaggerDefinition,
    apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
