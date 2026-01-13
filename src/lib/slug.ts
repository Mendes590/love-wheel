import crypto from "crypto";

export function generateSlug(length = 12) {
  return crypto
    .randomBytes(Math.ceil((length * 3) / 4))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, length);
}
