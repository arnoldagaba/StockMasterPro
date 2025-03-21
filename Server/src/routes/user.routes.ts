import { Router, RequestHandler } from "express";
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
router.post("/login", authLimiter, validateRequest(loginSchema), login as RequestHandler);
router.post("/refresh-token", basicLimiter, validateRequest(refreshTokenSchema), refreshToken as RequestHandler);

// Protected routes
router.get("/profile", authenticate, getUserProfile as RequestHandler);
router.post("/", authenticate, authorize(["admin"]), validateRequest(createUserSchema), createUser as RequestHandler);
router.get("/", authenticate, authorize(["admin"]), getAllUsers as RequestHandler);
router.get("/:id", authenticate, validateRequest(userIdParamSchema), getUserById as unknown as RequestHandler);
router.put("/:id", authenticate, validateRequest(updateUserSchema), updateUser as unknown as RequestHandler);
router.delete("/:id", authenticate, authorize(["admin"]), validateRequest(userIdParamSchema), deleteUser as unknown as RequestHandler);
router.post("/:id/change-password", authenticate, validateRequest(changePasswordSchema), changePassword as unknown as RequestHandler);

export default router;
