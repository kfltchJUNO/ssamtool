// src/app/api/text-adapt/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { adminAuth } from "@/lib/firebase-admin";
import { deductCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { isChalkEnabled } from "@/lib/monetizationServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const ADAPT_COST = 3;

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
    const { originalText, targetLevel } = await req.json();
    if (!originalText || !originalText.trim()) {
      return NextResponse.json({ error: "BAD_REQUEST", message: "원문 지문을 입력해주세요." }, { status: 400 });
    }

    const chalkEnabled = await isChalkEnabled();
    if (chalkEnabled) {
      try {
        await deductCredits(uid, ADAPT_COST, "AI 지문 난이도 변환");
        charged = true;
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return NextResponse.json(
            { error: "INSUFFICIENT_CHALK", required: ADAPT_COST, message: "분필이 부족합니다." },
            { status: 402 }
          );
        }
        throw e;
      }
    }

    const prompt = `당신은 한국어 교육 전문가입니다. 아래 원문 글을 한국어 능력시험 TOPIK '${targetLevel || "초급(TOPIK 1-2급)"}' 수준에 맞는 어휘와 문법 구조로 변환하여 재작성하세요.

[원문 지문]
${originalText}

반드시 다른 설명 없이 아래 JSON 규격으로만 응답하세요:
{
  "targetLevel": "${targetLevel || "초급"}",
  "adaptedText": "변환된 글 내용...",
  "keyVocabulary": [
    {"word": "어휘", "meaning": "뜻풀이"}
  ],
  "grammarNotes": "학습 추천 문법 설명"
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
        console.error(`[text-adapt] ${m} 실패:`, e);
      }
    }
    if (!raw) throw new Error("모든 AI 모델 호출 실패");
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      success: true,
      result: parsed,
      chalkSpent: charged ? ADAPT_COST : 0,
    });
  } catch (err: unknown) {
    console.error("[text-adapt/generate] error:", err);
    if (charged) await refundCredits(uid, ADAPT_COST, "지문 변환 실패").catch(() => {});
    return NextResponse.json({ error: "SERVER_ERROR", message: "지문 변환 중 오류가 발생했습니다." }, { status: 500 });
  }
}
