import { NextResponse } from "next/server";
import { upsertReadingProgress } from "@/repositories/reading-progress";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      documentId?: unknown;
      chapterId?: unknown;
      scrollPosition?: unknown;
    };
    if (
      typeof body.documentId !== "string" ||
      typeof body.chapterId !== "string" ||
      typeof body.scrollPosition !== "number" ||
      !Number.isFinite(body.scrollPosition)
    ) {
      return NextResponse.json({ error: "阅读进度参数无效" }, { status: 400 });
    }
    const state = upsertReadingProgress({
      documentId: body.documentId,
      chapterId: body.chapterId,
      scrollPosition: body.scrollPosition,
    });
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "阅读进度保存失败" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
