// hooks/useMultiFileParser.ts
import { useState, useRef, useEffect, useCallback } from "react";
import { FileEntry } from "@/(protected)/testbed/multi/page";
import {
    WorkerMessageOut,
    CsvWorkerMessageIn,
    ExcelWorkerMessageIn,
    ParseCompletePayload,
} from "@/types/parser";

// 💡 1. 절대 타임아웃 기준 (150초)
const HARD_TIMEOUT_MS = 150 * 1000;

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
    const timeoutRef = useRef<NodeJS.Timeout | null>(null); // 명칭 직관화

    // 큐가 변경될 때마다 부모 컴포넌트에 동기화
    useEffect(() => {
        onQueueUpdate(queue);
    }, [queue, onQueueUpdate]);

    // 💡 큐 스케줄러 (반응형 트리거)
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

    // 💡 2. 워커 강제 종료 및 상태 정리
    const terminateWorker = useCallback(
        (isError: boolean = false) => {
            if (workerRef.current) {
                workerRef.current.postMessage({ action: "CANCEL" } as any);
                workerRef.current.terminate();
                workerRef.current = null;
            }

            // 타이머 확실히 해제
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            const currentId = processingFileIdRef.current;
            processingFileIdRef.current = null; // 락(Lock) 해제
            setIsParsing(false);

            // 에러 처리 시 상태 업데이트 -> 이로 인해 queue가 변경되어 스케줄러(useEffect)가 다음 파일을 자동 실행함
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

            // 💡 3. 하드 타임아웃 세팅 (시작할 때 딱 한 번)
            timeoutRef.current = setTimeout(() => {
                console.error(`Hard Timeout! 파싱 시간 초과 (${entry.name})`);
                terminateWorker(true); // 에러로 처리하여 현재 워커를 죽이고 다음 파일로 넘어감
            }, HARD_TIMEOUT_MS);

            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;

                // 💡 4. 불필요한 HEARTBEAT 케이스 완전 삭제
                switch (data.type) {
                    case "PROGRESS":
                        updateFileStatus(entry.id, { progress: data.payload });
                        break;
                    case "COMPLETE":
                        // 성공 시 즉각 타이머 해제
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);

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
                        // 완료 상태로 queue가 업데이트되면서 자동으로 스케줄러가 다음 파일을 찾음
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

    return { queue, addFiles, cancelFile, isParsing }; // queue를 UI에서 쓸 수 있게 반환
}
