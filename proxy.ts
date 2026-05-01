import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
    const hasToken = request.cookies.has("access_token");
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith("/protected")) {
        return NextResponse.next();
    }

    // 💡 경로 검사 변수 추가
    const isAuthPath = pathname.startsWith("/auth"); // 로그인 화면들
    const isAuthApi = pathname.startsWith("/api/auth"); // 로그인 처리/토큰 발급 API

    // 🚀 수정된 부분: 화면뿐만 아니라 인증 API도 무사 통과시킵니다.
    if (isAuthPath || isAuthApi) {
        return NextResponse.next();
    }

    // --- 아래는 기존과 동일 ---
    const isApi = pathname.startsWith("/api");

    if (!hasToken) {
        if (isApi) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// 미들웨어가 실행될 경로 지정 (원하는 대로 최적화)
export const config = {
    matcher: [
        /*
         * 매치 제외 목록:
         * - api/auth (인증 관련 API)
         * - _next/static (정적 파일)
         * - _next/image (이미지 최적화)
         * - favicon.ico (파비콘)
         */
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
