import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/database";
import { isAuthorized, UNAUTHORIZED } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

// PATCH /api/leaves/[id] → admin status update (hide / remove / restore).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(req.headers, req.nextUrl.searchParams)) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }

  const { id } = await params;
  let body: { status?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  const allowed = ["pending", "approved", "visible", "hidden", "removed"];
  const status = body.status;
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "invalid-status" }, { status: 400 });
  }

  const repo = getRepo();
  const ok = await repo.updateLeafStatus(id, status as never);
  if (!ok) {
    return NextResponse.json({ error: "leaf-not-found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id, status });
}
