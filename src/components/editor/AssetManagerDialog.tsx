"use client";

import { Image as ImageIcon, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteDocumentAssetAction,
  listDocumentAssetsAction,
} from "@/actions/assets";
import { useModalFocus } from "@/lib/use-modal-focus";
import type { DocumentAsset } from "@/types/assets";

export function AssetManagerDialog({
  documentId,
  onClose,
  onInsert,
}: {
  documentId: string;
  onClose: () => void;
  onInsert: (asset: DocumentAsset) => void;
}) {
  const [assets, setAssets] = useState<DocumentAsset[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const dialogRef = useModalFocus<HTMLElement>(onClose);
  useEffect(() => {
    void listDocumentAssetsAction(documentId).then((result) => {
      setLoading(false);
      if (!result.ok) setError(result.error);
      else setAssets(result.data);
    });
  }, [documentId]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="surface flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-manager-title"
      >
        <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
          <div>
            <h2 id="asset-manager-title" className="font-semibold">
              图片资源
            </h2>
            <p className="muted mt-1 text-sm">
              插入现有图片，或删除不再使用的文件。
            </p>
          </div>
          <button
            className="ui-button icon ghost"
            onClick={onClose}
            aria-label="关闭图片资源"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-40 flex-1 overflow-y-auto p-5">
          {error ? (
            <p className="text-sm text-[var(--danger)]">{error}</p>
          ) : loading ? (
            <p className="muted text-sm">正在读取图片…</p>
          ) : assets.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {assets.map((asset) => (
                <li
                  key={asset.name}
                  className="overflow-hidden rounded-xl border border-[var(--border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt=""
                    className="h-32 w-full bg-[var(--surface-muted)] object-contain"
                  />
                  <div className="p-3">
                    <p className="truncate text-xs" title={asset.name}>
                      {asset.name}
                    </p>
                    <p className="muted mt-1 text-xs">
                      {Math.max(1, Math.round(asset.size / 1024))} KB
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        className="ui-button flex-1 px-2 py-1 text-xs"
                        onClick={() => onInsert(asset)}
                      >
                        插入
                      </button>
                      <button
                        className="ui-button icon min-h-8 text-[var(--danger)]"
                        aria-label={`删除${asset.name}`}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `确定删除图片“${asset.name}”吗？正文中的引用将失效。`,
                            )
                          )
                            return;
                          const result = await deleteDocumentAssetAction(
                            documentId,
                            asset.name,
                          );
                          if (!result.ok) setError(result.error);
                          else
                            setAssets((current) =>
                              current.filter(
                                (item) => item.name !== asset.name,
                              ),
                            );
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-40 place-items-center text-center">
              <div>
                <ImageIcon className="muted mx-auto mb-2" />
                <p className="font-medium">还没有上传图片</p>
                <p className="muted mt-1 text-sm">
                  关闭窗口后使用工具栏中的“上传图片”。
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
