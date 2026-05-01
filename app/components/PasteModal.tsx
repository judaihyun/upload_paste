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
    const [progress, setProgress] = useState(0);

    // 모달이 열릴 때 상태 초기화 및 자동 포커스
    useEffect(() => {
        if (isOpen) {
            setProgress(0);
            setIsProcessing(false);
            // 모달 애니메이션이 끝날 즈음 포커스 부여
            setTimeout(() => textRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // 💡 HTML 메타데이터에서 병합된 셀(colspan/rowspan >= 2)을 감지하는 함수
    const hasMergedCellsInClipboard = (htmlData: string): boolean => {
        if (!htmlData) return false;
        // 엑셀 등에서 복사된 HTML 테이블 내에 값이 2 이상인 colspan 또는 rowspan이 존재하는지 스캔
        const mergePattern = /(?:colspan|rowspan)\s*=\s*["']?(?:[2-9]|\d{2,})["']?/i;
        return mergePattern.test(htmlData);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const types = Array.from(e.clipboardData.types);

        // 1. 병합 셀 방어 로직 (HTML 메타데이터 스캔)
        if (types.includes("text/html")) {
            // 성능 방어를 위해 HTML 텍스트를 앞의 5만 자까지만 자름 (정규식 병목 방지)
            const htmlData = e.clipboardData.getData("text/html").slice(0, 50000);

            if (hasMergedCellsInClipboard(htmlData)) {
                alert(
                    "⚠️ 병합된 셀이 포함된 표는 붙여넣을 수 없습니다. 병합을 해제한 후 다시 복사해주세요.",
                );
                setIsProcessing(false);
                e.preventDefault(); // 붙여넣기 이벤트 취소
                return; // 여기서 함수 즉시 종료 (파싱 진행 안 함)
            }
        }
        const plainText = e.clipboardData.getData("text/plain");

        if (!plainText || plainText.trim() === "") {
            alert(
                "⚠️ 붙여넣기에 실패했습니다.\n\n" +
                    "클립보드에 텍스트가 없거나, 데이터가 너무 커서(약 50MB 초과) 브라우저가 처리를 거부했습니다.\n\n" +
                    "대용량 데이터는 팝업을 닫고 [파일 추가] 기능을 이용해 주세요.",
            );
            setIsProcessing(false);
            return;
        }
        // 2. 검증을 통과했으므로 파싱 상태로 진입
        setIsProcessing(true);
        setProgress(0);

        // 3. Worker 스트리밍을 위해 원시 텍스트를 가상의 File 객체로 래핑
        const file = new File([plainText], "pasted.csv", { type: "text/plain" });
        const totalSize = file.size;
        const allData: any[][] = [];

        // 4. PapaParse Worker 실행
        Papa.parse(file, {
            worker: true, // 메인 스레드 프리징 완벽 차단
            chunkSize: 1024 * 1024 * 2, // 2MB 단위로 쪼개서 스트리밍 파싱
            skipEmptyLines: true, // 빈 줄 무시
            chunk: results => {
                // 파싱된 chunk 데이터를 원시 배열에 누적 (Zero-Copy 지향, 객체 변환 안 함)
                const chunkData = results.data as any[][];
                for (let i = 0; i < chunkData.length; i++) {
                    allData.push(chunkData[i]);
                }

                // 실제 처리된 파일 바이트(cursor)를 기준으로 진행률(%) 산출
                const currentBytes = results.meta.cursor;
                const percent = Math.min(99, Math.round((currentBytes / totalSize) * 100));
                setProgress(percent);
            },
            complete: () => {
                // 파싱 100% 완료 처리
                setProgress(100);

                // 100% UI 애니메이션을 사용자가 인식할 수 있도록 0.4초 대기 후 부모로 데이터 전달
                setTimeout(() => {
                    const virtualName = `pasted_${Date.now()}.csv`;
                    onDataParsed(allData, virtualName);
                    onClose();
                }, 400);
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
                            // 진행률 바 (Progress Bar) UI
                            <div className="w-full px-12 flex flex-col items-center gap-4 animate-in zoom-in-95">
                                <div className="text-4xl animate-bounce">⚙️</div>

                                <div className="w-full">
                                    <div className="flex justify-between text-sm font-black text-gray-600 mb-2 tracking-wider">
                                        <span>ANALYZING DATA...</span>
                                        <span className="text-blue-600">{progress}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-xs font-bold text-gray-400 mt-2">
                                    브라우저 메모리에 최적화 중입니다
                                </p>
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
