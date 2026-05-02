// hooks/useMultiFileParser.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { FileEntry } from "@/(protected)/testbed/multi/page";
import {
    WorkerMessageOut,
    CsvWorkerMessageIn,
    ExcelWorkerMessageIn,
    ParseCompletePayload,
} from "@/types/parser";

// 💡 1. 절대 타임아웃 기준 (단일 파서와 동일하게 80초 권장)
const HARD_TIMEOUT_MS = 80 * 1000;

interface UseMultiFileParserProps {
    onQueueUpdate: (queue: FileEntry[]) => void;
    onFileComplete: (fileId: string, result: ParseCompletePayload & { parseTime: number }) => void;
}

export function useMultiFileParser({ onQueueUpdate, onFileComplete }: UseMultiFileParserProps) {
    const [queue, setQueue] = useState<FileEntry[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    // 💡 2. 현재 처리 중인 파일의 상태를 나타내는 메시지 상태 추가
    const [currentStageMessage, setCurrentStageMessage] = useState<string>("");

    const processingFileIdRef = useRef<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 큐가 변경될 때마다 부모 컴포넌트에 동기화
    useEffect(() => {
        onQueueUpdate(queue);
    }, [queue, onQueueUpdate]);

    // 큐 스케줄러 (반응형 트리거)
    useEffect(() => {
        if (!processingFileIdRef.current) {
            const nextFile = queue.find(f => f.status === "waiting");
            if (nextFile) {
                processNextFile(nextFile);
            }
        }
    }, [queue]);

    const updateFileStatus = useCallback((id: string, updates: Partial<FileEntry>) => {
        setQueue(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
    }, []);

    // 워커 강제 종료 및 상태 정리
    const terminateWorker = useCallback(
        (isError: boolean = false) => {
            if (workerRef.current) {
                workerRef.current.postMessage({ action: "CANCEL" } as any);
                workerRef.current.terminate();
                workerRef.current = null;
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            const currentId = processingFileIdRef.current;
            processingFileIdRef.current = null; // 락(Lock) 해제
            setIsParsing(false);
            setCurrentStageMessage(""); // 메시지 초기화

            if (currentId && isError) {
                updateFileStatus(currentId, { status: "error" });
            }
        },
        [updateFileStatus],
    );

    // 핵심 파싱 엔진
    const processNextFile = async (entry: FileEntry) => {
        const file = (entry as any).rawFile as File;
        if (!file) return;

        processingFileIdRef.current = entry.id;
        setIsParsing(true);
        setCurrentStageMessage(`[${file.name}] 준비 중...`); // 💡 초기 상태 세팅

        // UI 호환성을 위해 progress 0으로 초기화 (추후 큐 UI에서 제거 가능)
        updateFileStatus(entry.id, { status: "processing", progress: 0 });

        const startTime = performance.now();
        const extension = file.name.split(".").pop()?.toLowerCase();

        try {
            if (extension === "csv") {
                workerRef.current = new Worker(
                    new URL("../workers/csv.worker.ts", import.meta.url),
                );
            } else if (extension === "xlsx" || extension === "xls") {
                workerRef.current = new Worker(
                    new URL("../workers/excel.worker.ts", import.meta.url),
                );
            } else {
                throw new Error("지원하지 않는 포맷");
            }

            timeoutRef.current = setTimeout(() => {
                console.error(`Hard Timeout! 파싱 시간 초과 (${entry.name})`);
                terminateWorker(true);
            }, HARD_TIMEOUT_MS);

            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;

                switch (data.type) {
                    case "STAGE_UPDATE":
                        // 💡 3. 워커에서 올라온 텍스트 상태로 업데이트
                        if (data.message) {
                            setCurrentStageMessage(data.message);
                        }
                        break;

                    case "COMPLETE":
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);

                        // 💡 4. 렌더링 단계 진입 전 메인 스레드 숨고르기 (50ms 양보)
                        setCurrentStageMessage("데이터 처리를 마무리하고 있습니다...");

                        setTimeout(() => {
                            const parseTime = performance.now() - startTime;

                            // 상태 완료 처리
                            updateFileStatus(entry.id, {
                                status: "completed",
                                progress: 100, // 필요 시 유지
                                parseTime,
                                allSheetsData: data.payload.allSheetsData,
                                sheetNames: data.payload.sheetNames,
                            });

                            // 부모 컴포넌트로 데이터 전달
                            onFileComplete(entry.id, { ...data.payload, parseTime });

                            // 💡 락 해제 및 다음 큐 스케줄링 준비
                            processingFileIdRef.current = null;
                            setIsParsing(false);
                            setCurrentStageMessage("");
                        }, 50);
                        break;

                    case "ERROR":
                        console.error(`파싱 에러 (${entry.name}):`, data.payload);
                        terminateWorker(true);
                        break;
                }
            };

            workerRef.current.onerror = () => {
                terminateWorker(true);
            };

            if (extension === "csv") {
                workerRef.current.postMessage({ action: "START", file } as CsvWorkerMessageIn);
            } else {
                const buffer = await file.arrayBuffer();
                workerRef.current.postMessage({ action: "START", buffer } as ExcelWorkerMessageIn, [
                    buffer,
                ]);
            }
        } catch (err) {
            terminateWorker(true);
        }
    };

    const addFiles = (files: FileList) => {
        const newEntries = Array.from(files).map(file => ({
            id: `${file.name}-${file.size}-${Date.now()}`,
            name: file.name,
            size: file.size,
            status: "waiting" as const,
            progress: 0,
            parseTime: null,
            totalTime: null,
            sheetNames: [],
            rawFile: file,
        }));
        setQueue(prev => [...prev, ...newEntries].slice(0, 5));
    };

    const cancelFile = (id: string) => {
        if (processingFileIdRef.current === id) {
            terminateWorker(true);
        } else {
            setQueue(prev => prev.filter(f => f.id !== id));
        }
    };

    return {
        queue,
        addFiles,
        cancelFile,
        isParsing,
        currentStageMessage, // 💡 UI에서 현재 처리 중인 파일의 상태를 띄울 수 있도록 노출
    };
}
