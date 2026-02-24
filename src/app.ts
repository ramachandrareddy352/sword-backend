import { config } from "dotenv";
import type { Request, Response } from "express";

import server from "./config/server";
import { connectRedis } from "./config/redis";

config();

const PORT = process.env.PORT || 5000;


server.listen(PORT, async () => {
  await connectRedis();
  console.log(`Server running on port ${PORT}`);
});
