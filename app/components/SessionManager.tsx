// components/SessionManager.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { AUTH_EXPIRED_EVENT } from "@/utils/fetchClient";

export default function SessionManager() {
    const [isExpired, setIsExpired] = useState(false);

    // [1] 단일 쿠키(access_token) 존재 여부 검사
    const checkAccessToken = useCallback(() => {
        const hasToken = document.cookie.includes("access_token=");

        if (!hasToken && !isExpired) {
            console.log("Access Token 만료 또는 삭제 감지됨!");
            setIsExpired(true);
        }
    }, [isExpired]);

    // [2] 감지기 등록 (타이머 + 화면 포커스 감지)
    useEffect(() => {
        checkAccessToken();

        const handleVisibility = () => {
            if (document.visibilityState === "visible") checkAccessToken();
        };

        window.addEventListener("focus", checkAccessToken);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("focus", checkAccessToken);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [checkAccessToken]);

    // [3] API 통신 중 401 에러 감지망 (백업)
    useEffect(() => {
        const handleForceExpire = () => setIsExpired(true);
        window.addEventListener(AUTH_EXPIRED_EVENT, handleForceExpire);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleForceExpire);
    }, []);

    // [4] 새 창(팝업)에서 연장 성공 신호 수신
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === "AUTH_SUCCESS") {
                setIsExpired(false);
                // 💡 팝업이 닫힌 후 즉시 토큰 상태 재점검
                checkAccessToken();
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [checkAccessToken]);

    const handleExtendLogin = () => {
        const w = 500,
            h = 600;
        const left = window.screen.width / 2 - w / 2;
        const top = window.screen.height / 2 - h / 2;
        window.open("/auth/login", "AuthPopup", `width=${w},height=${h},top=${top},left=${left}`);
    };

    return (
        <>
            {isExpired && (
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95">
                        <div className="text-center space-y-4">
                            <div className="text-5xl">⏰</div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                                로그인 만료
                            </h2>
                            <p className="text-sm text-slate-500 font-medium">
                                안전한 사용을 위해 로그인이 만료되었습니다.
                                <br />
                                진행 중인 작업을 잃지 않으려면 연장해주세요.
                            </p>
                            <button
                                onClick={handleExtendLogin}
                                className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
                            >
                                로그인 연장하기 ⚡
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
