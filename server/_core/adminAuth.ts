import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

export const ADMIN_SESSION_COOKIE = "olucha_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  return process.env.JWT_SECRET || "";
}

function digest(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function isAdminCredentialValid(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_LOGIN_EMAIL || "";
  const configuredPassword = process.env.ADMIN_LOGIN_PASSWORD || "";
  return Boolean(configuredEmail && configuredPassword && secret() && email.trim().toLowerCase() === configuredEmail.trim().toLowerCase() && password === configuredPassword);
}

export function createAdminSession(email: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = `${email.trim().toLowerCase()}.${expiresAt}`;
  return `${payload}.${digest(payload)}`;
}

export function verifyAdminSession(token: string | undefined) {
  if (!token || !secret()) return null;
  const signatureStart = token.lastIndexOf(".");
  const expiresStart = token.lastIndexOf(".", signatureStart - 1);
  if (signatureStart < 0 || expiresStart < 0) return null;
  const email = token.slice(0, expiresStart);
  const expiresAtText = token.slice(expiresStart + 1, signatureStart);
  const signature = token.slice(signatureStart + 1);
  const payload = `${email}.${expiresAtText}`;
  const expected = digest(payload);
  if (!signature || signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  if (Number(expiresAtText) < Math.floor(Date.now() / 1000)) return null;
  if (email !== (process.env.ADMIN_LOGIN_EMAIL || "").trim().toLowerCase()) return null;
  return { email, expiresAt: Number(expiresAtText) };
}

export function getAdminSessionFromRequest(req: Request) {
  const raw = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const encoded = raw?.slice(ADMIN_SESSION_COOKIE.length + 1);
  let token: string | undefined;
  try { token = encoded ? decodeURIComponent(encoded) : undefined; } catch { token = undefined; }
  return verifyAdminSession(token);
}

export const adminSessionMaxAgeMs = SESSION_MAX_AGE_SECONDS * 1000;
