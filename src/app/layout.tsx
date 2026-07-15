import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alarkive — 让知识与你共同演化",
  description: "轻量级个人学习文档平台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
