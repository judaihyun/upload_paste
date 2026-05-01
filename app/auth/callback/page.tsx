// app/login-callback/page.tsx
"use client";
import { useEffect, useState } from "react";

type AuthStep = "loading" | "success" | "error";

export default function CallbackPage() {
    const [step, setStep] = useState<AuthStep>("loading");

    useEffect(() => {
        const processAuth = async () => {
            try {
                // UI를 보여주기 위해 의도적으로 0.8초 대기
                await new Promise(resolve => setTimeout(resolve, 800));

                // 💡 API 경로가 /api/auth/token이 맞는지 확인해 주세요.
                // 만약 API 경로도 다르게 만드셨다면 여기를 수정해야 합니다.
                const res = await fetch("/api/auth/token", { method: "POST" });
                if (!res.ok) throw new Error("토큰 발급 실패");

                setStep("success");

                // 성공 화면을 1.2초간 띄워준 뒤 창 닫기
                setTimeout(() => {
                    if (window.opener) {
                        window.opener.postMessage({ type: "AUTH_SUCCESS" }, window.location.origin);
                        window.close();
                    } else {
                        window.location.href = "/";
                    }
                }, 1200);
            } catch (err) {
                console.error(err);
                setStep("error");
            }
        };

        processAuth();
    }, []);

    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-800">
            <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-center px-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                    세션 갱신 (Session Update)
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                {step === "loading" && (
                    <>
                        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 mb-2">
                            로그인 정보를 갱신 중입니다
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            새로운 보안 토큰을 발급받고 있습니다...
                        </p>
                    </>
                )}

                {step === "success" && (
                    <div className="animate-in zoom-in-50 duration-300">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-green-200">
                            <svg
                                className="w-8 h-8 text-green-600 animate-in slide-in-from-bottom-2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
                            연장 완료!
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">
                            인증이 갱신되었습니다.
                            <br />
                            잠시 후 창이 자동으로 닫힙니다.
                        </p>
                    </div>
                )}

                {step === "error" && (
                    <>
                        {/* 에러 UI 생략 (이전 답변과 동일) */}
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 mb-2">
                            연장에 실패했습니다
                        </h1>
                        <button
                            onClick={() => window.close()}
                            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
                        >
                            창 닫기
                        </button>
                    </>
                )}
            </main>
        </div>
    );
}
