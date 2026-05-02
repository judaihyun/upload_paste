"use client";
import React, { useState, useRef, useEffect } from "react";
import Console, { MemoryStats } from "@/components/Console";
import CellRenderer from "@/components/CellRenderer";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import Sidebar from "@/components/Sidebar";
import { useMultiFileParser } from "@/hooks/useMultiFileParser";

ModuleRegistry.registerModules([AllCommunityModule]);

export interface FileEntry {
    id: string;
    name: string;
    size: number;
    status: "waiting" | "processing" | "completed" | "error";
    progress: number; // Sidebar 하위 호환성을 위해 타입은 남겨둡니다
    parseTime: number | null;
    totalTime: number | null;
    allSheetsData?: Record<string, any[][]>;
    sheetNames: string[];
}

export default function MultiTestBed() {
    const [fileQueue, setFileQueue] = useState<FileEntry[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [activeSheet, setActiveSheet] = useState<string>("");
    const [gridData, setGridData] = useState<any[][]>([]);
    const [isSwitching, setIsSwitching] = useState(false);
    const renderStartTimeRef = useRef<number>(0);
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

    // 💡 1. currentStageMessage 구조 분해 할당 추가
    const { addFiles, cancelFile, isParsing, currentStageMessage } = useMultiFileParser({
        onQueueUpdate: updatedQueue => setFileQueue(updatedQueue),
        onFileComplete: (fileId, result) => {
            setFileQueue(prev =>
                prev.map(f =>
                    f.id === fileId
                        ? {
                              ...f,
                              allSheetsData: result.allSheetsData,
                              sheetNames: result.sheetNames,
                              parseTime: result.parseTime,
                          }
                        : f,
                ),
            );

            if (!activeFileId) handleFileSelect(fileId);
        },
    });

    const activeFile = fileQueue.find(f => f.id === activeFileId);

    const handleFileSelect = (fileId: string) => {
        const file = fileQueue.find(f => f.id === fileId);
        if (!file || file.status !== "completed" || isSwitching) return;

        setIsSwitching(true);
        setActiveFileId(fileId);
        const firstSheet = file.sheetNames[0];
        setActiveSheet(firstSheet);
        setGridData([]);

        setTimeout(() => {
            if (!file.totalTime) renderStartTimeRef.current = performance.now();
            setGridData(file.allSheetsData?.[firstSheet] || []);
        }, 50);
    };

    const handleSheetChange = (sheetName: string) => {
        if (!activeFile || isSwitching) return;
        setIsSwitching(true);
        setActiveSheet(sheetName);
        setGridData([]);

        setTimeout(() => {
            setGridData(activeFile.allSheetsData?.[sheetName] || []);
        }, 50);
    };

    const handleRenderComplete = () => {
        if (renderStartTimeRef.current > 0 && activeFile) {
            const renderTime = performance.now() - renderStartTimeRef.current;
            setFileQueue(prev =>
                prev.map(f =>
                    f.id === activeFileId
                        ? {
                              ...f,
                              totalTime: (f.parseTime || 0) + renderTime,
                          }
                        : f,
                ),
            );
            renderStartTimeRef.current = 0;
        }
        setIsSwitching(false);
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
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans text-gray-900">
            <Sidebar
                queue={fileQueue}
                activeId={activeFileId}
                onUpload={addFiles}
                onSelect={handleFileSelect}
                onDelete={id => {
                    cancelFile(id);
                    if (activeFileId === id) {
                        setActiveFileId(null);
                        setGridData([]);
                    }
                }}
            />

            {/* 우측 메인 영역을 relative로 설정하여 글로벌 상태 바의 기준점으로 삼습니다 */}
            <main className="flex-grow flex flex-col min-w-0 bg-white shadow-inner relative">
                {/* 💡 2. 글로벌 파싱 상태 표시 바 (플로팅 UI) */}
                {isParsing && currentStageMessage && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[100] bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-6 duration-300 border border-slate-700">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span className="font-bold text-sm tracking-wide text-blue-50">
                            {currentStageMessage}
                        </span>
                    </div>
                )}

                <Console isParsing={isParsing} memoryStats={memoryStats} />

                {activeFile ? (
                    <>
                        <header className="p-5 border-b bg-white flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-extrabold flex items-center gap-2">
                                    <span className="text-blue-600">📄</span> {activeFile.name}
                                </h2>
                                <div className="flex gap-4 mt-1 text-sm text-gray-500 font-medium">
                                    <span>
                                        Size: {(activeFile.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                    {activeFile.totalTime && (
                                        <span className="text-emerald-600 font-bold">
                                            ⏱️ Initial Load:{" "}
                                            {(activeFile.totalTime / 1000).toFixed(2)}s
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {activeFile.sheetNames.map(name => (
                                    <button
                                        key={name}
                                        onClick={() => handleSheetChange(name)}
                                        className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                                            activeSheet === name
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="flex-grow relative bg-gray-50 p-4">
                            {isSwitching && (
                                <div className="absolute inset-0 z-50 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                                        <span className="text-blue-600 font-black text-sm animate-pulse tracking-widest">
                                            SYNCING DATA...
                                        </span>
                                    </div>
                                </div>
                            )}
                            <div className="w-full h-full border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                <CellRenderer
                                    isSwitching={isSwitching}
                                    key={`${activeFileId}-${activeSheet}`}
                                    data={gridData}
                                    onRenderComplete={handleRenderComplete}
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                        <div className="text-6xl animate-bounce">📁</div>
                        <p className="text-lg font-bold">
                            좌측 메뉴에서 파일을 업로드하거나 목록에서 선택하세요.
                        </p>
                        <p className="text-sm opacity-60">Excel, CSV 대용량 병렬 파싱 지원</p>
                    </div>
                )}
            </main>
        </div>
    );
}
