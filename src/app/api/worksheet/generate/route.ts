// src/app/api/worksheet/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminAuth } from "@/lib/firebase-admin";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const WORKSHEET_COST = 3;

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
    const { topic, words } = await req.json();
    if (!topic && (!words || !words.length)) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "주제나 단어를 입력해주세요." }, { status: 400 });
    }

    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        await deductCredits(uid, WORKSHEET_COST, "단어장/십자말풀이 생성");
        charged = true;
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: "INSUFFICIENT_CHALK", required: WORKSHEET_COST, message: "분필이 부족합니다." },
            { status: 402 }
          );
        }
        throw e;
      }
    }

    const prompt = `당신은 한국어 교육 전문가입니다. 주제 '${topic || "일상 한국어 어휘"}'와 제시 단어 [${(words || []).join(", ")}]를 바탕으로 한국어 학습용 단어장 및 가로세로 낱말퍼즐을 생성하세요.

[매우 중요한 조건]:
1. 십자말풀이(가로세로 낱말퍼즐)에 들어갈 단어들은 서로 한 글자 이상 겹칠 수 있는 2~5글자의 한국어 명사 또는 어휘로 8~12개를 선정하세요. (예: '학교'의 '교'와 '교실', '선생님'의 '생'과 '학생'처럼 공통 음절이 많을수록 좋습니다)
2. 각 단어마다 단어장용 뜻/예문과 함께, 십자말풀이 문제로 풀 수 있는 재미있고 명확한 수수께끼/퀴즈 형식의 힌트(clue)를 작성하세요.

반드시 다른 설명 없이 아래 JSON 규격으로만 응답하세요:
{
  "title": "${topic || "한국어 어휘"} 단어장 & 가로세로 퍼즐",
  "wordlist": [
    {"word": "학교", "reading": "학교", "meaning": "공부하는 장소", "example": "저는 아침에 학교에 갑니다."}
  ],
  "crosswordClues": [
    {"word": "학교", "clue": "선생님과 학생들이 모여 함께 공부하는 곳은 어디일까요?"}
  ]
}`;

    let raw = "";
    const models = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
    for (const m of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: m,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        raw = result.response.text().replace(/```json|```/g, "").trim();
        if (raw) break;
      } catch (e) {
        console.error(`[worksheet] ${m} 실패:`, e);
      }
    }
    if (!raw) throw new Error("모든 AI 모델 호출 실패");
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      worksheet: parsed,
      chalkSpent: charged ? WORKSHEET_COST : 0,
    });
  } catch (err: unknown) {
    console.error("[worksheet/generate] error:", err);
    if (charged) await refundCredits(uid, WORKSHEET_COST, "워크시트 생성 실패").catch(() => {});
    return NextResponse.json({ error: "SERVER_ERROR", message: "워크시트 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
