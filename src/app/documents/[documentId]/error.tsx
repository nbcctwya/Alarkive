"use client";

import Link from "next/link";

export default function DocumentError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-center">
      <div className="surface max-w-md p-8">
        <h1 className="text-xl font-semibold">无法读取这份文档</h1>
        <p className="muted mt-3 text-sm leading-6">
          本地数据库暂时不可用，或文档数据已损坏。编辑内容不会自动回退到示例数据。
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link className="ui-button" href="/library">
            返回 Library
          </Link>
          <button className="ui-button primary" onClick={reset}>
            重试
          </button>
        </div>
      </div>
    </main>
  );
}
