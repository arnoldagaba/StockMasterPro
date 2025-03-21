import { PrismaClient, Customer, Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";
import { CreateCustomerInput, UpdateCustomerInput } from "../validators/customer.validator";
import { PaginationParams, SearchFilter, ICustomerService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

export class CustomerService extends BaseServiceImpl<Customer, Prisma.CustomerCreateInput, Prisma.CustomerUpdateInput> implements ICustomerService {
    constructor(prisma: PrismaClient) {
        super(prisma, "customer");
    }

    async findByEmail(email: string): Promise<Customer | null> {
        try {
            const customer = await this.prisma.customer.findFirst({
                where: {
                    email: {
                        equals: email,
                        mode: "insensitive",
                    } as Prisma.StringNullableFilter<"Customer">,
                },
            });

            return customer;
        } catch (error) {
            this.handleError(error, `Error finding customer with email ${email}`);
            throw error;
        }
    }

    async findByPhone(phone: string): Promise<Customer | null> {
        try {
            const customer = await this.prisma.customer.findFirst({
                where: {
                    phone: {
                        equals: phone,
                        mode: "insensitive",
                    } as Prisma.StringNullableFilter<"Customer">,
                },
            });

            return customer;
        } catch (error) {
            this.handleError(error, `Error finding customer with phone ${phone}`);
            throw error;
        }
    }

    async getCustomerWithOrders(
        customerId: number,
    ): Promise<Customer & { orders: Prisma.OrderGetPayload<{ include: { orderItems: { include: { product: true } } } }>[] }> {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: {
                    id: customerId,
                },
                include: {
                    orders: {
                        include: {
                            orderItems: {
                                include: {
                                    product: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!customer) {
                throw new Error(`Customer with ID ${customerId} not found`);
            }

            return customer;
        } catch (error) {
            this.handleError(error, `Error retrieving customer with orders: ${customerId}`);
            throw error;
        }
    }

    // Implement methods specific to this service
    async createCustomer(customerData: CreateCustomerInput): Promise<Customer> {
        try {
            // Check if email already exists (if provided)
            if (customerData.email) {
                const existingCustomerByEmail = await this.prisma.customer.findFirst({
                    where: {
                        email: {
                            equals: customerData.email,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                    },
                });

                if (existingCustomerByEmail) {
                    throw new ApiError(400, `Customer with email '${customerData.email}' already exists`);
                }
            }

            // Check if phone already exists (if provided)
            if (customerData.phone) {
                const existingCustomerByPhone = await this.prisma.customer.findFirst({
                    where: {
                        phone: {
                            equals: customerData.phone,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                    },
                });

                if (existingCustomerByPhone) {
                    throw new ApiError(400, `Customer with phone '${customerData.phone}' already exists`);
                }
            }

            // Create new customer
            const customer = await this.prisma.customer.create({
                data: customerData,
            });

            return customer;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error creating customer");
        }
    }

    async updateCustomer(id: number, customerData: UpdateCustomerInput): Promise<Customer> {
        try {
            // Check if customer exists
            const existingCustomer = await this.prisma.customer.findUnique({
                where: { id },
            });

            if (!existingCustomer) {
                throw new ApiError(404, "Customer not found");
            }

            // Check if email already exists (if being updated)
            if (customerData.email && customerData.email !== existingCustomer.email) {
                const existingCustomerByEmail = await this.prisma.customer.findFirst({
                    where: {
                        email: {
                            equals: customerData.email,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                        id: {
                            not: id,
                        },
                    },
                });

                if (existingCustomerByEmail) {
                    throw new ApiError(400, `Customer with email '${customerData.email}' already exists`);
                }
            }

            // Check if phone already exists (if being updated)
            if (customerData.phone && customerData.phone !== existingCustomer.phone) {
                const existingCustomerByPhone = await this.prisma.customer.findFirst({
                    where: {
                        phone: {
                            equals: customerData.phone,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                        id: {
                            not: id,
                        },
                    },
                });

                if (existingCustomerByPhone) {
                    throw new ApiError(400, `Customer with phone '${customerData.phone}' already exists`);
                }
            }

            // Update customer
            const updatedCustomer = await this.prisma.customer.update({
                where: { id },
                data: {
                    name: customerData.name,
                    email: customerData.email,
                    phone: customerData.phone,
                    address: customerData.address,
                    notes: customerData.notes,
                },
            });

            return updatedCustomer;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating customer");
        }
    }

    async deleteCustomer(id: number): Promise<Customer> {
        try {
            // Check if customer exists
            const existingCustomer = await this.prisma.customer.findUnique({
                where: { id },
            });

            if (!existingCustomer) {
                throw new ApiError(404, "Customer not found");
            }

            // Check if customer has orders
            const orderCount = await this.prisma.order.count({
                where: {
                    customerId: id,
                },
            });

            if (orderCount > 0) {
                throw new ApiError(400, "Cannot delete customer with associated orders");
            }

            // Delete customer
            const deletedCustomer = await this.prisma.customer.delete({
                where: { id },
            });

            return deletedCustomer;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting customer");
        }
    }

    async getCustomerById(id: number): Promise<Customer> {
        try {
            const customer = await this.prisma.customer.findUnique({
                where: { id },
            });

            if (!customer) {
                throw new ApiError(404, "Customer not found");
            }

            return customer;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving customer");
        }
    }

    async getAllCustomers(params?: PaginationParams & SearchFilter): Promise<{
        data: Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc", filters = {} } = params || {};

            // Build the where clause
            const where: Prisma.CustomerWhereInput = {};

            // Add name filter if provided
            if (filters.name && typeof filters.name === "string") {
                where.name = {
                    contains: filters.name,
                    mode: "insensitive",
                } as Prisma.StringFilter<"Customer">;
            }

            // Add email filter if provided
            if (filters.email && typeof filters.email === "string") {
                where.email = {
                    contains: filters.email,
                    mode: "insensitive",
                } as Prisma.StringNullableFilter<"Customer">;
            }

            // Add phone filter if provided
            if (filters.phone && typeof filters.phone === "string") {
                where.phone = {
                    contains: filters.phone,
                    mode: "insensitive",
                } as Prisma.StringNullableFilter<"Customer">;
            }

            // Count total customers
            const total = await this.prisma.customer.count({ where });

            // Get paginated customers
            const customers = await this.prisma.customer.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: customers,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch {
            throw new ApiError(500, "Error retrieving customers");
        }
    }

    async searchCustomers(
        searchTerm: string,
        params?: PaginationParams,
    ): Promise<{
        data: Customer[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc" } = params || {};

            // Build the where clause for search
            const where: Prisma.CustomerWhereInput = {
                OR: [
                    {
                        name: {
                            contains: searchTerm,
                            mode: "insensitive",
                        } as Prisma.StringFilter<"Customer">,
                    },
                    {
                        email: {
                            contains: searchTerm,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                    },
                    {
                        phone: {
                            contains: searchTerm,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                    },
                    {
                        address: {
                            contains: searchTerm,
                            mode: "insensitive",
                        } as Prisma.StringNullableFilter<"Customer">,
                    },
                ],
            };

            // Count total matching customers
            const total = await this.prisma.customer.count({ where });

            // Get paginated matching customers
            const customers = await this.prisma.customer.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: customers,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch {
            throw new ApiError(500, "Error searching customers");
        }
    }

    async getCustomerOrderStats(id: number): Promise<{
        totalOrders: number;
        totalSpent: number;
        lastOrderDate: Date | null;
        lastOrderAmount: number | null;
    }> {
        try {
            // Check if customer exists
            const existingCustomer = await this.prisma.customer.findUnique({
                where: { id },
            });

            if (!existingCustomer) {
                throw new ApiError(404, "Customer not found");
            }

            // Get all orders for the customer
            const orders = await this.prisma.order.findMany({
                where: {
                    customerId: id,
                },
                orderBy: {
                    orderDate: "desc",
                },
            });

            // Calculate stats
            const totalOrders = orders.length;
            const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
            const lastOrderDate = orders.length > 0 ? orders[0].orderDate : null;
            const lastOrderAmount = orders.length > 0 ? orders[0].total : null;

            return {
                totalOrders,
                totalSpent,
                lastOrderDate,
                lastOrderAmount,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving customer order statistics");
        }
    }
}
