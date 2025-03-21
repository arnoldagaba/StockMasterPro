import { Request, Response } from "express";
import { locationServiceInstance } from "@/services";
import { CreateLocationInput, UpdateLocationInput } from "@/validators/location.validator";
import { ApiError } from "@/utils/apiError";

// Location filters interface
interface LocationFilters {
    name?: string;
    type?: string;
    [key: string]: unknown;
}

export const createLocation = async (req: Request, res: Response) => {
    try {
        const locationData: CreateLocationInput = req.body;
        const location = await locationServiceInstance.createLocation(locationData);

        return res.status(201).json({
            status: "success",
            message: "Location created successfully",
            data: location,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error creating location";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const updateLocation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const locationData: UpdateLocationInput = req.body;
        const location = await locationServiceInstance.updateLocation(id, locationData);

        return res.status(200).json({
            status: "success",
            message: "Location updated successfully",
            data: location,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error updating location";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const deleteLocation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const hardDelete = req.query.hardDelete === "true";
        const location = await locationServiceInstance.deleteLocation(id, hardDelete);

        return res.status(200).json({
            status: "success",
            message: "Location deleted successfully",
            data: location,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error deleting location";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getLocationById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const location = await locationServiceInstance.getLocationById(id);

        return res.status(200).json({
            status: "success",
            data: location,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving location";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getAllLocations = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, name, type } = req.query;

        const filters: LocationFilters = {};

        if (name) {
            filters.name = name as string;
        }

        if (type) {
            filters.type = type as string;
        }

        const locations = await locationServiceInstance.getAllLocations({
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
            sortBy: sortBy as string | undefined,
            sortOrder: (sortOrder as "asc" | "desc") || "asc",
            filters,
        });

        return res.status(200).json({
            status: "success",
            ...locations,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving locations";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getLocationsByType = async (req: Request, res: Response) => {
    try {
        const type = req.params.type;
        const locations = await locationServiceInstance.findByType(type);

        return res.status(200).json({
            status: "success",
            data: locations,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving locations by type";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};

export const getLocationWithInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const location = await locationServiceInstance.getLocationWithInventory(id);

        return res.status(200).json({
            status: "success",
            data: location,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error retrieving location with inventory";
        const statusCode = (error as ApiError)?.statusCode || 500;

        return res.status(statusCode).json({
            status: "error",
            message: errorMessage,
        });
    }
};
