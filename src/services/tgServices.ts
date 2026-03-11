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

    const urlParams = new URLSearchParams(initData);

    const receivedHash = urlParams.get("hash");
    if (!receivedHash) {
      console.log("Missing 'hash' in initData");
      return false;
    }

    // Optional: check freshness (recommended!)
    const authDateStr = urlParams.get("auth_date");
    if (authDateStr) {
      const authDate = parseInt(authDateStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        // e.g. reject if older than 24 hours
        console.log(`initData too old: ${now - authDate} seconds`);
        return false;
      }
    }

    urlParams.delete("hash");
    urlParams.delete("signature"); // if present

    // Build data-check-string exactly as you already do (looks correct)
    const dataCheckString = [...urlParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    console.log("Data check string:\n" + dataCheckString);

    // CORRECT secret key creation
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    console.log("Calculated hash:", calculatedHash);
    console.log("Received    hash:", receivedHash);
    console.log("Bot token length:", botToken.length); // should be ~35-46

    return calculatedHash === receivedHash;
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
