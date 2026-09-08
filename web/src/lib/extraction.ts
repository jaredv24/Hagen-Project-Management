import * as XLSX from "xlsx";
import type { PDFDocumentProxy } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

export type UploadKind = "excel" | "pdf" | "image" | "other";

export function getUploadKind(file: File): UploadKind {
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    type.includes("spreadsheet") ||
    type === "application/vnd.ms-excel"
  )
    return "excel";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  return "other";
}

export interface ExtractImage {
  base64: string;
  contentType: string;
}

// Splits a rendered page/image into horizontal strips and returns each as a
// base64 JPEG. Vision models cap the effective resolution processed per
// image, so a whole crowded page gets shrunk down and small handwriting
// disappears in that shrink — sending several large strips instead of one
// small page keeps each strip within the resolution that actually gets used.
function sliceCanvasToImages(canvas: HTMLCanvasElement, slices: number): ExtractImage[] {
  const images: ExtractImage[] = [];
  const baseHeight = Math.ceil(canvas.height / slices);
  const overlap = Math.round(baseHeight * 0.22);
  for (let i = 0; i < slices; i++) {
    const sy = Math.max(0, i * baseHeight - overlap);
    const ey = Math.min(canvas.height, (i + 1) * baseHeight + overlap);
    const sh = ey - sy;
    if (sh <= 0) continue;
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sh;
    sliceCanvas.getContext("2d")!.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
    images.push({ base64: sliceCanvas.toDataURL("image/jpeg", 0.92).split(",")[1], contentType: "image/jpeg" });
  }
  return images;
}

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

export async function renderPdfPageRangeToImages(
  pdf: PDFDocumentProxy,
  startPage: number,
  endPage: number,
  slicesPerPage = 8
): Promise<ExtractImage[]> {
  const images: ExtractImage[] = [];
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
    images.push(...sliceCanvasToImages(canvas, slicesPerPage));
  }
  return images;
}

export async function renderPdfPagesToImages(file: File, slicesPerPage = 8): Promise<ExtractImage[]> {
  const pdf = await loadPdfDocument(file);
  return renderPdfPageRangeToImages(pdf, 1, pdf.numPages, slicesPerPage);
}

export function sliceImageFileToImages(file: File, slices = 8): Promise<ExtractImage[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const upscale = 2.2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * upscale);
      canvas.height = Math.round(img.naturalHeight * upscale);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(sliceCanvasToImages(canvas, slices));
    };
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = URL.createObjectURL(file);
  });
}

// Reads an .xlsx/.xls file entirely client-side (via SheetJS) and dumps its
// rows to plain text, resolving merged cells so a value typed once still
// shows up for every cell it visually spans. No file leaves the browser
// except as this text, sent for interpretation.
export function readExcelAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target!.result, { type: "array" });
        const sheetName = wb.SheetNames.find((n) => /status\s*log/i.test(n)) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        resolve(sheetToText(ws));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read that spreadsheet."));
    reader.readAsArrayBuffer(file);
  });
}

function sheetToText(ws: XLSX.WorkSheet): string {
  if (!ws || !ws["!ref"]) return "";
  const merges = ws["!merges"] || [];
  const anchorFor = (r: number, c: number) => {
    for (const m of merges) {
      if (r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c) return { r: m.s.r, c: m.s.c };
    }
    return null;
  };
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const lines: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const rowVals: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      let cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) {
        const anchor = anchorFor(r, c);
        if (anchor && !(anchor.r === r && anchor.c === c)) cell = ws[XLSX.utils.encode_cell(anchor)];
      }
      const val = cell ? (cell.w !== undefined ? cell.w : cell.v) : "";
      rowVals.push(val === undefined || val === null ? "" : String(val));
    }
    if (rowVals.some((v) => v.trim() !== "")) lines.push(rowVals.join(" | "));
  }
  return lines.join("\n");
}
