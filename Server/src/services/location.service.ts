import { PrismaClient, Location, Inventory, Prisma } from "@prisma/client";
import prisma from "@/config/prisma";
import { ApiError } from "@/utils/apiError";
import { CreateLocationInput, UpdateLocationInput } from "@/validators/location.validator";
import { PaginationParams, SearchFilter, ILocationService } from "./interfaces";
import { BaseServiceImpl } from "./base.service";

// Define enum for location types
enum LocationType {
    WAREHOUSE = "WAREHOUSE",
    STORE = "STORE",
    OFFICE = "OFFICE",
}

export class LocationService extends BaseServiceImpl<Location, Prisma.LocationCreateInput, Prisma.LocationUpdateInput> implements ILocationService {
    constructor(prisma: PrismaClient) {
        super(prisma, "location");
    }

    async findByName(name: string): Promise<Location | null> {
        try {
            const location = await this.prisma.location.findFirst({
                where: {
                    name: {
                        equals: name,
                        mode: "insensitive",
                    } as Prisma.StringFilter<"Location">,
                    deletedAt: null,
                },
            });

            return location;
        } catch (error) {
            this.handleError(error, `Error finding location with name ${name}`);
            throw error;
        }
    }

    async findByType(type: string): Promise<Location[]> {
        try {
            const locations = await this.prisma.location.findMany({
                where: {
                    type: type as LocationType,
                    deletedAt: null,
                },
                orderBy: {
                    name: "asc",
                },
            });

            return locations;
        } catch (error) {
            this.handleError(error, `Error finding locations with type ${type}`);
            throw error;
        }
    }

    async getLocationWithInventory(locationId: number): Promise<Location & { inventoryItems: Inventory[] }> {
        try {
            const location = await this.prisma.location.findUnique({
                where: {
                    id: locationId,
                    deletedAt: null,
                },
                include: {
                    inventoryItems: {
                        include: {
                            product: true,
                        },
                    },
                },
            });

            if (!location) {
                throw new Error("Location not found");
            }

            return location;
        } catch (error) {
            this.handleError(error, `Error retrieving location with inventory: ${locationId}`);
            throw error;
        }
    }

    // Additional methods specific to this service implementation
    async createLocation(locationData: CreateLocationInput): Promise<Location> {
        try {
            // Check if location with same name already exists
            const existingLocation = await this.prisma.location.findFirst({
                where: {
                    name: {
                        equals: locationData.name,
                        mode: "insensitive",
                    } as Prisma.StringFilter<"Location">,
                    deletedAt: null,
                },
            });

            if (existingLocation) {
                throw new ApiError(400, `Location with name '${locationData.name}' already exists`);
            }

            // Create new location
            const location = await this.prisma.location.create({
                data: locationData,
            });

            return location;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error creating location");
        }
    }

    async updateLocation(id: number, locationData: UpdateLocationInput): Promise<Location> {
        try {
            // Check if location exists
            const existingLocation = await this.prisma.location.findUnique({
                where: { id },
            });

            if (!existingLocation) {
                throw new ApiError(404, "Location not found");
            }

            // Check if new name conflicts with existing locations
            if (locationData.name) {
                const nameConflict = await this.prisma.location.findFirst({
                    where: {
                        name: {
                            equals: locationData.name,
                            mode: "insensitive",
                        } as Prisma.StringFilter<"Location">,
                        id: {
                            not: id,
                        },
                        deletedAt: null,
                    },
                });

                if (nameConflict) {
                    throw new ApiError(400, `Location with name '${locationData.name}' already exists`);
                }
            }

            // Update location
            const updatedLocation = await this.prisma.location.update({
                where: { id },
                data: { ...locationData, id: undefined },
            });

            return updatedLocation;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error updating location");
        }
    }

    async deleteLocation(id: number, hardDelete = false): Promise<Location> {
        try {
            // Check if location exists
            const existingLocation = await this.prisma.location.findUnique({
                where: { id },
            });

            if (!existingLocation) {
                throw new ApiError(404, "Location not found");
            }

            // Check if location has associated inventory
            const inventoryCount = await this.prisma.inventory.count({
                where: {
                    locationId: id,
                },
            });

            if (inventoryCount > 0 && hardDelete) {
                throw new ApiError(400, "Cannot delete location with associated inventory records");
            }

            let deletedLocation: Location;

            if (hardDelete) {
                // Hard delete
                deletedLocation = await this.prisma.location.delete({
                    where: { id },
                });
            } else {
                // Soft delete
                deletedLocation = await this.prisma.location.update({
                    where: { id },
                    data: {
                        deletedAt: new Date(),
                    },
                });
            }

            return deletedLocation;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error deleting location");
        }
    }

    async getLocationById(id: number): Promise<Location> {
        try {
            const location = await this.prisma.location.findUnique({
                where: { id },
            });

            if (!location) {
                throw new ApiError(404, "Location not found");
            }

            return location;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving location");
        }
    }

    async getAllLocations(params?: PaginationParams & SearchFilter): Promise<{
        data: Location[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        try {
            const { page = 1, limit = 10, sortBy = "name", sortOrder = "asc", filters = {}, searchTerm = "" } = params || {};

            // Build the where clause
            const where: Prisma.LocationWhereInput = {
                deletedAt: null,
            };

            // Add type filter if provided
            if (filters.type) {
                where.type = filters.type;
            }

            // Add name search if provided
            if (searchTerm) {
                where.OR = [{ name: { contains: searchTerm } }, { address: { contains: searchTerm } }];
            }

            // Count total locations for pagination
            const total = await prisma.location.count({ where });

            // Get paginated locations
            const locations = await prisma.location.findMany({
                where,
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            });

            return {
                data: locations,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch {
            throw new ApiError(500, "Error retrieving locations");
        }
    }

    async getLocationWithInventoryCount(id: number) {
        try {
            const location = await prisma.location.findUnique({
                where: { id },
            });

            if (!location) {
                throw new ApiError(404, "Location not found");
            }

            const inventoryItems = await prisma.inventory.findMany({
                where: { locationId: id },
                include: {
                    product: true,
                },
            });

            const totalItems = inventoryItems.length;
            const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
            const totalReserved = inventoryItems.reduce((sum, item) => sum + item.reservedQuantity, 0);

            return {
                location,
                inventoryStats: {
                    totalItems,
                    totalQuantity,
                    totalReserved,
                    available: totalQuantity - totalReserved,
                },
                inventoryItems,
            };
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Error retrieving location with inventory");
        }
    }
}
