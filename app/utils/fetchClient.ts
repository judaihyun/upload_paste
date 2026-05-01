// utils/fetchClient.ts

// 컴포넌트 간 통신을 위한 커스텀 이벤트
export const AUTH_EXPIRED_EVENT = "AUTH_EXPIRED";

export async function fetchClient(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
        ...options,
        // HttpOnly 쿠키 전송 필수
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    // 💡 middleware.ts 또는 실제 백엔드 서버에서 401이 떨어지면 감지
    if (response.status === 401) {
        console.warn("API 요청 거부됨 (401). 세션 만료 이벤트를 발생시킵니다.");

        // 이 이벤트를 SessionManager가 듣고 팝업을 띄움
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        }

        throw new Error("Unauthorized");
    }

    return response;
}
