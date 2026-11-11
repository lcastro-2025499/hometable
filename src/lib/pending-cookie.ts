import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { requireSecret } from "./env";
import { isHttpsRequest } from "./http";

/**
 * Vincula el código OTP al navegador que inició el registro. La cookie es
 * httpOnly, firmada con HMAC y contiene solo el id del registro pendiente.
 */

const COOKIE_NAME = "hometable_pending";
const MAX_AGE_SECONDS = 24 * 60 * 60;

function signature(id: string): string {
  return createHmac("sha256", requireSecret("BETTER_AUTH_SECRET", 32))
    .update(`pending:${id}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function readPendingId(request: NextRequest | Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  const raw = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const id = raw.slice(0, separator);
  const provided = raw.slice(separator + 1);

  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (!safeEqual(signature(id), provided)) return null;

  return id;
}

export function setPendingCookie(
  response: NextResponse,
  request: Request,
  id: string,
): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: `${id}.${signature(id)}`,
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearPendingCookie(
  response: NextResponse,
  request: Request,
): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 0,
  });
}
