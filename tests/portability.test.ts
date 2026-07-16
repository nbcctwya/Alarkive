import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { safeFileName, isSafeArchivePath } from "@/lib/filename";
import {
  exportDocumentArchive,
  importDocumentArchive,
  importMarkdown,
  inspectImport,
} from "@/services/portability";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
} from "@/repositories/documents";
import {
  createChapter,
  listChapterRecords,
  listChaptersByDocument,
} from "@/repositories/chapters";
import { listDocumentAssets, storeDocumentImage } from "@/services/assets";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("portable file names", () => {
  it("removes cross-platform reserved characters and names", () => {
    expect(safeFileName(" chapter: 1 / intro? ")).toBe("chapter- 1 - intro-");
    expect(safeFileName("CON")).toBe("untitled");
    expect(safeFileName("...", "fallback")).toBe("fallback");
    expect(isSafeArchivePath("chapters/001-intro.md")).toBe(true);
    expect(isSafeArchivePath("../database.db")).toBe(false);
    expect(isSafeArchivePath("chapters/../../database.db")).toBe(false);
  });
});

describe("Markdown and Alarkive archive portability", () => {
  it("exports and re-imports a document without losing hierarchy, tags, content or scratchpads", async () => {
    const original = createDocument({
      title: "Paper / Notes",
      description: "Round-trip document",
      tags: ["paper", "math"],
    });
    const parent = createChapter({
      documentId: original.id,
      title: "Overview",
      content: "# Overview\n\n$E = mc^2$",
      scratchpad: "source A",
    });
    createChapter({
      documentId: original.id,
      parentId: parent.id,
      title: "Details",
      content: "## Details\n\n- one\n- two",
      scratchpad: "source B",
    });

    const exported = await exportDocumentArchive(original.id);
    expect(exported.fileName).toBe("Paper - Notes.alarkive.zip");
    const zip = await JSZip.loadAsync(exported.buffer);
    expect(zip.file("metadata.json")).not.toBeNull();
    expect(Object.keys(zip.files)).toContain("assets/.keep");

    const inspection = await inspectImport(exported.fileName, exported.buffer);
    expect(inspection).toMatchObject({
      kind: "alarkive-zip",
      title: "Paper / Notes",
      chapterCount: 2,
      tags: ["paper", "math"],
    });

    deleteDocument(original.id);
    const imported = await importDocumentArchive(exported.buffer);
    expect(imported.id).not.toBe(original.id);
    expect(imported).toMatchObject({
      title: "Paper / Notes",
      description: "Round-trip document",
      tags: ["paper", "math"],
      chapterCount: 2,
    });
    const tree = listChaptersByDocument(imported.id);
    expect(tree[0].title).toBe("Overview");
    expect(tree[0].children[0].title).toBe("Details");
    const records = listChapterRecords(imported.id);
    expect(records.map((record) => record.content)).toEqual([
      "# Overview\n\n$E = mc^2$",
      "## Details\n\n- one\n- two",
    ]);
    expect(records.map((record) => record.scratchpad)).toEqual([
      "source A",
      "source B",
    ]);
  });

  it("imports Markdown as a new document or as a chapter in an existing document", () => {
    const imported = importMarkdown({
      fileName: "probability.md",
      content: "# Probability",
    });
    expect(imported).toMatchObject({ title: "probability", chapterCount: 1 });

    const existing = createDocument({ title: "Existing" });
    importMarkdown({
      fileName: "appendix.md",
      content: "# Appendix",
      targetDocumentId: existing.id,
    });
    expect(getDocumentById(existing.id)?.chapterCount).toBe(1);
  });

  it("round-trips local assets and rewrites their document URLs", async () => {
    const original = createDocument({ title: "Illustrated" });
    const asset = storeDocumentImage({
      documentId: original.id,
      originalName: "figure.png",
      buffer: png,
    });
    createChapter({
      documentId: original.id,
      title: "Figure",
      content: `![figure](${asset.url})`,
    });
    const exported = await exportDocumentArchive(original.id);
    const zip = await JSZip.loadAsync(exported.buffer);
    expect(zip.file(`assets/${asset.name}`)).not.toBeNull();
    deleteDocument(original.id);

    const imported = await importDocumentArchive(exported.buffer);
    const importedAssets = listDocumentAssets(imported.id);
    expect(importedAssets.map((item) => item.name)).toEqual([asset.name]);
    expect(listChapterRecords(imported.id)[0].content).toBe(
      `![figure](${importedAssets[0].url})`,
    );
  });

  it("leaves no partial document when a ZIP fails validation", async () => {
    const before = listDocuments().length;
    const brokenZip = new JSZip();
    brokenZip.file("metadata.json", JSON.stringify({ format: "other" }));
    const buffer = await brokenZip.generateAsync({ type: "nodebuffer" });

    await expect(importDocumentArchive(buffer)).rejects.toThrow();
    expect(listDocuments()).toHaveLength(before);
  });
});
