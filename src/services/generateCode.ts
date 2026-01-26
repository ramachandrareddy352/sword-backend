import { randomBytes } from "crypto";

// Helper to generate 12-char voucher/sword code (alphanumeric + some symbols)
export function generateSecureCode(length: number = 12): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let code = "";

    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += chars[bytes[i] % chars.length];
    }

    return code;
}
