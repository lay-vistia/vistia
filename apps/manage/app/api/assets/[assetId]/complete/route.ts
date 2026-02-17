import { NextResponse } from "next/server";
import { requireUserId } from "../../../../../lib/auth";

const COMPLETE_ENDPOINT = process.env.COMPLETE_ENDPOINT;
const COMPLETE_API_KEY = process.env.COMPLETE_API_KEY;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.ext !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ext = body.ext.toLowerCase();
  if (!COMPLETE_ENDPOINT) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  try {
    const response = await fetch(COMPLETE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(COMPLETE_API_KEY ? { "x-api-key": COMPLETE_API_KEY } : {}),
      },
      body: JSON.stringify({ assetId, userId, ext }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn("[complete] failed", {
        status: response.status,
        body: data ?? null,
      });
      return NextResponse.json(
        { error: data?.error ?? "Upload verification failed" },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[complete] endpoint error", { message });
    return NextResponse.json({ error: "Upload verification failed" }, { status: 502 });
  }
}
