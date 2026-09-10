// src/app/api/grammar-diff/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminAuth } from "@/lib/firebase-admin";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GRAMMAR_DIFF_COST = 2; // 수업 준비 도구 2분필 차감

async function getUidFromRequest(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("UNAUTHENTICATED");
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

export async function POST(req: NextRequest) {
  let uid: string;
  try {
    uid = await getUidFromRequest(req);
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  let charged = false;
  try {
    const { grammar, level } = await req.json();
    if (!grammar || !grammar.trim()) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "정리할 문법 항목을 입력해주세요." }, { status: 400 });
    }

    const targetLevel = level || "초급 (1~2급)";

    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        await deductCredits(uid, GRAMMAR_DIFF_COST, `문법 내용 정리 & 비교 도구 (${grammar.trim()})`);
        charged = true;
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: "INSUFFICIENT_CHALK", required: GRAMMAR_DIFF_COST, message: "분필이 부족합니다." },
            { status: 402 }
          );
        }
        throw e;
      }
    }

    const prompt = `당신은 외국인을 위한 한국어 교육 전문가이자 베테랑 교수자입니다.
선생님이 수업 준비를 할 때 학생들에게 명확하고 체계적으로 설명할 수 있도록, 입력된 한국어 문법에 대한 핵심 정리와 유사/비교 문법 분석 자료를 생성하세요.

[대상 급수/수준]: ${targetLevel}
[정리할 문법]: ${grammar.trim()}

★ 매우 중요한 조건 (반드시 준수):
1. **급수 제약**: 비교 대상으로 제시할 유사 문법(2~3개)은 **반드시 설정된 수준(${targetLevel}) 이하이거나 동급**이어야 합니다. 설정된 급수보다 더 어렵거나 높은 급수의 문법은 절대 제시하지 마세요!
2. **명확한 제약 조건(결합 정보, 형태/화용 제약)**: 주어 제약, 시제 제약(과거형 결합 불가 등), 문형 제약(명령/청유문 불가 등), 의도성 유무 등을 외국인 학습자가 자주 실수하는 포인트 위주로 간결하고 뚜렷하게 정리하세요.
3. **확실하게 비교 가능한 대조 예문 2~3개**:
   - 동일하거나 유사한 상황에서 두 문법을 썼을 때의 뉘앙스 차이, 혹은 한쪽은 자연스럽고 다른 쪽은 어색/비문(O/X)이 되는 결정적인 대조 예문을 제시하세요.
   - 예문에 대한 뉘앙스/의미 차이 해설을 함께 달아주세요.
4. **수업 꿀팁 (선생님 지도 팁)**: 외국인 학생들이 가장 많이 헷갈려 하는 질문이나 교수 시 유용한 1줄 판서 팁을 포함하세요.

반드시 마크다운 코드블록(\`\`\`) 없이 유효한 JSON 형식으로만 응답하세요:
{
  "targetGrammar": "${grammar.trim()}",
  "level": "${targetLevel}",
  "meaning": "문법의 기본 의미와 주된 기능 (1~2문장)",
  "combinationRules": [
    "동사 어간 끝음절 받침 유무에 따른 결합 (예: 받침 O -> -을 때, 받침 X -> -ㄹ 때)",
    "형용사 결합 여부 등"
  ],
  "constraints": [
    "시제 제약: ...",
    "문형 제약: 청유형/명령형 사용 제한 등",
    "주어/의도성 제약: ..."
  ],
  "comparisons": [
    {
      "compareGrammar": "비교 대상 문법명 (예: -아서/어서)",
      "compareLevel": "동급 또는 하위 급수 표시 (예: 초급 1급)",
      "coreDifference": "두 문법 간의 가장 본질적인 차이점 1줄 요약",
      "contrastExamples": [
        {
          "context": "비교 상황/맥락",
          "sentenceA": "기준 문법(${grammar.trim()})을 사용한 예문 (O/X 또는 뉘앙스)",
          "sentenceB": "비교 문법을 사용한 예문 (O/X 또는 뉘앙스)",
          "explanation": "왜 이런 차이가 발생하는지 설명"
        }
      ]
    }
  ],
  "teachingTip": "수업 시 판서하거나 학생들에게 직관적으로 설명할 때 유용한 교수 팁"
}`;

    let raw = "";
    const models = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: m,
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
        });
        const result = await model.generateContent(prompt);
        raw = result.response.text().replace(/```json|```/g, "").trim();
        if (raw) break;
      } catch (e) {
        console.error(`[grammar-diff] ${m} 실패:`, e);
      }
    }

    if (!raw) throw new Error("모든 AI 모델 호출 실패");

    const parsed = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      data: parsed,
      chalkSpent: charged ? GRAMMAR_DIFF_COST : 0,
    });
  } catch (err: unknown) {
    console.error("[grammar-diff/generate] error:", err);
    if (charged) await refundCredits(uid, GRAMMAR_DIFF_COST, "문법 내용 정리 실패").catch(() => {});
    const msg = err instanceof Error ? err.message : "문법 내용 정리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: "SERVER_ERROR", message: msg }, { status: 500 });
  }
}
