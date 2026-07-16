import { deleteDocument as deleteDocumentRecord } from "@/server/repositories/documents";
import { stageDocumentAssetsForDeletion } from "@/server/services/assets";

/** Delete the database aggregate and its filesystem assets as one use case. */
export function deleteDocumentWithAssets(id: string): boolean {
  const stagedAssets = stageDocumentAssetsForDeletion(id);
  try {
    const deleted = deleteDocumentRecord(id);
    if (!deleted) {
      stagedAssets.rollback();
      return false;
    }
    try {
      stagedAssets.commit();
    } catch (error) {
      console.error(
        "[alarkive] failed to remove staged document assets",
        error,
      );
    }
    return true;
  } catch (error) {
    stagedAssets.rollback();
    throw error;
  }
}
