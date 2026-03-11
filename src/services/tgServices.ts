import crypto from "crypto";
import axios from "axios";

export function verifyTelegramData(
  initData: string,
  botToken: string,
): boolean {
  try {
    const urlParams = new URLSearchParams(initData);

    const receivedHash = urlParams.get("hash");
    if (!receivedHash) {
      console.log("Missing hash parameter");
      return false;
    }

    // Remove hash (and signature if it exists — though normally not present)
    urlParams.delete("hash");
    urlParams.delete("signature"); // just in case

    // Sort keys alphabetically and build data-check-string
    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    console.log("Data check string:\n" + dataCheckString); // ← very useful for debugging

    // 1. Secret key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // 2. Final hash = HMAC-SHA256(dataCheckString, secretKey)
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    console.log("Calculated hash:", calculatedHash);
    console.log("Received    hash:", receivedHash);

    return calculatedHash === receivedHash;
  } catch (err) {
    console.error("Verification error:", err);
    return false;
  }
}

export async function sendTelegramMessage(telegramId: string, message: string) {
  const token = process.env.TELEGRAM_OTP_BOT_TOKEN;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  await axios.post(url, {
    chat_id: telegramId,
    text: message,
    parse_mode: "Markdown",
  });
}
