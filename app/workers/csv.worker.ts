// app/workers/csv.worker.ts
import Papa from "papaparse";
import { CsvWorkerMessageIn, WorkerMessageOut } from "@/types/parser";

let isCancelled = false;

self.onmessage = async (e: MessageEvent<CsvWorkerMessageIn>) => {
    const data = e.data;

    // 💡 1. 취소 신호가 오면 상태만 변경 (하트비트 중단 로직 삭제됨)
    if (data.action === "CANCEL") {
        isCancelled = true;
        return;
    }

    if (data.action === "START" && data.file) {
        isCancelled = false;
        const allData: any[][] = [];

        try {
            Papa.parse(data.file, {
                worker: false, // 이미 우리가 생성한 Worker 내부이므로 false 설정 (이중 워커 방지)
                chunkSize: 1024 * 1024 * 5, // 5MB 단위 스트리밍
                skipEmptyLines: true,
                chunk: (results, parser) => {
                    if (isCancelled) {
                        parser.abort(); // 즉시 파싱 중단
                        return;
                    }

                    // 1. 데이터 병합
                    const chunkData = results.data as any[][];
                    for (let i = 0; i < chunkData.length; i++) {
                        allData.push(chunkData[i]);
                    }

                    // 2. 진행률 전송 (이것만 메인 스레드로 보냄)
                    const currentBytes = results.meta.cursor;
                    const progress = Math.min(
                        99,
                        Math.round((currentBytes / data.file.size) * 100),
                    );
                    postMessage({ type: "PROGRESS", payload: progress } as WorkerMessageOut);
                },
                complete: () => {
                    if (isCancelled) return;

                    // 완료 결과 전송
                    postMessage({
                        type: "COMPLETE",
                        payload: {
                            success: true,
                            allSheetsData: { "CSV Data": allData },
                            sheetNames: ["CSV Data"],
                        },
                    } as WorkerMessageOut);
                },
                error: error => {
                    if (isCancelled) return;

                    postMessage({
                        type: "ERROR",
                        payload: `CSV 파싱 에러: ${error.message}`,
                    } as WorkerMessageOut);
                },
            });
        } catch (err: any) {
            postMessage({
                type: "ERROR",
                payload: `워커 내부 에러: ${err.message}`,
            } as WorkerMessageOut);
        }
    }
};
