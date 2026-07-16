import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters as chaptersTable } from "@/db/schema";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  touchDocumentLastRead,
  updateDocument,
} from "@/repositories/documents";
import {
  createChapter,
  deleteChapter,
  getChapterById,
  listChapterRecords,
  listChaptersByDocument,
  reorderChapter,
  updateChapter,
} from "@/repositories/chapters";
import {
  getReadingProgress,
  markChapterCompleted,
  upsertReadingProgress,
} from "@/repositories/reading-progress";

describe("document repository", () => {
  it("creates, updates, lists and deletes a document with normalized tags", () => {
    const created = createDocument({
      title: "  Linear Algebra  ",
      description: "  notes  ",
      tags: ["math", " math ", "course"],
    });

    expect(created).toMatchObject({
      title: "Linear Algebra",
      description: "notes",
      tags: ["math", "course"],
      chapterCount: 0,
      progress: 0,
    });
    expect(listDocuments()).toHaveLength(1);

    const updated = updateDocument(created.id, {
      title: "Advanced Linear Algebra",
      description: "updated",
      tags: ["math", "reference", "reference"],
    });
    expect(updated).toMatchObject({
      title: "Advanced Linear Algebra",
      description: "updated",
      tags: ["math", "reference"],
    });

    touchDocumentLastRead(created.id);
    expect(getDocumentById(created.id)?.lastReadAt).not.toBeNull();
    expect(deleteDocument(created.id)).toBe(true);
    expect(getDocumentById(created.id)).toBeNull();
  });
});

describe("chapter hierarchy and ordering", () => {
  it("maintains hierarchy and contiguous sibling order across create, move and delete", () => {
    const document = createDocument({ title: "Course" });
    const first = createChapter({ documentId: document.id, title: "First" });
    const second = createChapter({ documentId: document.id, title: "Second" });
    const third = createChapter({ documentId: document.id, title: "Third" });
    const child = createChapter({
      documentId: document.id,
      parentId: second.id,
      title: "Child",
    });

    expect(listChaptersByDocument(document.id)[1].children[0].id).toBe(
      child.id,
    );
    expect(reorderChapter(third.id, -1)).toBe(true);
    expect(
      listChaptersByDocument(document.id).map((node) => node.title),
    ).toEqual(["First", "Third", "Second"]);
    expect(
      listChapterRecords(document.id)
        .filter((row) => !row.parentId)
        .map((row) => row.orderIndex)
        .sort(),
    ).toEqual([0, 1, 2]);

    expect(deleteChapter(second.id)).toBe(true);
    expect(getChapterById(child.id)).toBeNull();
    expect(
      listChaptersByDocument(document.id).map((node) => node.orderIndex),
    ).toEqual([0, 1]);
    expect(getDocumentById(document.id)?.chapterCount).toBe(2);

    expect(
      updateChapter(first.id, { content: "# Saved", scratchpad: "source" }),
    ).toMatchObject({
      content: "# Saved",
      scratchpad: "source",
    });
  });

  it("repairs a gapped order before appending a new chapter", () => {
    const document = createDocument({ title: "Course" });
    createChapter({ documentId: document.id, title: "First" });
    const second = createChapter({ documentId: document.id, title: "Second" });
    db.update(chaptersTable)
      .set({ orderIndex: 7 })
      .where(eq(chaptersTable.id, second.id))
      .run();

    createChapter({ documentId: document.id, title: "Third" });
    expect(
      listChaptersByDocument(document.id).map((node) => node.orderIndex),
    ).toEqual([0, 1, 2]);
  });
});

describe("reading progress", () => {
  it("persists scroll and completion and calculates total progress", () => {
    const document = createDocument({ title: "Course" });
    const first = createChapter({ documentId: document.id, title: "First" });
    const second = createChapter({ documentId: document.id, title: "Second" });

    upsertReadingProgress({
      documentId: document.id,
      chapterId: first.id,
      scrollPosition: 321,
    });
    markChapterCompleted(document.id, first.id, true);
    upsertReadingProgress({
      documentId: document.id,
      chapterId: second.id,
      scrollPosition: 99,
    });

    expect(getReadingProgress(document.id)).toMatchObject({
      chapterId: second.id,
      scrollPosition: 99,
      completedChapterIds: [first.id],
      progress: 50,
    });
    expect(getDocumentById(document.id)?.progress).toBe(50);
  });

  it("rejects progress that pairs a document with another document's chapter", () => {
    const firstDocument = createDocument({ title: "First" });
    const secondDocument = createDocument({ title: "Second" });
    const foreignChapter = createChapter({
      documentId: secondDocument.id,
      title: "Foreign",
    });

    expect(() =>
      upsertReadingProgress({
        documentId: firstDocument.id,
        chapterId: foreignChapter.id,
        scrollPosition: 10,
      }),
    ).toThrow("章节不存在或不属于当前文档");
  });
});
