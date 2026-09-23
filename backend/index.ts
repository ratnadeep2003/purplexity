import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config";
import { errorHandler, ApiError } from "./http";
import { askRouter } from "./routes/ask";
import { conversationsRouter } from "./routes/conversations";

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new ApiError(403, "CORS_DENIED", "Origin is not allowed."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1_000,
    limit: 150,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1", conversationsRouter);
app.use("/api/v1", askRouter);

app.use((_req, _res, next) => {
  next(new ApiError(404, "NOT_FOUND", "Route not found."));
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Purplexity API listening on port ${env.PORT}`);
});