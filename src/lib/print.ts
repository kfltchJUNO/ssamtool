// src/lib/print.ts
// 쌤툴 공용 인쇄 유틸리티 (이름표, 자리표, 학생 메모지 통합 지원)

export type PaperSize = "A4" | "A3" | "Letter";
export type Orientation = "landscape" | "portrait";

export interface PrintOptions {
  paperSize?: PaperSize;
  orientation?: Orientation;
  marginMm?: number;
  scale?: number;
}

export function calcPrintScale(
  contentW: number,
  contentH: number,
  paperSize: PaperSize = "A4",
  orientation: Orientation = "landscape",
  marginMm: number = 10
): { scale: number; percent: number; isFit: boolean } {
  // mm to px conversion at 96 DPI
  const mmToPx = (mm: number) => Math.round(mm * 3.7795275591);
  let w = 297;
  let h = 210;
  if (paperSize === "A3") { w = 420; h = 297; }
  if (paperSize === "Letter") { w = 279; h = 216; }

  if (orientation === "portrait") {
    const tmp = w; w = h; h = tmp;
  }

  const printW = mmToPx(w - marginMm * 2);
  const printH = mmToPx(h - marginMm * 2);

  const scale = Math.min(printW / contentW, printH / contentH, 1.0);
  const percent = Math.round(scale * 100);

  return {
    scale,
    percent,
    isFit: percent >= 60,
  };
}

export function executePrint(bodyHTML: string, options: PrintOptions = {}): void {
  const {
    paperSize = "A4",
    orientation = "landscape",
    marginMm = 10,
  } = options;

  const pageSizeCss = `${paperSize} ${orientation}`;

  const fullHTML = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">
  <style>
    @page { size: ${pageSizeCss}; margin: ${marginMm}mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Noto Sans KR', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always; break-after: page; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
  </style>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Nanum+Gothic&family=Nanum+Myeongjo&family=Nanum+Pen+Script&family=Nanum+Brush+Script&family=Nanum+Square&family=Black+Han+Sans&family=Jua&family=Gaegu&display=swap">
  </head><body>${bodyHTML}
  <script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();window.close();},300));</script>
  </body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(fullHTML);
  doc.close();
  iframe.contentWindow?.addEventListener("afterprint", () => document.body.removeChild(iframe));
}
