"use server";

import { revalidatePath } from "next/cache";
import {
  markChapterCompleted,
  upsertReadingProgress,
} from "@/repositories/reading-progress";
import type { ChapterReadingState } from "@/types";
import { getErrorMessage, type ActionResult } from "./result";

export async function saveReadingProgressAction(input: {
  documentId: string;
  chapterId: string;
  scrollPosition: number;
}): Promise<ActionResult<ChapterReadingState>> {
  try {
    return { ok: true, data: upsertReadingProgress(input) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "阅读位置保存失败") };
  }
}

export async function markChapterCompletedAction(
  documentId: string,
  chapterId: string,
  completed: boolean,
): Promise<ActionResult<ChapterReadingState>> {
  try {
    const state = markChapterCompleted(documentId, chapterId, completed);
    revalidatePath("/library");
    return { ok: true, data: state };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "完成状态保存失败") };
  }
}
