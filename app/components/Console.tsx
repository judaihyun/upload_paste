import { useFPS } from "@/hooks/useFPS";
import React, { useEffect, useRef } from "react";

export interface MemoryStats {
    used: number;
    total: number;
    limit: number;
}

interface ConsoleProps {
    memoryStats: MemoryStats | null;
    isParsing: boolean;
}

export default function Console({ memoryStats, isParsing }: ConsoleProps) {
    const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
    const fps = useFPS();

    // FPS 수치에 따른 색상 시각화 (60 방어 여부)
    const getFpsColor = (currentFps: number) => {
        if (currentFps === 0) return "text-slate-500"; // 초기 로딩
        if (currentFps >= 55) return "text-green-400"; // 정상 (60fps 방어)
        if (currentFps >= 30) return "text-yellow-400"; // 경고 (버벅임 시작)
        return "text-red-500"; // 크리티컬 (메인 스레드 블로킹 심각)
    };

    return (
        <div className="mt-5">
            {/* 1. 실시간 메모리 대시보드 */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-800 m-0 flex items-center gap-2">
                        📊 V8 JS 메모리 모니터
                    </h4>

                    {isParsing && (
                        <span className="text-sm font-bold text-blue-600 animate-pulse">
                            파싱 진행 중... (UI 블로킹 유의)
                        </span>
                    )}
                </div>

                {memoryStats ? (
                    <div className="flex gap-6 text-sm text-gray-700">
                        <div>
                            <span className="font-medium">사용 중: </span>
                            <span className="font-bold text-red-500">
                                {formatMB(memoryStats.used)} MB
                            </span>
                        </div>
                        <div>
                            <span className="font-medium">할당됨: </span>
                            <span>{formatMB(memoryStats.total)} MB</span>
                        </div>
                        <div>
                            <span className="font-medium">한계: </span>
                            <span className="text-gray-500">{formatMB(memoryStats.limit)} MB</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 m-0">
                        Chrome 환경에서만 메모리 측정이 가능합니다.
                    </p>
                )}
            </div>
            <div className="fixed bottom-4 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 shadow-2xl backdrop-blur-sm z-[9999] font-mono text-sm flex flex-col gap-2 pointer-events-none">
                <div className="text-slate-400 text-xs font-bold mb-1">⚙️ SYSTEM CONSOLE</div>

                <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-300">RENDER FPS</span>
                    <span className={`font-black ${getFpsColor(fps)}`}>
                        {fps === 0 ? "--" : fps}{" "}
                        <span className="text-xs font-normal opacity-70">fps</span>
                    </span>
                </div>

                {/* 향후 워커 상태나 파싱 큐 상태를 여기에 추가할 수 있습니다 */}
            </div>
        </div>
    );
}
