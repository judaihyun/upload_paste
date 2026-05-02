"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import CellRenderer from "@/components/CellRenderer";
import PasteModal from "@/components/PasteModal";
import Console, { MemoryStats } from "@/components/Console";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function PasteTestPage() {
    const [previewInfo, setPreviewInfo] = useState<{
        name: string;
        rowCount: number;
        colCount: number;
    } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState<string>("");
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

    const dataRef = useRef<any[][]>([]);

    const handleDataParsed = useCallback((data: any[][], fileName: string) => {
        dataRef.current = data;
        const maxCols =
            data.length > 0 ? Math.max(...data.slice(0, 100).map(row => row.length)) : 0;

        setPreviewInfo({
            name: fileName,
            rowCount: data.length,
            colCount: maxCols,
        });
        setIsModalOpen(false);
    }, []);

    const handleSubmit = async () => {
        if (!dataRef.current.length || !previewInfo) return;

        setIsSubmitting(true);
        setSubmitStage("데이터 압축 중...");

        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const csvString = Papa.unparse(dataRef.current);
            const blob = new Blob([csvString], { type: "text/csv" });
            const virtualFile = new File([blob], previewInfo.name, { type: "text/csv" });

            setSubmitStage("서버로 전송 중...");
            await new Promise(resolve => setTimeout(resolve, 10));

            const formData = new FormData();
            formData.append("file", virtualFile);

            await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            alert("서버에 가상 파일이 성공적으로 제출되었습니다.");

            dataRef.current = [];
            setPreviewInfo(null);
        } catch (err) {
            console.error(err);
            alert("전송 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
            setSubmitStage("");
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
        const interval = setInterval(checkMemory, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
            {/* 💡 수정됨: 헤더 높이를 유동적으로(min-h-[64px]) 바꾸고 padding 조정 */}
            <header className="min-h-[64px] py-3 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10 shrink-0 gap-4">
                {/* 좌측: 타이틀 및 프리뷰 정보 */}
                <div className="flex items-center gap-6 min-w-0">
                    <h1 className="text-xl font-black tracking-tighter text-slate-800 shrink-0 whitespace-nowrap">
                        PASTE LAB
                    </h1>

                    {previewInfo && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3 min-w-0">
                            <div className="h-4 w-px bg-slate-200 shrink-0" />
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none shrink-0">
                                    PREVIEW
                                </span>
                                {/* 💡 수정됨: 파일명은 길어지면 ... 처리되도록 쪼개고, 행/열 정보는 절대 안 찌그러지게 보호(shrink-0) */}
                                <span className="text-sm font-bold text-slate-600 truncate max-w-[200px]">
                                    {previewInfo.name}
                                </span>
                                <span className="text-xs font-mono text-slate-400 shrink-0 whitespace-nowrap">
                                    ({previewInfo.rowCount.toLocaleString()} Rows ×{" "}
                                    {previewInfo.colCount} Cols)
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 우측: 액션 버튼들 */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* ❌ 💡 수정됨: 여기에 있던 <Console /> 컴포넌트를 아래의 <main> 영역 안으로 이동시켰습니다. */}

                    <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isSubmitting}
                        className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-200 disabled:opacity-50 whitespace-nowrap"
                    >
                        <span>📋</span> 표 데이터 붙여넣기
                    </button>

                    {previewInfo && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`h-10 px-5 bg-blue-600 text-white text-sm font-black rounded-lg shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 whitespace-nowrap
                                ${isSubmitting ? "opacity-90 cursor-wait bg-blue-700" : "hover:bg-blue-700 active:scale-95"}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    {submitStage}
                                </>
                            ) : (
                                "서버로 최종 제출 🚀"
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* 메인 렌더링 영역 */}
            <main className="flex-grow p-6 overflow-hidden flex flex-col min-h-0 relative">
                {/* 💡 수정됨: Console 컴포넌트는 메인 영역에서 독립적으로 Floating 되도록 이동 */}
                <Console isParsing={false} memoryStats={memoryStats} />

                <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-inner overflow-hidden relative flex flex-col">
                    {previewInfo ? (
                        <CellRenderer
                            isSwitching={false}
                            key={`preview-${previewInfo.name}`}
                            data={dataRef.current}
                            onRenderComplete={() => {}}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-6">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-5xl shadow-inner border border-slate-100">
                                ⌨️
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-lg font-bold text-slate-600">
                                    붙여넣은 표 데이터가 없습니다.
                                </p>
                                <p className="text-sm text-slate-400 font-medium">
                                    우측 상단의 버튼을 눌러 Excel이나 CSV 데이터를 붙여넣어 보세요.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <PasteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDataParsed={handleDataParsed}
            />
        </div>
    );
}
