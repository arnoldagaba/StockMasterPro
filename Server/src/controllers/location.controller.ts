import { Request, Response } from "express";
import { locationService } from "../services/location.service";
import { CreateLocationInput, UpdateLocationInput } from "../validators/location.validator";

export const createLocation = async (req: Request, res: Response) => {
    try {
        const locationData: CreateLocationInput = req.body;
        const location = await locationService.createLocation(locationData);

        return res.status(201).json({
            status: "success",
            message: "Location created successfully",
            data: location,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error creating location",
        });
    }
};

export const updateLocation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const locationData: UpdateLocationInput = req.body;
        const location = await locationService.updateLocation(id, locationData);

        return res.status(200).json({
            status: "success",
            message: "Location updated successfully",
            data: location,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error updating location",
        });
    }
};

export const deleteLocation = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const hardDelete = req.query.hardDelete === "true";
        const location = await locationService.deleteLocation(id, hardDelete);

        return res.status(200).json({
            status: "success",
            message: "Location deleted successfully",
            data: location,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error deleting location",
        });
    }
};

export const getLocationById = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const location = await locationService.getLocationById(id);

        return res.status(200).json({
            status: "success",
            data: location,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving location",
        });
    }
};

export const getAllLocations = async (req: Request, res: Response) => {
    try {
        const { page, limit, sortBy, sortOrder, name, type } = req.query;

        const filters: any = {};

        if (name) {
            filters.name = name as string;
        }

        if (type) {
            filters.type = type as string;
        }

        const locations = await locationService.getAllLocations({
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
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving locations",
        });
    }
};

export const getLocationsByType = async (req: Request, res: Response) => {
    try {
        const type = req.params.type;
        const locations = await locationService.findByType(type);

        return res.status(200).json({
            status: "success",
            data: locations,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving locations by type",
        });
    }
};

export const getLocationWithInventory = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const location = await locationService.getLocationWithInventory(id);

        return res.status(200).json({
            status: "success",
            data: location,
        });
    } catch (error: any) {
        return res.status(error.statusCode || 500).json({
            status: "error",
            message: error.message || "Error retrieving location with inventory",
        });
    }
};
