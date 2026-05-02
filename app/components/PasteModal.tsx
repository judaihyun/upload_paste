"use client";
import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";

interface PasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDataParsed: (data: any[][], fileName: string) => void;
}

export default function PasteModal({ isOpen, onClose, onDataParsed }: PasteModalProps) {
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 💡 1. 진행률 숫자(%) 대신 텍스트 상태 메시지 도입
    const [stageMessage, setStageMessage] = useState<string>("");

    // 모달이 열릴 때 상태 초기화 및 자동 포커스
    useEffect(() => {
        if (isOpen) {
            setStageMessage("");
            setIsProcessing(false);
            setTimeout(() => textRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const hasMergedCellsInClipboard = (htmlData: string): boolean => {
        if (!htmlData) return false;
        const mergePattern = /(?:colspan|rowspan)\s*=\s*["']?(?:[2-9]|\d{2,})["']?/i;
        return mergePattern.test(htmlData);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const types = Array.from(e.clipboardData.types);

        // 1. 병합 셀 방어 로직
        if (types.includes("text/html")) {
            const htmlData = e.clipboardData.getData("text/html").slice(0, 50000);

            if (hasMergedCellsInClipboard(htmlData)) {
                alert(
                    "⚠️ 병합된 셀이 포함된 표는 붙여넣을 수 없습니다. 병합을 해제한 후 다시 복사해주세요.",
                );
                setIsProcessing(false);
                e.preventDefault();
                return;
            }
        }

        const plainText = e.clipboardData.getData("text/plain");

        if (!plainText || plainText.trim() === "") {
            alert(
                "⚠️ 붙여넣기에 실패했습니다.\n\n" +
                    "클립보드에 텍스트가 없거나 데이터가 너무 큽니다.\n\n" +
                    "대용량 데이터는 팝업을 닫고 [파일 추가] 기능을 이용해 주세요.",
            );
            setIsProcessing(false);
            return;
        }

        // 2. 검증 통과 -> 파싱 상태 진입
        setIsProcessing(true);
        setStageMessage("클립보드 데이터를 분석하고 있습니다..."); // 💡 초기 상태

        // 3. Worker 스트리밍을 위해 원시 텍스트를 가상의 File 객체로 래핑
        const file = new File([plainText], "pasted.csv", { type: "text/plain" });
        const allData: any[][] = [];

        // 4. PapaParse 내부 Worker 실행
        Papa.parse(file, {
            worker: true,
            chunkSize: 1024 * 1024 * 2, // 2MB 단위
            skipEmptyLines: true,
            chunk: results => {
                // 💡 진행률(%) 계산 및 상태 업데이트 로직 완벽 삭제 -> 리렌더링 차단
                const chunkData = results.data as any[][];
                for (let i = 0; i < chunkData.length; i++) {
                    allData.push(chunkData[i]);
                }
            },
            complete: () => {
                // 💡 [Stage 2] 파싱 완료 및 렌더링 대기
                setStageMessage("화면에 데이터를 렌더링하는 중입니다...");

                // 🚀 핵심 방어 로직: 부모 컴포넌트(TestBed)로 수십만 줄의 데이터를 넘기기 전에,
                // 브라우저가 위 메시지를 화면에 그릴 수 있도록 50ms 양보 (Event Loop Yielding)
                setTimeout(() => {
                    const virtualName = `pasted_${Date.now()}.csv`;
                    onDataParsed(allData, virtualName);
                    onClose();
                }, 50);
            },
            error: () => {
                alert("파싱 중 오류가 발생했습니다.");
                setIsProcessing(false);
            },
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                {/* 헤더 */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 tracking-tight">
                        📋 표 데이터 붙여넣기
                    </h3>
                    {!isProcessing && (
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl transition-colors"
                        >
                            &times;
                        </button>
                    )}
                </div>

                {/* 바디 */}
                <div className="p-8">
                    <div
                        className={`relative h-48 w-full rounded-xl border-2 bg-gray-50 transition-all flex flex-col items-center justify-center
                        ${isProcessing ? "border-transparent" : "border-dashed border-gray-200 focus-within:border-blue-500 focus-within:bg-white focus-within:shadow-inner"}`}
                    >
                        {isProcessing ? (
                            // 💡 최적화된 상태 표시 바 (Progress Bar 제거)
                            <div className="w-full px-12 flex flex-col items-center gap-4 animate-in zoom-in-95">
                                <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-1"></div>
                                <div className="flex flex-col items-center text-center">
                                    <span className="text-sm font-black text-blue-800 tracking-wider mb-2">
                                        {stageMessage}
                                    </span>
                                    <p className="text-xs font-bold text-gray-400">
                                        브라우저 메모리에 최적화 중입니다
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // 입력 대기 (Textarea) UI
                            <>
                                <textarea
                                    ref={textRef}
                                    onPaste={handlePaste}
                                    className="absolute inset-0 w-full h-full p-4 bg-transparent resize-none focus:outline-none text-center pt-16 text-gray-400 font-medium"
                                    placeholder="여기를 클릭하고 Ctrl+V를 누르세요"
                                />
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2">
                                    <span className="text-3xl opacity-40">📄</span>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                        Editor Mode
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
