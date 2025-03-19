import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

const app: Express = express();
const PORT = process.env.PORT ?? 5000;

//
app.use(helmet());
app.use(cors());

// API Endpoints
app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        message: "IMS API is running",
    });
});

// Start the Server
app.listen(PORT, () => console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`));
