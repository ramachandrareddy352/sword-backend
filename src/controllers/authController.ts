import express from "express";
import type { Request, Response } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prismaClient from "../database/client.ts";
import redis from "../config/redis.ts";
import { TWITTER_CONFIG } from "../config/twitter.ts";

export async function twitterCallback(req: Request, res: Response) {
    const { code, redirectUri } = req.body;

    // 1. Exchange code → access token
    const tokenRes = await axios.post(
        TWITTER_CONFIG.tokenUrl,
        new URLSearchParams({
            grant_type: "authorization_code",
            client_id: TWITTER_CONFIG.clientId,
            redirect_uri: redirectUri,
            code,
            code_verifier: "challenge", // Expo handles PKCE internally
        }),
        {
            auth: {
                username: TWITTER_CONFIG.clientId,
                password: TWITTER_CONFIG.clientSecret,
            },
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
    );

    const accessToken = tokenRes.data.access_token;

    // 2. Fetch Twitter user
    const userRes = await axios.get(TWITTER_CONFIG.userUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const twitterUser = userRes.data.data;

    // 3. Create or find user
    let user = await prismaClient.user.findUnique({
        where: { xUserId: BigInt(twitterUser.id) },
    });

    if (!user) {
        user = await prismaClient.user.create({
            data: {
                xUserId: BigInt(twitterUser.id),
                gold: BigInt(0),
            },
        });

        // Give default sword here if needed
    }

    // 4. Create JWT
    const jti = uuidv4();
    const token = jwt.sign(
        {
            userId: user.id.toString(),
            xUserId: twitterUser.id,
            jti,
        },
        process.env.JWT_SECRET!,
        { expiresIn: "30m" }
    );

    // 5. Cache session in Redis (30 min)
    await redis.set(`session:${jti}`, user.id.toString(), {
        EX: 60 * 30,
    });

    res.json({
        token,
        user: {
            xUserId: twitterUser.id,
            avatar: twitterUser.profile_image_url,
        },
    });
}

export async function logout(req: Request, res: Response) {
    const auth = req.headers.authorization;
    if (!auth) return res.json({ success: true });

    const token = auth.split(" ")[1];
    const payload: any = jwt.decode(token);

    if (payload?.jti) {
        await redis.del(`session:${payload.jti}`);
    }

    res.json({ success: true });
}
