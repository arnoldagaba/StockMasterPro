import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import { authenticate, authorize } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { createUserSchema, updateUserSchema, loginSchema, changePasswordSchema } from "@/validators/user.validator";

const router = Router();
const userController = new UserController();

// Public routes
router.post("/register", validate(createUserSchema), userController.register);
router.post("/login", validate(loginSchema), userController.login);
router.post("/refresh-token", userController.refreshToken);

// Protected routes
router.use(authenticate);
router.post("/logout", userController.logout);
router.get("/me", userController.getCurrentUser);
router.put("/me", validate(updateUserSchema), userController.updateUser);
router.post("/change-password", validate(changePasswordSchema), userController.changePassword);
router.get("/sessions", userController.getUserSessions);
router.delete("/sessions/:sessionId", userController.terminateSession);

// Admin only routes
router.get("/", authorize("ADMIN"), userController.getCurrentUser);
router.put("/:id", authorize("ADMIN"), validate(updateUserSchema), userController.updateUser);
router.delete("/:id", authorize("ADMIN"), userController.terminateSession);

export default router;
