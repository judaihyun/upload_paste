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
        </div>
    );
}
