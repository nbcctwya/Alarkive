import { readDocumentAsset } from "@/services/assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string; assetPath: string[] }> },
) {
  const { documentId, assetPath } = await params;
  try {
    const asset = readDocumentAsset(documentId, assetPath.join("/"));
    return new Response(asset.buffer, {
      headers: {
        "content-type": asset.mimeType,
        "cache-control": "private, max-age=31536000, immutable",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return Response.json(
      { error: code === "ENOENT" ? "图片不存在" : "无法读取图片" },
      { status: code === "ENOENT" ? 404 : 400 },
    );
  }
}

export const dynamic = "force-dynamic";
