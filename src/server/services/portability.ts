import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import JSZip from "jszip";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { chapters, documents, documentTags } from "@/server/db/schema";
import { assetsDirectory } from "@/server/config/paths";
import { getDocumentById } from "@/server/repositories/documents";
import {
  listChapterRecords,
  listChaptersByDocument,
} from "@/server/repositories/chapters";
import type { ChapterNode } from "@/types/chapters";
import type { DocumentSummary } from "@/types/documents";
import type {
  ArchiveChapter,
  ArchiveMetadata,
  ImportInspection,
} from "@/types/portability";
import { isSafeArchivePath, safeFileName } from "@/lib/filename";
import { validateImage } from "@/server/services/assets";

const ARCHIVE_VERSION = 1;
export const MAX_MARKDOWN_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_ZIP_IMPORT_BYTES = 25 * 1024 * 1024;

function addAssetsToZip(zip: JSZip, documentId: string): string[] {
  const root = join(assetsDirectory, documentId);
  const paths: string[] = [];
  if (!existsSync(root)) {
    zip.file("assets/.keep", "");
    return paths;
  }
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const assetPath = relative(root, absolute).split(sep).join("/");
        if (!isSafeArchivePath(assetPath)) continue;
        zip.file(`assets/${assetPath}`, readFileSync(absolute));
        paths.push(assetPath);
      }
    }
  };
  visit(root);
  if (!paths.length) zip.file("assets/.keep", "");
  return paths;
}

export async function exportDocumentArchive(documentId: string): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const document = getDocumentById(documentId);
  if (!document) throw new Error("文档不存在");
  const records = new Map(
    listChapterRecords(documentId).map((record) => [record.id, record]),
  );
  const tree = listChaptersByDocument(documentId);
  const zip = new JSZip();
  const archiveChapters: ArchiveChapter[] = [];

  const addChapter = (node: ChapterNode, ancestors: string[]) => {
    const record = records.get(node.id);
    if (!record) throw new Error(`章节 ${node.id} 内容不存在`);
    const segment = `${String(node.orderIndex + 1).padStart(3, "0")}-${safeFileName(node.title)}`;
    const relativePath = [...ancestors, `${segment}.md`].join("/");
    const scratchpadPath = [...ancestors, `${segment}.scratchpad.md`].join("/");
    const contentPath = `chapters/${relativePath}`;
    const sourcePath = `scratchpads/${scratchpadPath}`;
    zip.file(contentPath, record.content);
    zip.file(sourcePath, record.scratchpad);
    archiveChapters.push({
      id: node.id,
      parentId: node.parentId,
      title: node.title,
      orderIndex: node.orderIndex,
      path: contentPath,
      scratchpadPath: sourcePath,
    });
    node.children.forEach((child) =>
      addChapter(child, [...ancestors, segment]),
    );
  };
  tree.forEach((node) => addChapter(node, []));

  const assets = addAssetsToZip(zip, documentId);
  const metadata: ArchiveMetadata = {
    format: "alarkive",
    version: ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    document: {
      id: document.id,
      title: document.title,
      description: document.description,
      tags: document.tags,
    },
    chapters: archiveChapters,
    assets,
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));
  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return {
    buffer,
    fileName: `${safeFileName(document.title, "alarkive-document")}.alarkive.zip`,
  };
}

function parseMetadata(value: unknown): ArchiveMetadata {
  if (!value || typeof value !== "object")
    throw new Error("metadata.json 格式无效");
  const metadata = value as Partial<ArchiveMetadata>;
  if (
    metadata.format !== "alarkive" ||
    metadata.version !== ARCHIVE_VERSION ||
    !metadata.document ||
    typeof metadata.document.id !== "string" ||
    typeof metadata.document.title !== "string" ||
    typeof metadata.document.description !== "string" ||
    !Array.isArray(metadata.document.tags) ||
    metadata.document.tags.some((tag) => typeof tag !== "string") ||
    !Array.isArray(metadata.chapters) ||
    !Array.isArray(metadata.assets) ||
    metadata.chapters.length > 10_000
  ) {
    throw new Error("不支持的 Alarkive 导出格式或版本");
  }
  const ids = new Set<string>();
  const chapterPaths = new Set<string>();
  for (const chapter of metadata.chapters) {
    if (
      !chapter ||
      typeof chapter.id !== "string" ||
      ids.has(chapter.id) ||
      (chapter.parentId !== null && typeof chapter.parentId !== "string") ||
      typeof chapter.title !== "string" ||
      typeof chapter.orderIndex !== "number" ||
      !Number.isInteger(chapter.orderIndex) ||
      chapter.orderIndex < 0 ||
      !isSafeArchivePath(chapter.path) ||
      !chapter.path.startsWith("chapters/") ||
      !isSafeArchivePath(chapter.scratchpadPath) ||
      !chapter.scratchpadPath.startsWith("scratchpads/") ||
      chapterPaths.has(chapter.path) ||
      chapterPaths.has(chapter.scratchpadPath)
    ) {
      throw new Error("导出包包含无效或重复的章节信息");
    }
    ids.add(chapter.id);
    chapterPaths.add(chapter.path);
    chapterPaths.add(chapter.scratchpadPath);
  }
  for (const chapter of metadata.chapters) {
    if (chapter.parentId && !ids.has(chapter.parentId))
      throw new Error("导出包章节层级不完整");
  }
  const uniqueAssets = new Set(metadata.assets);
  if (
    metadata.assets.length > 1_000 ||
    uniqueAssets.size !== metadata.assets.length ||
    metadata.assets.some(
      (asset) => typeof asset !== "string" || !isSafeArchivePath(asset),
    )
  )
    throw new Error("导出包包含无效的图片资源路径");
  return metadata as ArchiveMetadata;
}

async function readArchive(buffer: Buffer) {
  if (buffer.byteLength > MAX_ZIP_IMPORT_BYTES)
    throw new Error("ZIP 文件超过 25MB 限制");
  const zip = await JSZip.loadAsync(buffer, { checkCRC32: true });
  const metadataFile = zip.file("metadata.json");
  if (!metadataFile) throw new Error("ZIP 中缺少 metadata.json");
  const metadata = parseMetadata(
    JSON.parse(await metadataFile.async("string")),
  );
  const contents = new Map<string, { content: string; scratchpad: string }>();
  const assets = new Map<string, Buffer>();
  let totalTextBytes = 0;
  for (const chapter of metadata.chapters) {
    const contentFile = zip.file(chapter.path);
    const scratchpadFile = zip.file(chapter.scratchpadPath);
    if (!contentFile || !scratchpadFile)
      throw new Error(`章节“${chapter.title}”文件缺失`);
    const content = await contentFile.async("string");
    const scratchpad = await scratchpadFile.async("string");
    totalTextBytes +=
      Buffer.byteLength(content) + Buffer.byteLength(scratchpad);
    if (totalTextBytes > 50 * 1024 * 1024)
      throw new Error("解压后的 Markdown 内容过大");
    contents.set(chapter.id, { content, scratchpad });
  }
  let totalAssetBytes = 0;
  for (const assetPath of metadata.assets) {
    const file = zip.file(`assets/${assetPath}`);
    if (!file) throw new Error(`图片资源“${assetPath}”缺失`);
    const buffer = await file.async("nodebuffer");
    totalAssetBytes += buffer.byteLength;
    if (totalAssetBytes > 50 * 1024 * 1024)
      throw new Error("解压后的图片资源过大");
    validateImage(buffer);
    assets.set(assetPath, buffer);
  }
  return { zip, metadata, contents, assets };
}

export async function inspectImport(
  fileName: string,
  buffer: Buffer,
): Promise<ImportInspection> {
  if (/\.md$/i.test(fileName)) {
    if (buffer.byteLength > MAX_MARKDOWN_IMPORT_BYTES)
      throw new Error("Markdown 文件超过 5MB 限制");
    return {
      kind: "markdown",
      title: safeFileName(fileName.replace(/\.md$/i, ""), "导入文档"),
      chapterCount: 1,
      tags: [],
      warnings: ["Markdown 文件不包含 Alarkive 标签和章节层级信息。"],
    };
  }
  const { metadata } = await readArchive(buffer);
  return {
    kind: "alarkive-zip",
    title: metadata.document.title,
    chapterCount: metadata.chapters.length,
    tags: metadata.document.tags,
    warnings: ["导入时会生成新的文档和章节 ID，不会覆盖现有内容。"],
  };
}

export function importMarkdown(input: {
  fileName: string;
  content: string;
  targetDocumentId?: string;
  parentId?: string | null;
}): DocumentSummary {
  if (Buffer.byteLength(input.content) > MAX_MARKDOWN_IMPORT_BYTES)
    throw new Error("Markdown 文件超过 5MB 限制");
  const title = safeFileName(input.fileName.replace(/\.md$/i, ""), "导入章节");
  const now = new Date().toISOString();
  let documentId = input.targetDocumentId;
  db.transaction((tx) => {
    if (!documentId) {
      documentId = randomUUID();
      tx.insert(documents)
        .values({
          id: documentId,
          title,
          description: "从 Markdown 文件导入",
          createdAt: now,
          updatedAt: now,
        })
        .run();
    } else {
      const document = tx
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.id, documentId))
        .get();
      if (!document) throw new Error("目标文档不存在");
    }
    if (input.parentId) {
      const parent = tx
        .select({ documentId: chapters.documentId })
        .from(chapters)
        .where(eq(chapters.id, input.parentId))
        .get();
      if (!parent || parent.documentId !== documentId)
        throw new Error("目标父章节不存在");
    }
    const siblings = tx
      .select({ orderIndex: chapters.orderIndex })
      .from(chapters)
      .where(
        input.parentId
          ? and(
              eq(chapters.documentId, documentId),
              eq(chapters.parentId, input.parentId),
            )
          : and(eq(chapters.documentId, documentId), isNull(chapters.parentId)),
      )
      .orderBy(asc(chapters.orderIndex))
      .all();
    tx.insert(chapters)
      .values({
        id: randomUUID(),
        documentId,
        parentId: input.parentId ?? null,
        title,
        content: input.content,
        scratchpad: "",
        orderIndex: siblings.length,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.update(documents)
      .set({ updatedAt: now })
      .where(eq(documents.id, documentId))
      .run();
  });
  return getDocumentById(documentId!)!;
}

export async function importDocumentArchive(
  buffer: Buffer,
): Promise<DocumentSummary> {
  const { metadata, contents, assets } = await readArchive(buffer);
  const documentId = randomUUID();
  const chapterIds = new Map(
    metadata.chapters.map((chapter) => [chapter.id, randomUUID()]),
  );
  const now = new Date().toISOString();
  const depth = (
    chapter: ArchiveChapter,
    visiting = new Set<string>(),
  ): number => {
    if (!chapter.parentId) return 0;
    if (visiting.has(chapter.id)) throw new Error("导出包章节层级存在循环");
    visiting.add(chapter.id);
    const parent = metadata.chapters.find(
      (item) => item.id === chapter.parentId,
    );
    if (!parent) throw new Error("导出包章节层级不完整");
    return 1 + depth(parent, visiting);
  };
  const ordered = [...metadata.chapters].sort((a, b) => {
    const depthDifference = depth(a) - depth(b);
    if (depthDifference) return depthDifference;
    return a.parentId === b.parentId ? a.orderIndex - b.orderIndex : 0;
  });
  const siblingOrder = new Map<string, number>();

  let finalAssetRoot: string | null = null;
  if (assets.size) {
    mkdirSync(assetsDirectory, { recursive: true });
    const stagingRoot = mkdtempSync(join(assetsDirectory, ".import-"));
    try {
      for (const [assetPath, assetBuffer] of assets) {
        const target = resolve(stagingRoot, assetPath);
        if (!target.startsWith(`${stagingRoot}${sep}`))
          throw new Error("图片资源路径无效");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, assetBuffer, { flag: "wx", mode: 0o640 });
      }
      finalAssetRoot = resolve(assetsDirectory, documentId);
      renameSync(stagingRoot, finalAssetRoot);
    } catch (error) {
      rmSync(stagingRoot, { recursive: true, force: true });
      throw error;
    }
  }

  try {
    db.transaction((tx) => {
      tx.insert(documents)
        .values({
          id: documentId,
          title: metadata.document.title.trim() || "导入文档",
          description: metadata.document.description?.trim() ?? "",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const tags = [
        ...new Set(
          metadata.document.tags.map((tag) => tag.trim()).filter(Boolean),
        ),
      ];
      if (tags.length) {
        tx.insert(documentTags)
          .values(tags.map((tag) => ({ documentId, tag })))
          .run();
      }
      for (const chapter of ordered) {
        const imported = contents.get(chapter.id)!;
        const oldAssetPrefix = `/api/assets/${encodeURIComponent(metadata.document.id)}/`;
        const newAssetPrefix = `/api/assets/${encodeURIComponent(documentId)}/`;
        const parentId = chapter.parentId
          ? chapterIds.get(chapter.parentId)!
          : null;
        const siblingKey = parentId ?? "__root__";
        const orderIndex = siblingOrder.get(siblingKey) ?? 0;
        siblingOrder.set(siblingKey, orderIndex + 1);
        tx.insert(chapters)
          .values({
            id: chapterIds.get(chapter.id)!,
            documentId,
            parentId,
            title: chapter.title.trim() || "未命名章节",
            content: imported.content.replaceAll(
              oldAssetPrefix,
              newAssetPrefix,
            ),
            scratchpad: imported.scratchpad.replaceAll(
              oldAssetPrefix,
              newAssetPrefix,
            ),
            orderIndex,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    });
  } catch (error) {
    if (finalAssetRoot)
      rmSync(finalAssetRoot, { recursive: true, force: true });
    throw error;
  }
  return getDocumentById(documentId)!;
}
