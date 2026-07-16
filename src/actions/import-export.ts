"use server";

import { revalidatePath } from "next/cache";
import {
  importDocumentArchive,
  importMarkdown,
  inspectImport,
  type ImportInspection,
} from "@/services/portability";
import type { DocumentSummary } from "@/types";
import { createChapter, type ChapterRecord } from "@/repositories/chapters";
import { safeFileName } from "@/lib/filename";
import { getErrorMessage, type ActionResult } from "./result";

async function readFile(
  formData: FormData,
): Promise<{ file: File; buffer: Buffer }> {
  const value = formData.get("file");
  if (!(value instanceof File) || !value.name)
    throw new Error("请选择要导入的文件");
  if (/\.md$/i.test(value.name) && value.size > 5 * 1024 * 1024)
    throw new Error("Markdown 文件超过 5MB 限制");
  if (/\.zip$/i.test(value.name) && value.size > 25 * 1024 * 1024)
    throw new Error("ZIP 文件超过 25MB 限制");
  return { file: value, buffer: Buffer.from(await value.arrayBuffer()) };
}

export async function inspectImportAction(
  formData: FormData,
): Promise<ActionResult<ImportInspection>> {
  try {
    const { file, buffer } = await readFile(formData);
    if (!/\.(md|zip)$/i.test(file.name))
      throw new Error("仅支持 .md 或 .zip 文件");
    return { ok: true, data: await inspectImport(file.name, buffer) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "导入检查失败") };
  }
}

export async function importFileAction(
  formData: FormData,
): Promise<ActionResult<DocumentSummary>> {
  try {
    const { file, buffer } = await readFile(formData);
    const document = /\.md$/i.test(file.name)
      ? importMarkdown({
          fileName: file.name,
          content: buffer.toString("utf8"),
        })
      : await importDocumentArchive(buffer);
    revalidatePath("/library");
    return { ok: true, data: document };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "导入失败") };
  }
}

export async function importMarkdownChapterAction(
  documentId: string,
  parentId: string | null,
  formData: FormData,
): Promise<ActionResult<ChapterRecord>> {
  try {
    const { file, buffer } = await readFile(formData);
    if (!/\.md$/i.test(file.name)) throw new Error("章节导入仅支持 .md 文件");
    if (buffer.byteLength > 5 * 1024 * 1024)
      throw new Error("Markdown 文件超过 5MB 限制");
    const chapter = createChapter({
      documentId,
      parentId,
      title: safeFileName(file.name.replace(/\.md$/i, ""), "导入章节"),
      content: buffer.toString("utf8"),
    });
    revalidatePath("/library");
    revalidatePath(`/documents/${documentId}/edit`);
    revalidatePath(`/documents/${documentId}/read`);
    return { ok: true, data: chapter };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "导入章节失败") };
  }
}
