// src/app/q/[shareCode]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

type Question = {
  index: number;
  type: string;
  question: string;
  choices: string[] | null;
};

type QuizPublic = {
  title: string;
  difficulty: string;
  questions: Question[];
};

type SubmitResultItem = {
  index: number;
  question: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
};

type SubmitResult = {
  score: number;
  correctCount: number;
  total: number;
  results: SubmitResultItem[];
};

type Step = "loading" | "name" | "quiz" | "submitting" | "result" | "error";

export default function StudentQuizPage({
  params,
}: {
  params: { shareCode: string };
}) {
  const { shareCode } = params;

  const [step, setStep] = useState<Step>("loading");
  const [quiz, setQuiz] = useState<QuizPublic | null>(null);
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quiz/by-code/${shareCode}/public`);
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "퀴즈를 불러오지 못했습니다.");
          setStep("error");
          return;
        }
        setQuiz(data as QuizPublic);
        setStep("name");
      } catch {
        setErrorMsg("네트워크 오류가 발생했습니다.");
        setStep("error");
      }
    };
    fetchQuiz();
  }, [shareCode]);

  const setAnswer = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const submit = async () => {
    setStep("submitting");
    try {
      const res = await fetch(`/api/quiz/by-code/${shareCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          answers: Object.entries(answers).map(([index, value]) => ({
            index: Number(index),
            value,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "제출에 실패했습니다.");
        setStep("error");
        return;
      }
      setResult(data as SubmitResult);
      setStep("result");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setStep("error");
    }
  };

  if (step === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <AlertCircle size={16} /> {errorMsg}
        </div>
      </div>
    );
  }

  // 이 시점 이후로는 quiz가 항상 존재함 (loading/error에서 이미 return)
  if (!quiz) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        <p className="mb-1 text-xs font-medium text-slate-400">쌤툴 퀴즈</p>
        <h1 className="mb-6 text-xl font-bold text-slate-900">{quiz.title}</h1>

        {step === "name" && (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-medium text-slate-700">이름을 입력해 주세요</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
            <button
              onClick={() => studentName.trim() && setStep("quiz")}
              disabled={!studentName.trim()}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400"
            >
              시작하기
            </button>
          </div>
        )}

        {(step === "quiz" || step === "submitting") && (
          <div className="space-y-4">
            {quiz.questions.map((q) => (
              <div key={q.index} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium text-slate-400">{q.index + 1}번</p>
                <p className="mb-3 text-sm font-medium text-slate-800">{q.question}</p>
                {q.choices && q.choices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {q.choices.map((c: string, ci: number) => (
                      <button
                        key={ci}
                        onClick={() => setAnswer(q.index, c)}
                        className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                          answers[q.index] === c
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    value={answers[q.index] || ""}
                    onChange={(e) => setAnswer(q.index, e.target.value)}
                    placeholder="답을 입력하세요"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                  />
                )}
              </div>
            ))}
            <button
              onClick={submit}
              disabled={step === "submitting"}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
            >
              {step === "submitting" && <Loader2 size={15} className="animate-spin" />}
              {step === "submitting" ? "채점 중..." : "제출하기"}
            </button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
              <p className="text-sm text-slate-500">{studentName}님의 점수</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{result.score}점</p>
              <p className="mt-1 text-xs text-slate-400">
                {result.correctCount} / {result.total}개 정답
              </p>
            </div>
            {result.results.map((r: SubmitResultItem) => (
              <div
                key={r.index}
                className={`rounded-xl border p-4 ${
                  r.isCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {r.isCorrect ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    <XCircle size={16} className="text-rose-500" />
                  )}
                  <p className="text-sm font-medium text-slate-800">{r.question}</p>
                </div>
                {!r.isCorrect && (
                  <p className="text-xs text-slate-500">
                    내 답: {r.studentAnswer || "(미입력)"} · 정답:{" "}
                    <span className="font-medium">{r.correctAnswer}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">{r.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}