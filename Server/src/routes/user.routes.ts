import { Router } from "express";
import {
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getAllUsers,
    login,
    refreshToken,
    changePassword,
    getUserProfile,
} from "@/controllers/user.controller";
import {
    createUserSchema,
    updateUserSchema,
    userIdParamSchema,
    loginSchema,
    changePasswordSchema,
    refreshTokenSchema,
} from "@/validators/user.validator";
import { validateRequest, authenticate, authorize, authLimiter, basicLimiter } from "@/middleware";

const router = Router();

// Public routes
router.post("/login", authLimiter, validateRequest(loginSchema), login);
router.post("/refresh-token", basicLimiter, validateRequest(refreshTokenSchema), refreshToken);

// Protected routes
router.get("/profile", authenticate, getUserProfile);
router.post("/", authenticate, authorize(["admin"]), validateRequest(createUserSchema), createUser);
router.get("/", authenticate, authorize(["admin"]), getAllUsers);
router.get("/:id", authenticate, validateRequest(userIdParamSchema), getUserById);
router.put("/:id", authenticate, validateRequest(updateUserSchema), updateUser);
router.delete("/:id", authenticate, authorize(["admin"]), validateRequest(userIdParamSchema), deleteUser);
router.post("/:id/change-password", authenticate, validateRequest(changePasswordSchema), changePassword);

export default router;
