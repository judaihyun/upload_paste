// hooks/useMultiFileParser.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { FileEntry } from "@/testbed/multi/page";
import {
    WorkerMessageOut,
    CsvWorkerMessageIn,
    ExcelWorkerMessageIn,
    ParseCompletePayload,
} from "@/types/parser";

const PROCESS_TIME_THRESHOLD = 150 * 1000;

interface UseMultiFileParserProps {
    onQueueUpdate: (queue: FileEntry[]) => void;
    onFileComplete: (fileId: string, result: ParseCompletePayload & { parseTime: number }) => void;
}

export function useMultiFileParser({ onQueueUpdate, onFileComplete }: UseMultiFileParserProps) {
    const [queue, setQueue] = useState<FileEntry[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    // 상태 동기화 충돌을 막기 위한 Ref 관리
    const processingFileIdRef = useRef<string | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 큐가 변경될 때마다 부모 컴포넌트에 동기화
    useEffect(() => {
        onQueueUpdate(queue);
    }, [queue, onQueueUpdate]);

    // 💡 큐 스케줄러: 현재 파싱 중인 파일이 없으면 다음 waiting 파일을 찾아 실행
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

    // 💡 워커 강제 종료 및 상태 정리 (현재 처리 중인 파일 전용)
    const terminateWorker = useCallback(
        (isError: boolean = false) => {
            if (workerRef.current) {
                workerRef.current.postMessage({ action: "CANCEL" } as any);
                workerRef.current.terminate();
                workerRef.current = null;
            }
            if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);

            const currentId = processingFileIdRef.current;
            processingFileIdRef.current = null;
            setIsParsing(false);

            if (currentId && isError) {
                updateFileStatus(currentId, { status: "error" });
            }
        },
        [updateFileStatus],
    );

    const resetHeartbeatTimeout = useCallback(() => {
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setTimeout(() => {
            console.error("Worker Timeout! 큐 진행을 위해 워커를 강제 종료합니다.");
            terminateWorker(true);
        }, PROCESS_TIME_THRESHOLD);
    }, [terminateWorker]);

    // 핵심 파싱 엔진
    const processNextFile = async (entry: FileEntry) => {
        const file = (entry as any).rawFile as File;
        if (!file) return;

        // 현재 처리 중인 파일 ID 락(Lock)
        processingFileIdRef.current = entry.id;
        setIsParsing(true);
        updateFileStatus(entry.id, { status: "processing", progress: 0 });

        const startTime = performance.now();
        const extension = file.name.split(".").pop()?.toLowerCase();

        try {
            // 💡 단일 파서에서 구축한 표준 Worker Strategy 재사용
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

            resetHeartbeatTimeout();

            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;
                resetHeartbeatTimeout();

                switch (data.type) {
                    case "HEARTBEAT":
                        break;
                    case "PROGRESS":
                        updateFileStatus(entry.id, { progress: data.payload });
                        break;
                    case "COMPLETE":
                        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
                        const parseTime = performance.now() - startTime;

                        updateFileStatus(entry.id, {
                            status: "completed",
                            progress: 100,
                            parseTime,
                            allSheetsData: data.payload.allSheetsData,
                            sheetNames: data.payload.sheetNames,
                        });

                        onFileComplete(entry.id, { ...data.payload, parseTime });

                        // 다음 큐 진행을 위해 락 해제
                        processingFileIdRef.current = null;
                        setIsParsing(false);
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

    // 💡 크리티컬 버그 수정: 대기 중 파일 취소와 진행 중 파일 취소를 명확히 분리
    const cancelFile = (id: string) => {
        if (processingFileIdRef.current === id) {
            // 현재 파싱 중인 파일을 취소한 경우 워커를 죽이고 에러(또는 취소) 처리
            terminateWorker(true);
        } else {
            // 대기 중인 파일이거나 이미 완료된 파일이면 큐에서 조용히 삭제
            setQueue(prev => prev.filter(f => f.id !== id));
        }
    };

    return { addFiles, cancelFile, isParsing };
}
