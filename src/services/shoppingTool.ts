import axios from "axios";
import crypto from "crypto";

const SECRET_KEY = process.env.VOUCHER_SECRET_KEY!;

export function encodePayload(payload: any) {
  const data = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");

  const encoded = Buffer.from(data).toString("base64");

  return `${encoded}.${signature}`;
}

export function decodePayload(token: string) {
  const [encoded, signature] = token.split(".");

  const data = Buffer.from(encoded, "base64").toString();

  const expected = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");

  if (signature !== expected) {
    throw new Error("Invalid signature");
  }

  return JSON.parse(data);
}

export async function sendShoppingAck(payload: any) {
  const encoded = encodePayload(payload);

  const resp = await axios.post(
    process.env.SHOPPING_ACK_URL!,
    { data: encoded },
    { timeout: 5000 },
  );

  if (!resp.data?.success) {
    throw new Error("Shopping acknowledge failed");
  }

  return resp.data;
}
