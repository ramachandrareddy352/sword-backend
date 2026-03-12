import express from "express";
import type { Request, Response } from "express";
import { createServer } from "http";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import prisma from "../database/client";
import { AdRewardType } from "@prisma/client";

import AdminActionRouters from "../routes/adminActionRoutes";
import AdminAuthRouters from "../routes/adminAuthRoutes";
import AdminGetterRouters from "../routes/adminGetterRoutes";

import PublicGetterRouters from "../routes/publicGetterRoutes";
import ExternalActionRouters from "../routes/externalActionRoutes";

import UserActionRouters from "../routes/userActionRoutes";
import UserAuthRouters from "../routes/userAuthRoutes";
import UserGetterRouters from "../routes/userGetterRoutes";
import rateLimit from "express-rate-limit";

export const app = express();

app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

const corsOptions = {
  origin: (_origin: any, callback: (arg0: null, arg1: boolean) => void) => {
    // Check if the origin is in the list of allowed origins
    /**
         * write all logic/conditions to allow the origins
        if (true) {
            callback(null, true);
        } else {
            console.log('Requested origin is blocked:', origin);
            callback(null, false); // Don't throw error, just don't allow
        }
         */
    callback(null, true);
  },
  //   origin: "http://localhost:3000",
  methods: "GET,PUT,POST,OPTIONS,DELETE,PATCH", // Specify allowed methods
  // credentials: true,
  allowedHeaders: "*",
};

app.use(cors(corsOptions));

// const limiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 60, // limit each IP to 60 requests per window
//   standardHeaders: true, // return rate limit info in headers
//   legacyHeaders: false,

//   message: {
//     success: false,
//     error: "Too many requests, please try again after 1 minute.",
//   },
// });

// app.set("trust proxy", 1); // Very Important (If Using Nginx / Cloudflare), Otherwise all users may appear as the same IP.
// app.use(limiter); // order is important, Add after CORS but before routes

app.get("/", (req: Request, res: Response) => {
  res.send("Sword Backend");
});

// Public keys cache
let publicKeys: Record<string, string> = {};
let lastKeyFetch = 0;

async function fetchPublicKeys() {
  // Cache for 24 hours
  if (Date.now() - lastKeyFetch < 24 * 60 * 60 * 1000) return;

  try {
    const res = await axios.get(
      "https://www.gstatic.com/admob/reward/verifier-keys.json",
    );

    publicKeys = {};

    for (const key of res.data.keys) {
      publicKeys[key.keyId] = key.pem;
    }

    lastKeyFetch = Date.now();
  } catch (err) {
    console.error("Failed to fetch AdMob public keys:", err);
  }
}

// AdMob SSV Callback (public, GET)
app.get("/api/admob/ssv-callback", async (req: Request, res: Response) => {
  try {
    if (!req.query.signature || !req.query.key_id) {
      return res.status(200).send("OK");
    }

    await fetchPublicKeys();

    const params = req.query as Record<string, string>;
    const keyId = params.key_id;
    const signature = params.signature;

    if (!publicKeys[keyId]) {
      return res.status(200).send("OK");
    }

    // 🔐 Reconstruct signed message
    const paramKeys = Object.keys(params)
      .filter((k) => k !== "signature" && k !== "key_id")
      .sort();

    const message = paramKeys
      .map((k) => `${k}=${encodeURIComponent(params[k])}`)
      .join("&");

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(message);

    const verified = verifier.verify(publicKeys[keyId], signature, "base64");

    if (!verified) {
      return res.status(200).send("OK"); // Never return 400 to Google
    }

    const nonce = params.custom_data;
    const userIdStr = params.user_id;

    if (!nonce || !userIdStr) {
      return res.status(200).send("OK");
    }

    const session = await prisma.adRewardSession.findUnique({
      where: { nonce },
    });

    if (!session || session.rewarded) {
      return res.status(200).send("OK");
    }

    if (session.userId.toString() !== userIdStr) {
      return res.status(200).send("OK");
    }

    // ✅ Mark rewarded
    await prisma.adRewardSession.update({
      where: { nonce },
      data: { rewarded: true },
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("SSV error:", err);
    return res.status(200).send("OK"); // Always 200 for Google
  }
});

app.get("/api/adsgram/reward", async (req: Request, res: Response) => {
  try {
    console.log(req.query);
    const telegramIdStr = req.query.userid as string;
    console.log(telegramIdStr);

    if (!telegramIdStr) {
      return res.status(200).send("OK");
    }

    const telegramId = BigInt(telegramIdStr);

    // Find user by telegram id
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(200).send("OK");
    }

    // Mark ALL pending sessions for this user as rewarded
    await prisma.adRewardSession.updateMany({
      where: {
        userId: user.id,
        rewarded: false,
      },
      data: {
        rewarded: true,
        rewardedAt: new Date(),
      },
    });

    return res.status(200).send("OK");
  } catch (err) {
    console.error("AdsGram SSV error:", err);
    return res.status(200).send("OK");
  }
});

app.use("/api/adminActions", AdminActionRouters);
app.use("/api/adminAuth", AdminAuthRouters);
app.use("/api/adminGetters", AdminGetterRouters);

app.use("/api/publicGetters", PublicGetterRouters);
app.use("/api/externalActions", ExternalActionRouters);

app.use("/api/userActions", UserActionRouters);
app.use("/api/userAuth", UserAuthRouters);
app.use("/api/userGetters", UserGetterRouters);

const server = createServer(app);
export default server;
