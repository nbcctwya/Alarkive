"use server";

import { revalidatePath } from "next/cache";
import {
  createChapter,
  deleteChapter,
  reorderChapter,
  updateChapter,
  type ChapterRecord,
} from "@/server/repositories/chapters";
import { getErrorMessage, type ActionResult } from "./result";

export async function createChapterAction(input: {
  documentId: string;
  parentId?: string | null;
  title: string;
}): Promise<ActionResult<ChapterRecord>> {
  try {
    const chapter = createChapter(input);
    revalidatePath("/library");
    revalidatePath(`/documents/${input.documentId}/edit`);
    return { ok: true, data: chapter };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "新建章节失败") };
  }
}

export async function updateChapterAction(
  id: string,
  input: { title?: string; content?: string; scratchpad?: string },
): Promise<ActionResult<ChapterRecord>> {
  try {
    const chapter = updateChapter(id, input);
    if (!chapter) return { ok: false, error: "章节不存在" };
    revalidatePath(`/documents/${chapter.documentId}/read`);
    return { ok: true, data: chapter };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "保存章节失败") };
  }
}

export async function deleteChapterAction(id: string): Promise<ActionResult> {
  try {
    if (!deleteChapter(id)) return { ok: false, error: "章节不存在或已删除" };
    revalidatePath("/library");
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "删除章节失败") };
  }
}

export async function reorderChapterAction(
  id: string,
  direction: -1 | 1,
): Promise<ActionResult> {
  try {
    if (!reorderChapter(id, direction))
      return { ok: false, error: "章节已位于边界，无法继续移动" };
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "章节排序失败") };
  }
}
