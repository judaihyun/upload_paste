import React from "react";

interface ProgressBarProps {
    progress: number;
    isVisible: boolean;
    label?: string; // 텍스트를 외부에서 주입할 수 있도록 확장성 부여
}

export default function ProgressBar({
    progress,
    isVisible,
    label = "대용량 데이터를 파싱 중입니다...",
}: ProgressBarProps) {
    if (!isVisible) return null;

    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-blue-600 animate-pulse">{label}</span>
                <span className="text-sm font-mono text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 shadow-inner overflow-hidden">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
}
