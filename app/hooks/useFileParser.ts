// hooks/useFileParser.ts
import { useState, useRef, useCallback, useEffect } from "react";
import {
    WorkerMessageOut,
    CsvWorkerMessageIn,
    ExcelWorkerMessageIn,
    ParseCompletePayload,
} from "@/types/parser";

interface UseFileParserProps {
    onSuccess: (result: ParseCompletePayload & { parseTime: number }) => void;
    onError: (error: string) => void;
}

const PROCESS_TIME_THRESHOLD = 150 * 1000; // 150초

export function useFileParser({ onSuccess, onError }: UseFileParserProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [progress, setProgress] = useState(0);

    const workerRef = useRef<Worker | null>(null);
    const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 💡 2. Silent Worker Crash 감지기 (타임아웃 로직)
    const resetHeartbeatTimeout = useCallback(() => {
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);

        // 100초 동안 워커에서 응답(진행률 또는 Heartbeat)이 없으면 OOM 사망으로 간주
        heartbeatTimeoutRef.current = setTimeout(() => {
            console.error("Worker Timeout! OOM(메모리 초과)이 의심됩니다.");
            terminateWorker();
            onError(
                "파싱 프로세스가 응답하지 않습니다. (파일이 너무 커서 메모리가 초과되었을 수 있습니다)",
            );
        }, PROCESS_TIME_THRESHOLD);
    }, [onError]);

    // 💡 4. 파싱 강제 취소 (확실한 메모리 반환)
    const terminateWorker = useCallback(() => {
        if (workerRef.current) {
            // 진행 중이던 파서에게 중단 신호 전송 (graceful exit 시도)
            workerRef.current.postMessage({ action: "CANCEL" });
            // 물리적 스레드 즉각 킬
            workerRef.current.terminate();
            workerRef.current = null;
        }

        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);

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

            // 💡 3. Strategy 분기: 확장자에 따라 워커 객체만 교체
            if (extension === "csv") {
                console.log("CSV 파일 감지, csv.worker.ts로 처리");
                workerRef.current = new Worker(
                    new URL("../workers/csv.worker.ts", import.meta.url),
                );
            } else if (extension === "xlsx" || extension === "xls") {
                // excel.worker.ts도 CSV 워커와 동일한 WorkerMessage 통신 규격으로 만들어야 합니다.
                console.log("엑셀 파일 감지, excel.worker.ts로 처리");
                workerRef.current = new Worker(
                    new URL("../workers/excel.worker.ts", import.meta.url),
                );
            } else {
                throw new Error("지원하지 않는 파일 형식입니다.");
            }

            // 최초 Heartbeat 타임아웃 타이머 시작
            resetHeartbeatTimeout();

            // 워커 응답 리스너
            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;

                // 응답이 오면 워커가 살아있다는 뜻이므로 타임아웃 초기화
                resetHeartbeatTimeout();

                switch (data.type) {
                    case "HEARTBEAT":
                        // do nothing, just reset timeout
                        break;
                    case "PROGRESS":
                        setProgress(data.payload);
                        break;
                    case "COMPLETE":
                        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
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

            // 워커 내부에서 문법 오류 등 치명적 크래시 발생 시
            workerRef.current.onerror = err => {
                console.error("Worker Execution Error:", err);
                terminateWorker();
                onError("워커 프로세스에서 치명적인 에러가 발생했습니다.");
            };

            // 💡 파일 포인터 전송 (ArrayBuffer가 아닌 File 객체 통째로)
            // CSV 스트리밍을 위해 File을 그대로 넘깁니다. (Excel은 arrayBuffer 필요 여부에 따라 분기)
            if (extension === "csv") {
                workerRef.current.postMessage({ action: "START", file });
            } else {
                // 엑셀은 기존처럼 buffer를 던진다면:
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
        cancelParsing: terminateWorker, // 이제 확실하게 동작합니다
    };
}
