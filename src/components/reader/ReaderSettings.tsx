"use client";

import { Moon, PanelLeft, PanelRight, Sun } from "lucide-react";

export type FontSize = "small" | "medium" | "large";
export type ContentWidth = "compact" | "comfortable" | "wide";
export const fontClasses: Record<FontSize, string> = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
};
export const widthClasses: Record<ContentWidth, string> = {
  compact: "max-w-[680px]",
  comfortable: "max-w-[780px]",
  wide: "max-w-[920px]",
};

export function ReaderSettings({
  fontSize,
  width,
  dark,
  leftVisible,
  rightVisible,
  onFontSize,
  onWidth,
  onDark,
  onLeftVisible,
  onRightVisible,
}: {
  fontSize: FontSize;
  width: ContentWidth;
  dark: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  onFontSize: (value: FontSize) => void;
  onWidth: (value: ContentWidth) => void;
  onDark: () => void;
  onLeftVisible: () => void;
  onRightVisible: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <span className="muted px-2">字号</span>
        {(["small", "medium", "large"] as const).map((size, index) => (
          <button
            key={size}
            className={`rounded-md px-2.5 py-1 ${fontSize === size ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "muted"}`}
            onClick={() => onFontSize(size)}
          >
            {["小", "中", "大"][index]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <span className="muted px-2">宽度</span>
        {(["compact", "comfortable", "wide"] as const).map((size, index) => (
          <button
            key={size}
            className={`rounded-md px-2.5 py-1 ${width === size ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "muted"}`}
            onClick={() => onWidth(size)}
          >
            {["窄", "舒适", "宽"][index]}
          </button>
        ))}
      </div>
      <button className="ui-button min-h-8 px-2.5 py-1" onClick={onDark}>
        {dark ? <Sun size={15} /> : <Moon size={15} />}
        {dark ? "浅色" : "深色"}
      </button>
      <div className="hidden items-center gap-1 xl:flex">
        <button
          className={`ui-button icon min-h-8 ${leftVisible ? "text-[var(--accent)]" : "muted"}`}
          onClick={onLeftVisible}
          title="切换全书目录"
          aria-label={leftVisible ? "隐藏全书目录" : "显示全书目录"}
        >
          <PanelLeft size={16} />
        </button>
        <button
          className={`ui-button icon min-h-8 ${rightVisible ? "text-[var(--accent)]" : "muted"}`}
          onClick={onRightVisible}
          title="切换本章导航"
          aria-label={rightVisible ? "隐藏本章导航" : "显示本章导航"}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </div>
  );
}
