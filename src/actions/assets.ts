"use server";

import { revalidatePath } from "next/cache";
import {
  deleteDocumentAsset,
  listDocumentAssets,
  storeDocumentImage,
  MAX_IMAGE_BYTES,
  type DocumentAsset,
} from "@/services/assets";
import { getErrorMessage, type ActionResult } from "./result";

export async function listDocumentAssetsAction(
  documentId: string,
): Promise<ActionResult<DocumentAsset[]>> {
  try {
    return { ok: true, data: listDocumentAssets(documentId) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "读取图片资源失败") };
  }
}

export async function uploadDocumentImageAction(
  documentId: string,
  formData: FormData,
): Promise<ActionResult<DocumentAsset>> {
  try {
    const value = formData.get("image");
    if (!(value instanceof File) || !value.name)
      throw new Error("请选择要上传的图片");
    if (value.size > MAX_IMAGE_BYTES) throw new Error("图片超过 8MB 限制");
    const asset = storeDocumentImage({
      documentId,
      originalName: value.name,
      declaredMime: value.type,
      buffer: Buffer.from(await value.arrayBuffer()),
    });
    revalidatePath(`/documents/${documentId}/edit`);
    revalidatePath(`/documents/${documentId}/read`);
    return { ok: true, data: asset };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "上传图片失败") };
  }
}

export async function deleteDocumentAssetAction(
  documentId: string,
  assetPath: string,
): Promise<ActionResult> {
  try {
    if (!deleteDocumentAsset(documentId, assetPath))
      return { ok: false, error: "图片不存在或已删除" };
    revalidatePath(`/documents/${documentId}/edit`);
    revalidatePath(`/documents/${documentId}/read`);
    return { ok: true, data: undefined };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error, "删除图片失败") };
  }
}
