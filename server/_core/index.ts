import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { clerkMiddleware } from "@clerk/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { nightlyPriceUpdateHandler } from "../priceUpdateHandler";
import { stripeWebhookHandler } from "../stripeWebhookHandler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function getAllowedOrigins() {
  return new Set([
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    "https://cardvaulttcg-3jzqkoyh.manus.space",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter((origin): origin is string => Boolean(origin)));
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const isProduction = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        // TODO: replace *.clerk.accounts.dev with your Clerk production
        // Frontend API domain once you add a custom domain in the Clerk
        // dashboard (Settings -> Domains) — the *.accounts.dev host is
        // dev/staging only.
        scriptSrc: ["'self'", "https://js.stripe.com", "https://*.clerk.accounts.dev"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://api.coingecko.com",
          "https://s.altnet.rippletest.net",
          "wss://s.altnet.rippletest.net",
          "https://*.clerk.accounts.dev",
          "https://clerk-telemetry.com",
        ],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      },
    } : false,
    hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  const allowedOrigins = getAllowedOrigins();
  app.use(cors({
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      const isLocalDevelopment = !isProduction && Boolean(origin?.match(/^http:\/\/(localhost|127\.0\.0\.1):\d+$/));
      if (!origin || allowedOrigins.has(origin) || isLocalDevelopment) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }));

  if (isProduction) {
    app.use((req, res, next) => {
      if (req.secure || req.path === "/healthz") return next();
      const host = req.get("host");
      if (!host) return res.status(400).json({ error: "Host header required" });
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    });
  }

  // Stripe must receive the untouched request body for signature verification.
  // This route intentionally precedes express.json().
  app.post("/api/stripe/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    (req, _res, next) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
      next();
    },
    stripeWebhookHandler,
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: false }));
  // Populates req.auth on every request from the Clerk session cookie /
  // Bearer token. Reads CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY from env.
  app.use(clerkMiddleware());
  registerStorageProxy(app);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again later." },
  });
  app.use("/api/trpc", apiLimiter);

  // Scheduled handler checks a shared secret header (see requireCronSecret
  // in priceUpdateHandler.ts) instead of a user session — cron callers
  // aren't a logged-in Clerk user.
  app.post("/api/scheduled/price-update", nightlyPriceUpdateHandler);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  console.error("[Server] Startup failed", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
});
