"use client";
import React, { useState, useEffect, useRef } from "react";
import Console, { MemoryStats } from "@/components/Console";
import CellRenderer from "@/components/CellRenderer";
// import ProgressBar from "./ProgressBar"; // 💡 삭제 가능: 더 이상 무거운 프로그레스 바를 쓰지 않습니다.
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { useFileParser } from "@/hooks/useFileParser";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function TestBed() {
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);

    const [timing, setTiming] = useState<{ parse: number; render: number; total: number } | null>(
        null,
    );
    const renderStartTimeRef = useRef<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [gridData, setGridData] = useState<any[][]>([]);
    const [fileMeta, setFileMeta] = useState<{ name: string; sizeMB: string } | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [activeSheet, setActiveSheet] = useState<string>("");
    const [sheetDataCache, setSheetDataCache] = useState<Record<string, any[][]>>({});

    // 💡 1. progress 대신 currentStageMessage를 구조 분해 할당으로 가져옵니다.
    const { isParsing, currentStageMessage, parseFile, cancelParsing } = useFileParser({
        onSuccess: ({ allSheetsData, parseTime, sheetNames }) => {
            setTiming({ parse: parseTime, render: 0, total: 0 });
            renderStartTimeRef.current = performance.now();

            setSheetDataCache(allSheetsData);
            setSheetNames(sheetNames);
            setActiveSheet(sheetNames[0]);
            setIsSwitching(true);

            setTimeout(() => {
                renderStartTimeRef.current = performance.now();
                setGridData(allSheetsData[sheetNames[0]]);
            }, 50);
        },
        onError: errMsg => {
            alert(`시스템 에러: ${errMsg}`);
            handleReset();
        },
    });

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

    const getStats = () => {
        if (!gridData || gridData.length === 0) return { rows: 0, cols: 0 };
        let maxCols = 0;
        for (let i = 0; i < gridData.length; i++) {
            const len = gridData[i]?.length || 0;
            if (len > maxCols) maxCols = len;
        }
        return { rows: gridData.length, cols: maxCols };
    };
    const stats = getStats();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX_FILE_SIZE = 2048 * 1024 * 1024; // 2GB
        if (file.size > MAX_FILE_SIZE) {
            alert(`파일이 너무 큽니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        handleReset();
        setFileMeta({ name: file.name, sizeMB: (file.size / 1024 / 1024).toFixed(2) });
        parseFile(file);
    };

    const handleSheetClick = (sheetName: string) => {
        if (isParsing || isSwitching || activeSheet === sheetName) return;

        setIsSwitching(true);
        setActiveSheet(sheetName);
        setGridData([]);

        setTimeout(() => {
            setGridData(sheetDataCache[sheetName] || []);
        }, 50);
    };

    const handleCancel = () => {
        cancelParsing();
        handleReset();
    };

    const handleReset = () => {
        setGridData([]);
        setSheetNames([]);
        setSheetDataCache({});
        setTiming(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRenderComplete = () => {
        if (renderStartTimeRef.current > 0) {
            const renderTime = performance.now() - renderStartTimeRef.current;
            setTiming(prev => {
                if (prev && prev.render === 0) {
                    return {
                        ...prev,
                        render: renderTime,
                        total: prev.parse + renderTime,
                    };
                }
                return prev;
            });
            renderStartTimeRef.current = 0;
        }
        setIsSwitching(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto font-sans flex flex-col h-screen ">
            <div className="shrink-0 space-y-4">
                <header>
                    <h2 className="text-2xl font-bold text-gray-800">🧪 성능 최적화 실험 베드</h2>
                    <p className="text-gray-500 text-sm">
                        Large-scale Data I/O Performance Analysis
                    </p>
                </header>

                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            테스트 파일 업로드 (Max 2GB)
                        </label>
                        {/* 기존에 있던 취소 버튼 위치를 아래쪽 Status Bar로 통합하여 헤더를 깔끔하게 유지합니다. */}
                    </div>

                    <input
                        type="file"
                        accept=".xlsx, .csv"
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        disabled={isParsing}
                        className="block w-full text-sm text-gray-500 mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />

                    {/* 💡 2. 프로그레스 바를 대체하는 심플한 텍스트 기반 상태 표시기 */}
                    {isParsing && (
                        <div className="mt-3 flex items-center justify-between bg-blue-50/50 border border-blue-100 px-4 py-3 rounded-md animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                <span className="text-sm font-bold text-blue-800">
                                    {currentStageMessage}
                                </span>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="text-xs px-3 py-1.5 bg-white text-red-600 font-bold border border-red-200 rounded hover:bg-red-50 transition-colors shadow-sm"
                            >
                                파싱 취소 🛑
                            </button>
                        </div>
                    )}
                </div>

                <Console memoryStats={memoryStats} isParsing={isParsing} />

                {!isParsing && fileMeta && (
                    <div className="pt-2 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-end">
                            <div className="flex items-center gap-3">
                                <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded leading-none uppercase">
                                    {fileMeta.name.split(".").pop()}
                                </span>
                                <h3 className="text-base font-bold text-gray-900 truncate max-w-xs">
                                    {fileMeta.name}
                                </h3>
                                <span className="text-gray-300">|</span>
                                <span className="text-sm font-medium text-gray-500">
                                    {fileMeta.sizeMB} MB
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {timing && timing.total > 0 && (
                                    <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 mr-2">
                                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-tighter">
                                            ⏱️ Initial Load
                                        </span>
                                        <span className="text-sm font-mono font-bold text-emerald-700">
                                            {(timing.total / 1000).toFixed(2)}s
                                        </span>
                                        <span className="text-xs font-mono text-emerald-600/70 hidden sm:inline">
                                            (Parse: {(timing.parse / 1000).toFixed(2)}s + Render:{" "}
                                            {(timing.render / 1000).toFixed(2)}s)
                                        </span>
                                    </div>
                                )}
                                {stats.rows > 0 && (
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-tighter">
                                            Stats
                                        </span>
                                        <span className="text-sm font-mono font-bold text-blue-700">
                                            {stats.rows.toLocaleString()}{" "}
                                            <span className="text-gray-400 font-normal">Rows</span>
                                        </span>
                                        <span className="text-gray-300">×</span>
                                        <span className="text-sm font-mono font-bold text-blue-700">
                                            {stats.cols.toLocaleString()}{" "}
                                            <span className="text-gray-400 font-normal">Cols</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex overflow-x-auto border-b border-gray-300 scrollbar-hide">
                            {sheetNames.map(sheet => (
                                <button
                                    key={sheet}
                                    onClick={() => handleSheetClick(sheet)}
                                    className={`px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-all border-b-2 
                                        ${activeSheet === sheet ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                                >
                                    {sheet}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow relative mt-2 min-h-0 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                {isSwitching && (
                    <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                            <span className="text-sm font-bold text-blue-600 font-mono tracking-wider">
                                GRID SYNCING...
                            </span>
                        </div>
                    </div>
                )}

                {!isParsing && gridData.length > 0 && (
                    <CellRenderer
                        key={activeSheet}
                        onRenderComplete={handleRenderComplete}
                        data={gridData}
                        isSwitching={isSwitching}
                    />
                )}
            </div>
        </div>
    );
}
