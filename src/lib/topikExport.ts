// src/lib/topikExport.ts
// TOPIK 공식 시험지 표준 양식 인쇄 유틸리티

export interface TopikQuestion {
  question: string;
  choices?: string[] | null;
  answer: string;
}

export function exportTopikExamSheet(
  title: string,
  questions: TopikQuestion[]
): string {
  const questionsHTML = questions.map((q, idx) => `
    <div style="margin-bottom:18px; break-inside:avoid; page-break-inside:avoid;">
      <div style="font-size:13px; font-weight:bold; color:#000; margin-bottom:6px;">
        ${idx + 1}. ${q.question}
      </div>
      ${q.choices && q.choices.length > 0 ? `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:12px; margin-left:12px; color:#222;">
          ${q.choices.map((c, ci) => `<div>①②③④`[ci] + ` ${c}</div>`).join("")}
        </div>
      ` : `
        <div style="margin-left:12px; font-size:12px; color:#666;">
          답: _____________________________________________
        </div>
      `}
    </div>
  `).join("");

  return `
    <div style="max-width:190mm; margin:0 auto; font-family:'Noto Sans KR', sans-serif;">
      <!-- TOPIK 공식 헤더 양식 -->
      <div style="border:2px solid #000; padding:12px; text-align:center; margin-bottom:20px;">
        <div style="font-size:11px; font-weight:bold; letter-spacing:2px;">한국어능력시험 (TOPIK) 표준 양식</div>
        <div style="font-size:20px; font-weight:900; margin:6px 0;">${title}</div>
        <div style="display:flex; justify-content:space-around; font-size:11px; border-t:1px solid #000; pt:6px; margin-top:6px;">
          <span>수험번호: ____________________</span>
          <span>성명: ____________________</span>
        </div>
      </div>

      <!-- 문제 목록 -->
      <div style="column-count:1; column-gap:20mm;">
        ${questionsHTML}
      </div>
    </div>
  `;
}
