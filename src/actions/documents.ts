"use server";

import { revalidatePath } from "next/cache";
import {
  createDocument,
  deleteDocument,
  updateDocument,
} from "@/repositories/documents";
import type { DocumentSummary } from "@/types";
import { getErrorMessage, type ActionResult } from "./result";

export async function createDocumentAction(
  title: string,
  description: string,
): Promise<ActionResult<DocumentSummary>> {
  try {
    const document = createDocument({ title, description });
    revalidatePath("/library");
    return { ok: true, data: document };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "新建文档失败") };
  }
}

export async function updateDocumentAction(
  id: string,
  input: { title?: string; description?: string },
): Promise<ActionResult<DocumentSummary>> {
  try {
    const document = updateDocument(id, input);
    if (!document) return { ok: false, error: "文档不存在" };
    revalidatePath("/library");
    return { ok: true, data: document };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "更新文档失败") };
  }
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  try {
    if (!deleteDocument(id)) return { ok: false, error: "文档不存在或已删除" };
    revalidatePath("/library");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "删除文档失败") };
  }
}
