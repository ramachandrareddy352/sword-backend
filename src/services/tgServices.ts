import axios from "axios";
import crypto from "crypto";

export function verifyTelegramData(
  initData: string,
  botToken: string,
): boolean {
  try {
    if (!botToken) {
      console.error("Bot token is empty or undefined");
      return false;
    }

    // Parse initData as URLSearchParams
    const params = new URLSearchParams(initData);

    // Extract received hash
    const receivedHash = params.get("hash");
    if (!receivedHash) {
      console.error("No hash found in initData");
      return false;
    }

    // Remove hash from params and sort the remaining key-value pairs
    params.delete("hash");
    const dataArray: string[] = [];
    for (const [key, value] of params) {
      dataArray.push(`${key}=${decodeURIComponent(value)}`);
    }
    dataArray.sort(); // Sorts lexicographically by key=value string
    const dataCheckString = dataArray.join("\n");

    // Generate secret key: HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculate hash: HMAC-SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString, "utf8")
      .digest("hex");

    // Verify
    const isValid = calculatedHash === receivedHash;

    if (!isValid) {
      console.error("Hash mismatch");
    }

    return isValid;
  } catch (err) {
    console.error("Verification failed:", err);
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
