"use client";

import { ArrowRight, CheckCircle2, Circle, Clock3 } from "lucide-react";

export function ReadingProgressCard({
  progress,
  currentIndex,
  total,
  onNext,
  completed,
  savingCompletion,
  onToggleCompleted,
}: {
  progress: number;
  currentIndex: number;
  total: number;
  onNext: () => void;
  completed: boolean;
  savingCompletion: boolean;
  onToggleCompleted: () => void;
}) {
  const remaining = Math.max(2, (total - currentIndex - 1) * 4);
  return (
    <section className="surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">阅读进度</h2>
        <span className="text-sm font-semibold text-[var(--accent)]">
          {progress}%
        </span>
      </div>
      <div className="progress-track mt-4">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="muted mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p>章节位置</p>
          <p className="mt-1 font-semibold text-[var(--text)]">
            {currentIndex + 1} / {total}
          </p>
        </div>
        <div>
          <p>预计剩余</p>
          <p className="mt-1 flex items-center gap-1 font-semibold text-[var(--text)]">
            <Clock3 size={13} />
            {remaining} 分钟
          </p>
        </div>
      </div>
      <button
        className={`ui-button mt-4 w-full ${completed ? "border-emerald-300 text-emerald-700" : ""}`}
        onClick={onToggleCompleted}
        disabled={savingCompletion}
      >
        {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        {savingCompletion
          ? "保存中…"
          : completed
            ? "本章已完成"
            : "标记本章完成"}
      </button>
      <button
        className="ui-button mt-2 w-full"
        onClick={onNext}
        disabled={currentIndex >= total - 1}
      >
        跳转到下一小节 <ArrowRight size={14} />
      </button>
    </section>
  );
}
