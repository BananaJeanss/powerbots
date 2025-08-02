import express from "express";
import helmet from "helmet";
import { config } from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config();

const SITE_ENABLED = process.env.SITE_ENABLED === "true";
const PORT = process.env.PORT || 3000;

const app = express();

// middleware + helmet
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = dirname(fileURLToPath(import.meta.url));

if (SITE_ENABLED) {
  // serve anything in public/
  app.use(express.static(join(__dirname, "public")));

  // main route
  app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "public", "index.html"));
  });

  // health route
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });
}

// start the server
export function startExpressSite() {
  if (SITE_ENABLED) {
    app.listen(PORT, () => {
      console.log(`🌐 Express site is running on http://localhost:${PORT}`);
    });
  }
}
