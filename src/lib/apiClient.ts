// src/lib/apiClient.ts
// 쌤툴 통합 API 호출 래퍼 (Task 5: JSON 반환 검증 및 분필 부족 에러 표준 처리)

export class AppError extends Error {
  code: string;
  data?: unknown;

  constructor(code: string, message: string, data?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.data = data;
  }
}

export async function apiCall<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") ?? "";

  // 서버가 500/404 등으로 Next.js 기본 HTML 페이지를 반환하는 경우 파싱 크래시 예방
  if (!contentType.includes("application/json")) {
    throw new AppError(
      "SERVER_ERROR",
      "일시적인 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
  }

  const data = await res.json();

  if (!res.ok) {
    const errorCode = data.code || data.error || "UNKNOWN_ERROR";
    const errorMessage =
      typeof data.error === "string"
        ? data.error
        : "요청 처리에 실패했습니다.";
    throw new AppError(errorCode, errorMessage, data);
  }

  return data as T;
}
