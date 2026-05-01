import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";

interface ParseResult {
    allSheetsData: Record<string, any[][]>;
    sheetNames: string[];
    parseTime: number;
}

interface UseFileParserProps {
    onSuccess: (result: ParseResult) => void;
    onError: (error: string) => void;
}

export function useFileParser({ onSuccess, onError }: UseFileParserProps) {
    const [isParsing, setIsParsing] = useState(false);
    const [progress, setProgress] = useState(0);
    const workerRef = useRef<Worker | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isCancelledRef = useRef<boolean>(false);

    // 가짜 진행률 시뮬레이션
    const startProgress = () => {
        setProgress(0);
        progressIntervalRef.current = setInterval(() => {
            setProgress(p => (p < 80 ? p + Math.random() * 8 : p >= 95 ? 95 : p + 0.5));
        }, 200);
    };

    const stopProgress = () => {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setProgress(0);
    };

    // 워커 강제 종료 및 초기화
    const terminateWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        stopProgress();
        setIsParsing(false);
    }, []);

    // 컴포넌트 언마운트 시 워커 메모리 누수 방지 (안전장치)
    useEffect(() => {
        return () => terminateWorker();
    }, [terminateWorker]);

    // 핵심 파싱 로직 (확장자 분기 포함)
    const parseFile = async (file: File) => {
        setIsParsing(true);
        startProgress();
        const startTime = performance.now();

        try {
            const buffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop()?.toLowerCase();

            // 💡 파일 포맷에 따른 워커(Worker) 분기 처리
            if (extension === "csv") {
                console.log("CSV 엔진 가동...");
                // TODO: 향후 CSV 전용 워커(예: PapaParse 기반)로 교체하기 좋은 확장 포인트
                // workerRef.current = new Worker(
                //     new URL("../workers/excel.worker.ts", import.meta.url),
                // );
                const allData: any[][] = [];
                setProgress(0); // 진짜 진행률을 표시하기 위한 0 초기화

                Papa.parse(file, {
                    header: false,
                    skipEmptyLines: true,
                    // 💡 핵심 1: worker: true 삭제 (Next.js 충돌 회피)
                    chunkSize: 1024 * 1024 * 5, // 💡 핵심 2: 5MB 단위 스트리밍 (메인 스레드 멈춤 방지)
                    chunk: (results, parser) => {
                        if (isCancelledRef.current) {
                            parser.abort();
                            return;
                        }

                        // 💡 방어코드: V8 Call Stack Limit(Maximum call stack size exceeded) 방지
                        const chunkData = results.data as any[][];
                        for (let i = 0; i < chunkData.length; i++) {
                            allData.push(chunkData[i]);
                        }

                        // 💡 핵심 3: 가짜 타이머가 아닌 진짜 진행률(%) 계산 (현재 파싱된 바이트 / 전체 바이트)
                        const currentBytes = results.meta.cursor;
                        const realProgress = Math.min(
                            99,
                            Math.round((currentBytes / file.size) * 100),
                        );
                        setProgress(realProgress);
                    },
                    complete: () => {
                        if (isCancelledRef.current) return;

                        const parseTime = performance.now() - startTime;
                        setProgress(100);

                        onSuccess({
                            allSheetsData: { "CSV Data": allData },
                            sheetNames: ["CSV Data"],
                            parseTime,
                        });

                        setIsParsing(false);
                    },
                    error: error => {
                        if (!isCancelledRef.current) onError(`CSV 파싱 실패: ${error.message}`);
                        setIsParsing(false);
                    },
                });
                return; // CSV 로직 종료
            } else if (extension === "xlsx" || extension === "xls") {
                console.log("Excel 엔진 가동...");
                workerRef.current = new Worker(
                    new URL("../workers/excel.worker.ts", import.meta.url),
                );
            } else {
                throw new Error("지원하지 않는 파일 형식입니다.");
            }

            workerRef.current.postMessage({ buffer }, [buffer]);

            workerRef.current.onmessage = (event: MessageEvent) => {
                const { success, allSheetsData, sheetNames, error } = event.data;
                if (success) {
                    const parseTime = performance.now() - startTime; // 💡 파싱 소요 시간 계산
                    onSuccess({ allSheetsData, sheetNames, parseTime });
                } else {
                    onError(`파싱 실패: ${error}`);
                }
                terminateWorker();
            };

            workerRef.current.onerror = err => {
                onError("워커 프로세스에서 치명적인 에러가 발생했습니다.");
                terminateWorker();
            };
        } catch (error: any) {
            onError(error.message);
            terminateWorker();
        }
    };

    return {
        isParsing,
        progress,
        parseFile,
        cancelParsing: terminateWorker,
    };
}
