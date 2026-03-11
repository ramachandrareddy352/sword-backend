import crypto from "crypto";
import axios from "axios";

export function verifyTelegramData(initData: string, botToken: string) {
  try {
    const urlParams = new URLSearchParams(initData);

    const hash = urlParams.get("hash");
    if (!hash) return false;

    // Remove fields not used in verification
    urlParams.delete("hash");
    urlParams.delete("signature");

    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto.createHash("sha256").update(botToken).digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return calculatedHash === hash;
  } catch (err) {
    console.log("Verification error:", err);
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
