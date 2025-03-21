import express from "express";
import {
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationById,
    getAllLocations,
    getLocationsByType,
    getLocationWithInventory,
} from "../controllers/location.controller";
import { validate } from "../middleware/validate";
import {
    createLocationSchema,
    updateLocationSchema,
    getLocationSchema,
    getLocationByTypeSchema,
    queryLocationsSchema,
} from "../validators/location.validator";
import { auth } from "../middleware/auth";
import { checkPermission } from "../middleware/checkPermission";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// Create location
router.post("/", checkPermission("location:create"), validate(createLocationSchema), createLocation);

// Update location
router.put("/:id", checkPermission("location:update"), validate(updateLocationSchema), updateLocation);

// Delete location
router.delete("/:id", checkPermission("location:delete"), validate(getLocationSchema), deleteLocation);

// Get location by ID
router.get("/:id", checkPermission("location:read"), validate(getLocationSchema), getLocationById);

// Get all locations (with filtering and pagination)
router.get("/", checkPermission("location:read"), validate(queryLocationsSchema), getAllLocations);

// Get locations by type
router.get("/type/:type", checkPermission("location:read"), validate(getLocationByTypeSchema), getLocationsByType);

// Get location with inventory
router.get("/:id/inventory", checkPermission("location:read"), validate(getLocationSchema), getLocationWithInventory);

export default router;
