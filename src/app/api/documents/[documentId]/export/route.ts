import { exportDocumentArchive } from "@/services/portability";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> },
) {
  try {
    const { documentId } = await params;
    const exported = await exportDocumentArchive(documentId);
    return new Response(new Uint8Array(exported.buffer), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(exported.fileName)}`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "导出失败" },
      { status: 404 },
    );
  }
}

export const dynamic = "force-dynamic";
