import crypto from "crypto";

export function createOrderToken() {
  return crypto.randomBytes(16).toString("base64url").toUpperCase();
}
