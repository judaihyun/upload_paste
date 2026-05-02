// app/(auth)/layout.tsx
import SessionManager from "@/components/SessionManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "보안 인증",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        // 💡 GlobalNav나 SessionManager 없이 순수하게 자식 컴포넌트만 렌더링합니다.
        <div className="min-h-screen bg-slate-50 overflow-y-scroll">
            <SessionManager />
            {children}
        </div>
    );
}
