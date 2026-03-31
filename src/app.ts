import { config } from "dotenv";
import type { Request, Response } from "express";

import server, { app } from "./config/server";
import { connectRedis } from "./config/redis";
import { initI18n } from "./config/i18n";
import i18nextMiddleware from "i18next-http-middleware";

config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  const i18nInstance = await initI18n();

  app.use(i18nextMiddleware.handle(i18nInstance)); // ✅ attach BEFORE routes

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, async () => {
    await connectRedis();
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
