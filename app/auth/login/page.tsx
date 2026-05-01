// app/auth/login/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        // 💡 실제로는 여기서 Oauth 제공자(Google, Kakao)로 리다이렉트 됩니다.

        // 여기서는 테스트를 위해 1초 뒤에 우리 자체 콜백 페이지로 넘깁니다.
        const timer = setTimeout(() => {
            router.push("/auth/callback?code=fake_auth_code_123");
        }, 1000);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-600 font-medium">로그인 서버로 이동 중입니다...</p>
            </div>
        </div>
    );
}
