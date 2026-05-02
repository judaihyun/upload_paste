// hooks/useFileParser.ts
import { useState, useRef, useCallback, useEffect } from "react";
import { WorkerMessageOut, ParseCompletePayload } from "@/types/parser"; // 불필요한 MessageIn 타입들 제거 가능

interface UseFileParserProps {
    onSuccess: (result: ParseCompletePayload & { parseTime: number }) => void;
    onError: (error: string) => void;
}

// 💡 1. 절대 타임아웃 기준 시간 (3분 = 180초)
const HARD_TIMEOUT_MS = 80 * 1000;

export function useFileParser({ onSuccess, onError }: UseFileParserProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [progress, setProgress] = useState(0);

    const workerRef = useRef<Worker | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 💡 2. 파싱 강제 취소 및 타이머 해제
    const terminateWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.postMessage({ action: "CANCEL" });
            workerRef.current.terminate();
            workerRef.current = null;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setProgress(0);
        setIsParsing(false);
        console.log("Worker 강제 종료 완료 및 상태 초기화");
    }, []);

    useEffect(() => {
        return () => terminateWorker();
    }, [terminateWorker]);

    // 메인 파싱 실행 함수
    const parseFile = async (file: File) => {
        setIsParsing(true);
        setProgress(0);
        const startTime = performance.now();

        try {
            const extension = file.name.split(".").pop()?.toLowerCase();

            if (extension === "csv") {
                console.log("CSV 파일 감지, csv.worker.ts로 처리");
                workerRef.current = new Worker(
                    new URL("../workers/csv.worker.ts", import.meta.url),
                );
            } else if (extension === "xlsx" || extension === "xls") {
                console.log("엑셀 파일 감지, excel.worker.ts로 처리");
                workerRef.current = new Worker(
                    new URL("../workers/excel.worker.ts", import.meta.url),
                );
            } else {
                throw new Error("지원하지 않는 파일 형식입니다.");
            }

            // 💡 3. 하드 타임아웃 작동 (시작 시 딱 1번만 실행)
            timeoutRef.current = setTimeout(() => {
                console.error("Hard Timeout! 파싱 시간이 3분을 초과했습니다.");
                terminateWorker();
                onError("파싱 처리 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.");
            }, HARD_TIMEOUT_MS);

            // 워커 응답 리스너
            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;

                // 💡 4. 복잡한 HEARTBEAT 케이스 완전 삭제
                switch (data.type) {
                    case "PROGRESS":
                        setProgress(data.payload);
                        break;
                    case "COMPLETE":
                        // 성공 시 무조건 타이머 먼저 해제
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        setProgress(100);
                        onSuccess({
                            ...data.payload,
                            parseTime: performance.now() - startTime,
                        });
                        terminateWorker();
                        break;
                    case "ERROR":
                        terminateWorker();
                        onError(data.payload);
                        break;
                }
            };

            workerRef.current.onerror = err => {
                console.error("Worker Execution Error:", err);
                terminateWorker();
                onError("워커 프로세스에서 치명적인 에러가 발생했습니다.");
            };

            // 파일 포인터 전송
            if (extension === "csv") {
                workerRef.current.postMessage({ action: "START", file });
            } else {
                const buffer = await file.arrayBuffer();
                workerRef.current.postMessage({ action: "START", buffer }, [buffer]);
            }
        } catch (error: any) {
            terminateWorker();
            onError(error.message);
        }
    };

    return {
        isParsing,
        progress,
        parseFile,
        cancelParsing: terminateWorker,
    };
}
