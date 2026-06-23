/**
 * Generate docs/a-moim-planning-guide.pdf from HTML.
 * Usage: node scripts/generate-a-moim-guide-pdf.mjs
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(path.join(root, "mobile", "node_modules", "playwright")));
}
const htmlPath = path.join(root, "docs", "a-moim-planning-guide.html");
const pdfPath = path.join(root, "docs", "a-moim-planning-guide.pdf");

if (!fs.existsSync(htmlPath)) {
  console.error("Missing:", htmlPath);
  process.exit(1);
}

const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: "networkidle" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "14mm", left: "12mm", right: "12mm" },
  });
  console.log("PDF written:", pdfPath);
} finally {
  await browser.close();
}
