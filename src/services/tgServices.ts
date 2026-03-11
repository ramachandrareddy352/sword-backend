import crypto from "crypto";
import axios from "axios";

export function verifyTelegramData(initData: string, botToken: string) {
  try {
    const urlParams = new URLSearchParams(initData);

    const hash = urlParams.get("hash");
    urlParams.delete("hash");

    const dataCheckString = [...urlParams.entries()]
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto.createHash("sha256").update(botToken).digest();

    const hmac = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return hmac === hash;
  } catch (err) {
    console.log("Verification error: ", err);
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
