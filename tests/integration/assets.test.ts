import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDocument } from "@/server/repositories/documents";
import { deleteDocumentWithAssets } from "@/server/services/documents";
import {
  deleteDocumentAsset,
  listDocumentAssets,
  readDocumentAsset,
  resolveDocumentAssetPath,
  storeDocumentImage,
  validateImage,
} from "@/server/services/assets";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

describe("local image assets", () => {
  it("stores, reads, lists and deletes a verified image", () => {
    const document = createDocument({ title: "Images" });
    const asset = storeDocumentImage({
      documentId: document.id,
      originalName: "diagram weird?.png",
      declaredMime: "image/png",
      buffer: png,
    });
    expect(asset.name).toMatch(/^diagram weird--[a-f0-9]{8}\.png$/);
    expect(asset.url).toContain(`/api/assets/${document.id}/`);
    expect(readDocumentAsset(document.id, asset.name)).toMatchObject({
      mimeType: "image/png",
    });
    expect(listDocumentAssets(document.id)).toHaveLength(1);
    expect(deleteDocumentAsset(document.id, asset.name)).toBe(true);
    expect(listDocumentAssets(document.id)).toHaveLength(0);
  });

  it("rejects spoofed, oversized and traversing files", () => {
    expect(() =>
      validateImage(Buffer.from("<svg></svg>"), "image/png"),
    ).toThrow();
    expect(() => validateImage(Buffer.alloc(8 * 1024 * 1024 + 1))).toThrow(
      "8MB",
    );
    expect(() => resolveDocumentAssetPath("doc", "../secret.png")).toThrow();
    expect(() => resolveDocumentAssetPath("../../bad", "image.png")).toThrow();
  });

  it("removes the document asset directory when deleting its document", () => {
    const document = createDocument({ title: "Cleanup" });
    const asset = storeDocumentImage({
      documentId: document.id,
      originalName: "image.png",
      buffer: png,
    });
    const path = resolveDocumentAssetPath(document.id, asset.name);
    expect(existsSync(path)).toBe(true);
    expect(deleteDocumentWithAssets(document.id)).toBe(true);
    expect(existsSync(path)).toBe(false);
  });
});
