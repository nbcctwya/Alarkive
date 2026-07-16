import { getChapterById } from "@/repositories/chapters";
import { safeFileName } from "@/lib/filename";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string; chapterId: string }> },
) {
  const { documentId, chapterId } = await params;
  const chapter = getChapterById(chapterId);
  if (!chapter || chapter.documentId !== documentId) {
    return Response.json({ error: "章节不存在" }, { status: 404 });
  }
  const fileName = `${safeFileName(chapter.title, "chapter")}.md`;
  return new Response(chapter.content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "cache-control": "no-store",
    },
  });
}

export const dynamic = "force-dynamic";
