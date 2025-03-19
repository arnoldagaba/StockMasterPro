import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

const app: Express = express();
const PORT = process.env.PORT ?? 5000;

// Middleware
app.use(helmet()); // Set security headers
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" })); // Parse JSON request body
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Parse URL-encoded request body

// API Routes
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "IMS API is running",
    });
});

// Start the Server
app.listen(PORT, () => console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`));
