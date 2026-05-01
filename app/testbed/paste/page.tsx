"use client";
import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import CellRenderer from "@/components/CellRenderer";
import PasteModal from "@/components/PasteModal";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import Console, { MemoryStats } from "@/components/Console";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function PasteTestPage() {
    const [pastedData, setPastedData] = useState<{ name: string; data: any[][] } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

    // 💡 1. 팝업에서 파싱된 데이터를 받았을 때 (Preview)
    const handleDataParsed = (data: any[][], fileName: string) => {
        setPastedData({ name: fileName, data });
    };

    // 💡 2. 최종 서버 제출 (Multipart/form-data)
    const handleSubmit = async () => {
        if (!pastedData) return;
        setIsSubmitting(true);

        try {
            // 원시 배열을 CSV 파일 객체로 포장
            const csvString = Papa.unparse(pastedData.data);
            const blob = new Blob([csvString], { type: "text/csv" });
            const virtualFile = new File([blob], pastedData.name, { type: "text/csv" });

            const formData = new FormData();
            formData.append("file", virtualFile);

            // API 호출 시뮬레이션
            console.log("🚀 서버로 전송할 파일명:", virtualFile.name);
            console.log("📊 데이터 크기:", (blob.size / 1024).toFixed(2), "KB");
            await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            alert("서버에 가상 파일이 성공적으로 전달되었습니다.");
            setPastedData(null); // 전송 후 초기화
        } catch (err) {
            alert("전송 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const checkMemory = () => {
            const perf = performance as any;
            if (perf.memory) {
                setMemoryStats({
                    used: perf.memory.usedJSHeapSize,
                    total: perf.memory.totalJSHeapSize,
                    limit: perf.memory.jsHeapSizeLimit,
                });
            }
        };
        const interval = setInterval(checkMemory, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-50 font-sans">
            {/* 상단 GNB 영역 */}
            <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-black text-gray-900 tracking-tight">PASTE LAB</h1>
                    {pastedData && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm font-bold text-gray-500 truncate max-w-[200px]">
                                {pastedData.name} (미리보기 중)
                            </span>
                        </div>
                    )}
                </div>
                <textarea />

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                        <span>📋</span> 표 다시 붙여넣기
                    </button>

                    {pastedData && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-5 py-2 bg-blue-600 text-white text-sm font-black rounded-lg shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isSubmitting ? "전송 중..." : "최종 제출하기 🚀"}
                        </button>
                    )}
                </div>
                <Console isParsing={false} memoryStats={memoryStats} />
            </header>

            {/* 메인 미리보기 영역 */}
            <main className="flex-grow p-6 overflow-hidden">
                <div className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
                    {pastedData ? (
                        <CellRenderer
                            isSwitching={false}
                            key={`preview-${pastedData.name}`}
                            data={pastedData.data}
                            onRenderComplete={() => {}}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <div className="p-6 bg-gray-50 rounded-full text-4xl">⌨️</div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-600">
                                    표 데이터를 기다리고 있습니다.
                                </p>
                                <p className="text-sm">
                                    우측 상단의 버튼을 눌러 데이터를 붙여넣으세요.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* 입력 모달 */}
            <PasteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDataParsed={handleDataParsed}
            />
        </div>
    );
}
