import express, { Express, Request, Response, ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";
import userRoutes from "@/routes/user.routes"
import { notFoundHandler, basicLimiter } from "./middleware";
import { errorHandler } from "./middleware/error.middleware";

const app: Express = express();
const PORT = process.env.PORT ?? 5000;

// Middleware
app.use(helmet()); // Set security headers
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" })); // Parse JSON request body
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded request body

// Rate limiting
app.use(basicLimiter);

// Swagger Documentation route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// JSON endpoint to serve the OpenAPI spec directly
app.get("/api-docs.json", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
});

// API Routes
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "IMS API is running",
    });
});

app.use("/api/users", userRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler as ErrorRequestHandler);

// Start the Server
app.listen(PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
