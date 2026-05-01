"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import CellRenderer from "@/components/CellRenderer";
import PasteModal from "@/components/PasteModal";
import Console, { MemoryStats } from "@/components/Console";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function PasteTestPage() {
    // 💡 렌더링 최적화: 대용량 데이터 원본은 Ref에, UI용 메타정보만 State에 저장
    const [previewInfo, setPreviewInfo] = useState<{
        name: string;
        rowCount: number;
        colCount: number;
    } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

    const dataRef = useRef<any[][]>([]);

    // 💡 1. 팝업에서 파싱 완료된 데이터를 수신 (Preview)
    const handleDataParsed = useCallback((data: any[][], fileName: string) => {
        dataRef.current = data;

        // 실제 데이터의 최대 열(Column) 개수 계산
        const maxCols =
            data.length > 0 ? Math.max(...data.slice(0, 100).map(row => row.length)) : 0;

        setPreviewInfo({
            name: fileName,
            rowCount: data.length,
            colCount: maxCols,
        });
        setIsModalOpen(false);
    }, []);

    // 💡 2. 최종 서버 제출 (Multipart/form-data 가상 파일화)
    const handleSubmit = async () => {
        if (!dataRef.current.length || !previewInfo) return;

        // "전송 중..." UI를 즉시 반영하기 위해 상태 변경
        setIsSubmitting(true);

        // 🚀 브라우저 메인 스레드에 렌더링 기회를 준 뒤 무거운 작업 시작 (requestAnimationFrame 사용)
        requestAnimationFrame(async () => {
            try {
                // 80MB 기준 약 2~3초 소요 (현실적 타협안)
                const csvString = Papa.unparse(dataRef.current);
                const blob = new Blob([csvString], { type: "text/csv" });
                const virtualFile = new File([blob], previewInfo.name, { type: "text/csv" });

                const formData = new FormData();
                formData.append("file", virtualFile);

                console.log(
                    `🚀 서버 전송 시작: ${virtualFile.name} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`,
                );
                console.log("준비된 FormData:", formData.get("file"));
                // API 호출 시뮬레이션 (실제 엔드포인트에 맞춰 수정 가능)
                await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                alert("서버에 가상 파일이 성공적으로 제출되었습니다.");

                // 전송 완료 후 상태 초기화
                dataRef.current = [];
                setPreviewInfo(null);
            } catch (err) {
                console.error(err);
                alert("전송 중 오류가 발생했습니다.");
            } finally {
                setIsSubmitting(false);
            }
        });
    };

    // 💡 3. 메모리 실시간 모니터링 (V8 전용)
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
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
            {/* 상단 GNB / 컨트롤바 */}
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10 shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="text-xl font-black tracking-tighter text-slate-800">
                        PASTE LAB
                    </h1>

                    {previewInfo && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-3">
                            <div className="h-4 w-px bg-slate-200" />
                            <div className="flex items-center gap-2">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none">
                                    PREVIEW
                                </span>
                                <span className="text-sm font-bold text-slate-600 truncate max-w-[240px]">
                                    {previewInfo.name}
                                </span>
                                <span className="text-xs font-mono text-slate-400">
                                    ({previewInfo.rowCount.toLocaleString()} Rows ×{" "}
                                    {previewInfo.colCount} Cols)
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Console isParsing={false} memoryStats={memoryStats} />

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-200"
                    >
                        <span>📋</span> 표 데이터 붙여넣기
                    </button>

                    {previewInfo && (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`px-5 py-2 bg-blue-600 text-white text-sm font-black rounded-lg shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 flex items-center gap-2 
                                ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    전송 중...
                                </>
                            ) : (
                                "서버로 최종 제출 🚀"
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* 메인 렌더링 영역 */}
            <main className="flex-grow p-6 overflow-hidden flex flex-col min-h-0">
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

            {/* 입력 모달 (비즈니스 로직 분리) */}
            <PasteModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDataParsed={handleDataParsed}
            />
        </div>
    );
}
