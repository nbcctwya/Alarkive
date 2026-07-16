import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

test("creates, edits, reads and removes a persistent learning document", async ({
  page,
}) => {
  const title = `Browser E2E ${Date.now()}`;
  const updatedTitle = `${title} Updated`;
  const longBody = Array.from(
    { length: 45 },
    (_, index) => `Paragraph ${index + 1}: persistent reader content.`,
  ).join("\n\n");

  await page.goto("/library");
  await page.getByRole("button", { name: "新建文档" }).first().click();
  await page.getByLabel("文档标题").fill(title);
  await page.getByLabel("简介").fill("Created by isolated browser E2E");
  await page.getByRole("button", { name: "创建文档" }).click();

  let card = page.locator("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: `修改${title}信息` }).click();
  const editDialog = page.getByRole("dialog", { name: "修改文档信息" });
  await editDialog.getByLabel("标题").fill(updatedTitle);
  await editDialog.getByLabel("简介").fill("Updated persistent description");
  await editDialog.getByLabel("标签").fill("e2e，persistent");
  await editDialog.getByRole("button", { name: "保存修改" }).click();

  card = page.locator("article").filter({ hasText: updatedTitle });
  await expect(card).toContainText("persistent");
  await card.getByRole("link", { name: "编辑", exact: true }).click();

  await page.getByRole("button", { name: "新建章节" }).click();
  const editor = page.getByLabel("Markdown 编辑区");
  await editor.fill(`# E2E Heading

> [!TIP]
> Browser verified callout.

- [x] persisted

$$
E = mc^2
$$

${longBody}`);
  await expect(page.getByText("有未保存更改")).toBeVisible();
  await expect(page.getByText("已自动保存")).toBeVisible();

  await page
    .getByLabel("选择要上传的图片")
    .setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText(/已上传并插入正文/)).toBeVisible();
  await expect(page.getByText("已自动保存")).toBeVisible();

  await page.getByRole("button", { name: "素材", exact: true }).click();
  await editor.fill("## E2E Scratchpad\n\nPersistent source notes.");
  await page.getByRole("button", { name: "保存", exact: true }).first().click();
  await expect(page.getByText("已自动保存")).toBeVisible();

  await page.getByRole("button", { name: "正文", exact: true }).click();
  await page.getByRole("button", { name: "进入阅读" }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Heading" }),
  ).toBeVisible();
  await expect(page.locator(".markdown-callout-tip")).toContainText(
    "Browser verified callout",
  );
  const image = page.locator(".markdown-body img");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);

  await page.getByRole("button", { name: "标记本章完成" }).click();
  await expect(page.getByRole("button", { name: "本章已完成" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(1_200);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "E2E Heading" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "本章已完成" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);

  await page.getByRole("link", { name: "Alarkive" }).click();
  card = page.locator("article").filter({ hasText: updatedTitle }).last();
  await expect(card).toContainText("100%");
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: `删除${updatedTitle}` }).click();
  await expect(page.getByText(updatedTitle)).toHaveCount(0);
});
