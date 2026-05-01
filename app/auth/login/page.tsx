// app/login/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // 💡 1.5초 대기 후 정확히 /login-callback 으로 이동합니다.
        const timer = setTimeout(() => {
            router.push("/auth/callback?code=secure_auth_code_2026");
        }, 1500);

        return () => clearTimeout(timer);
    }, [router]);

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
                    보안 로그인 (Secure Auth)
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-white rounded-full p-4 shadow-lg border border-slate-100">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                </div>

                <h1 className="text-xl font-black tracking-tight text-slate-900 mb-2">
                    인증 서버로 연결 중입니다
                </h1>
                <p className="text-sm text-slate-500 font-medium max-w-[260px] leading-relaxed">
                    안전한 데이터 처리를 위해
                    <br />
                    보안 연결을 설정하고 있습니다. 잠시만 기다려주세요.
                </p>
            </main>
        </div>
    );
}
