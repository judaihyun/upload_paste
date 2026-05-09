// components/GlobalNav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalNav() {
    const pathname = usePathname();

    // 💡 우리가 만든 3개의 페이지 경로 설정 (경로가 다르면 수정해주세요)
    const navItems = [
        { name: "단일 파일 파서", path: "/testbed" },
        { name: "다중 파일 큐 (Multi)", path: "/testbed/multi" },
        { name: "붙여넣기 랩 (Paste)", path: "/testbed/paste" }, // 또는 /testbed/paste
        { name: "서버사이드 렌더링", path: "/testbed/serverside" }, // 또는 /testbed/serverside
    ];

    // 인증 관련 팝업/콜백 화면에서는 GNB를 숨깁니다.
    if (pathname.startsWith("/auth")) return null;

    return (
        <nav className="h-14 bg-slate-900 text-white px-6 flex items-center justify-between shrink-0 shadow-md z-50 relative">
            <div className="flex items-center gap-8">
                <div className="font-black text-lg tracking-wider text-blue-400">
                    DATA<span className="text-white">LAB</span>
                </div>

                <div className="flex items-center gap-1">
                    {navItems.map(item => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    isActive
                                        ? "bg-blue-600 text-white shadow-inner"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                <span>🟢 시스템 정상</span>
            </div>
        </nav>
    );
}
