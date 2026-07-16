import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, relative, resolve, sep } from "node:path";
import { eq } from "drizzle-orm";
import { assetsDirectory } from "@/config/paths";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { isSafeArchivePath, safeFileName } from "@/lib/filename";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

const imageExtensions: Record<AllowedImageMime, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export interface DocumentAsset {
  name: string;
  url: string;
  size: number;
  mimeType: AllowedImageMime;
  updatedAt: string;
}

function assertSafeDocumentId(documentId: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(documentId))
    throw new Error("文档 ID 无效");
}

export function detectImageMime(buffer: Buffer): AllowedImageMime | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  )
    return "image/jpeg";
  if (
    buffer.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii"))
  )
    return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  return null;
}

export function validateImage(buffer: Buffer, declaredMime?: string) {
  if (!buffer.length) throw new Error("图片文件为空");
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("图片超过 8MB 限制");
  const mimeType = detectImageMime(buffer);
  if (!mimeType) throw new Error("仅支持 PNG、JPEG、GIF 和 WebP 图片");
  if (declaredMime && declaredMime !== mimeType)
    throw new Error("图片扩展类型与文件内容不一致");
  return { mimeType, extension: imageExtensions[mimeType] };
}

export function resolveDocumentAssetPath(
  documentId: string,
  assetPath: string,
): string {
  assertSafeDocumentId(documentId);
  if (!isSafeArchivePath(assetPath)) throw new Error("图片路径无效");
  const root = resolve(assetsDirectory, documentId);
  const target = resolve(root, assetPath);
  if (!target.startsWith(`${root}${sep}`)) throw new Error("图片路径无效");
  return target;
}

function assetUrl(documentId: string, name: string) {
  return `/api/assets/${encodeURIComponent(documentId)}/${name
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function storeDocumentImage(input: {
  documentId: string;
  originalName: string;
  declaredMime?: string;
  buffer: Buffer;
}): DocumentAsset {
  assertSafeDocumentId(input.documentId);
  const document = db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, input.documentId))
    .get();
  if (!document) throw new Error("文档不存在");
  const { mimeType, extension } = validateImage(
    input.buffer,
    input.declaredMime,
  );
  const base = safeFileName(
    basename(input.originalName, extname(input.originalName)),
    "image",
  );
  const name = `${base}-${randomUUID().slice(0, 8)}${extension}`;
  const target = resolveDocumentAssetPath(input.documentId, name);
  mkdirSync(resolve(assetsDirectory, input.documentId), { recursive: true });
  writeFileSync(target, input.buffer, { flag: "wx", mode: 0o640 });
  const stats = statSync(target);
  return {
    name,
    url: assetUrl(input.documentId, name),
    size: stats.size,
    mimeType,
    updatedAt: stats.mtime.toISOString(),
  };
}

export function readDocumentAsset(documentId: string, assetPath: string) {
  const target = resolveDocumentAssetPath(documentId, assetPath);
  const buffer = readFileSync(target);
  const { mimeType } = validateImage(buffer);
  return { buffer, mimeType };
}

export function listDocumentAssets(documentId: string): DocumentAsset[] {
  assertSafeDocumentId(documentId);
  const root = resolve(assetsDirectory, documentId);
  const assets: DocumentAsset[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const name = relative(root, absolute).split(sep).join("/");
        try {
          const buffer = readFileSync(absolute);
          const { mimeType } = validateImage(buffer);
          const stats = statSync(absolute);
          assets.push({
            name,
            url: assetUrl(documentId, name),
            size: stats.size,
            mimeType,
            updatedAt: stats.mtime.toISOString(),
          });
        } catch {
          // Ignore unrelated or corrupt files in the managed assets directory.
        }
      }
    }
  };
  try {
    visit(root);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return assets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deleteDocumentAsset(
  documentId: string,
  assetPath: string,
): boolean {
  const target = resolveDocumentAssetPath(documentId, assetPath);
  try {
    rmSync(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function removeDocumentAssets(documentId: string): void {
  assertSafeDocumentId(documentId);
  rmSync(resolve(assetsDirectory, documentId), {
    recursive: true,
    force: true,
  });
}

export function stageDocumentAssetsForDeletion(documentId: string): {
  commit: () => void;
  rollback: () => void;
} {
  assertSafeDocumentId(documentId);
  const root = resolve(assetsDirectory, documentId);
  if (!existsSync(root)) return { commit: () => {}, rollback: () => {} };
  mkdirSync(assetsDirectory, { recursive: true });
  const trash = resolve(
    assetsDirectory,
    `.delete-${documentId}-${randomUUID().slice(0, 8)}`,
  );
  renameSync(root, trash);
  return {
    commit: () => rmSync(trash, { recursive: true, force: true }),
    rollback: () => {
      if (existsSync(trash) && !existsSync(root)) renameSync(trash, root);
    },
  };
}
