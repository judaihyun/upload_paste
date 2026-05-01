// app/auth/callback/page.tsx
"use client";
import { useEffect, useState } from "react";

export default function CallbackPage() {
    const [status, setStatus] = useState("인증 처리 중...");

    useEffect(() => {
        const processAuth = async () => {
            try {
                // 1. API Route를 호출하여 실제 쿠키 세팅
                const res = await fetch("/api/auth/token", { method: "POST" });
                if (!res.ok) throw new Error("토큰 발급 실패");

                setStatus("인증 성공! 창이 닫힙니다.");

                // 💡 2. 부모 창(나를 연 창)에게 성공 메시지 발송
                // window.opener가 존재한다면 팝업으로 열렸다는 뜻입니다.
                if (window.opener) {
                    // 보안을 위해 targetOrigin을 구체적으로 지정하는 것이 좋습니다 (여기서는 * 사용)
                    window.opener.postMessage({ type: "AUTH_SUCCESS" }, window.location.origin);

                    // 메시지가 전송될 약간의 틈을 준 뒤 창 닫기
                    setTimeout(() => window.close(), 100);
                } else {
                    // 팝업이 아니라 직접 접근한 경우 홈으로 돌려보냅니다.
                    window.location.href = "/";
                }
            } catch (err) {
                setStatus("인증 중 오류가 발생했습니다.");
            }
        };

        processAuth();
    }, []);

    return (
        <div className="flex h-screen items-center justify-center bg-white">
            <h1 className="text-xl font-bold text-gray-800">{status}</h1>
        </div>
    );
}
