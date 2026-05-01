"use client";
import { FileEntry } from "@/(protected)/testbed/multi/page";
import React from "react";

interface SidebarProps {
    queue: FileEntry[];
    activeId: string | null;
    onUpload: (files: FileList) => void;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function Sidebar({ queue, activeId, onUpload, onSelect, onDelete }: SidebarProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
            e.target.value = ""; // 동일 파일 재업로드 가능하도록 초기화
        }
    };

    return (
        <aside className="w-80 bg-gray-900 flex flex-col h-full border-r border-gray-800 shadow-xl z-20">
            {/* 상단 업로드 버튼 섹션 */}
            <div className="p-6">
                <h1 className="text-white text-xl font-black mb-1 tracking-tight">DATA LAB</h1>
                <p className="text-gray-500 text-xs mb-6 font-medium">Multi-File Stress Test</p>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer bg-gray-800/50 hover:bg-gray-800 hover:border-blue-500 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                            📂
                        </span>
                        <p className="text-sm text-gray-400 font-bold">파일 추가</p>
                        <p className="text-[10px] text-gray-500 mt-1">XLSX, CSV (Max 5)</p>
                    </div>
                    <input
                        type="file"
                        className="hidden"
                        multiple
                        accept=".xlsx, .csv"
                        onChange={handleFileChange}
                    />
                </label>
            </div>

            {/* 파일 리스트 큐 섹션 */}
            <div className="flex-grow overflow-y-auto px-4 pb-6 space-y-3 custom-scrollbar">
                {queue.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-600 text-sm font-medium">
                            대기 중인 파일이 없습니다.
                        </p>
                    </div>
                ) : (
                    queue.map(file => (
                        <div
                            key={file.id}
                            onClick={() => file.status === "completed" && onSelect(file.id)}
                            className={`relative group p-4 rounded-xl border transition-all cursor-pointer ${
                                activeId === file.id
                                    ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20"
                                    : "bg-gray-800 border-gray-700 hover:border-gray-500"
                            } ${file.status === "processing" ? "ring-1 ring-blue-500" : ""}`}
                        >
                            <div className="flex items-center gap-3">
                                {/* 💡 좌측: Circular Progress UI */}
                                <div className="shrink-0 relative">
                                    <CircularProgress
                                        progress={file.progress}
                                        status={file.status}
                                        isActive={activeId === file.id}
                                    />
                                    {file.status === "completed" && (
                                        <div className="absolute inset-0 flex items-center justify-center text-[10px]">
                                            ✅
                                        </div>
                                    )}
                                </div>

                                {/* 💡 중앙: 파일 정보 */}
                                <div className="min-w-0 flex-grow">
                                    <h3
                                        className={`text-sm font-bold truncate ${activeId === file.id ? "text-white" : "text-gray-200"}`}
                                    >
                                        {file.name}
                                    </h3>
                                    <p
                                        className={`text-[10px] mt-0.5 font-medium ${activeId === file.id ? "text-blue-100" : "text-gray-500"}`}
                                    >
                                        {(file.size / 1024 / 1024).toFixed(1)}MB •{" "}
                                        {file.status.toUpperCase()}
                                    </p>
                                </div>

                                {/* 💡 우측: 삭제 버튼 */}
                                <button
                                    onClick={e => {
                                        e.stopPropagation();
                                        onDelete(file.id);
                                    }}
                                    className={`p-1.5 rounded-md hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity ${
                                        activeId === file.id ? "text-blue-100" : "text-gray-500"
                                    }`}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* 처리 중일 때 흐르는 바닥 광원 효과 (선택사항) */}
                            {file.status === "processing" && (
                                <div className="absolute bottom-0 left-0 h-0.5 bg-blue-400 animate-pulse w-full rounded-b-xl" />
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                    <span>System Ready</span>
                    <span>v2.0 Multi</span>
                </div>
            </div>
        </aside>
    );
}

// --- 보조 컴포넌트: Circular Progress ---
const CircularProgress = ({
    progress,
    status,
    isActive,
}: {
    progress: number;
    status: string;
    isActive: boolean;
}) => {
    const size = 36;
    const strokeWidth = 3;
    const radius = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg width={size} height={size} className="transform -rotate-90">
            {/* 배경 원 */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                className={isActive ? "text-blue-700" : "text-gray-700"}
            />
            {/* 진행 원 */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                style={{
                    strokeDashoffset: offset,
                    transition: status === "processing" ? "stroke-dashoffset 0.3s ease" : "none",
                }}
                className={`${isActive ? "text-white" : "text-blue-500"} ${status === "processing" ? "animate-pulse" : ""}`}
            />
        </svg>
    );
};
