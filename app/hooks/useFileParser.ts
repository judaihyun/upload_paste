// hooks/useFileParser.ts
import { useState, useRef, useCallback, useEffect } from "react";
import { WorkerMessageOut, ParseCompletePayload } from "@/types/parser";

interface UseFileParserProps {
    onSuccess: (result: ParseCompletePayload & { parseTime: number }) => void;
    onError: (error: string) => void;
}

// 💡 1. 유저 설정 하드 타임아웃 (80초)
const HARD_TIMEOUT_MS = 80 * 1000;

export function useFileParser({ onSuccess, onError }: UseFileParserProps) {
    const [isParsing, setIsParsing] = useState(false);
    // 💡 2. 숫자 진행률 대신 텍스트 상태 메시지 도입
    const [currentStageMessage, setCurrentStageMessage] = useState<string>("");

    const workerRef = useRef<Worker | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 파싱 강제 취소 및 리소스 정리
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

        setIsParsing(false);
        setCurrentStageMessage(""); // 메시지 초기화
        console.log("Worker 강제 종료 완료 및 상태 초기화");
    }, []);

    useEffect(() => {
        return () => terminateWorker();
    }, [terminateWorker]);

    // 메인 파싱 실행 함수
    const parseFile = async (file: File) => {
        setIsParsing(true);
        setCurrentStageMessage("파일을 준비 중입니다..."); // 💡 초기 상태 메세지
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

            // 하드 타임아웃 작동
            timeoutRef.current = setTimeout(() => {
                console.error("Hard Timeout! 파싱 시간이 초과되었습니다.");
                terminateWorker();
                onError("파싱 처리 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.");
            }, HARD_TIMEOUT_MS);

            // 워커 응답 리스너
            workerRef.current.onmessage = (event: MessageEvent<WorkerMessageOut>) => {
                const data = event.data;

                switch (data.type) {
                    case "STAGE_UPDATE":
                        // 💡 3. 워커에서 올라온 텍스트 상태로 UI 업데이트 (리렌더링 최소화)
                        if (data.message) {
                            setCurrentStageMessage(data.message);
                        }
                        break;

                    case "COMPLETE":
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);

                        // 💡 4. 렌더링 단계 진입: 메인 스레드 블로킹 전 UI Paint 양보
                        setCurrentStageMessage("화면에 데이터를 렌더링하는 중입니다...");

                        setTimeout(() => {
                            onSuccess({
                                ...data.payload,
                                parseTime: performance.now() - startTime,
                            });
                            terminateWorker();
                        }, 50);
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
        currentStageMessage, // 💡 progress 대신 export
        parseFile,
        cancelParsing: terminateWorker,
    };
}
