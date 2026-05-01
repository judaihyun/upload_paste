// app/workers/csv.worker.ts
import Papa from "papaparse";
import { CsvWorkerMessageIn, WorkerMessageOut } from "@/types/parser";

let isCancelled = false;
let heartbeatInterval: NodeJS.Timeout;

// 메인 스레드로 생존 신호를 보내는 함수 (Silent Crash 방지)
const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
        postMessage({ type: "HEARTBEAT" } as WorkerMessageOut);
    }, 1000);
};

const stopHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
};

self.onmessage = async (e: MessageEvent<CsvWorkerMessageIn>) => {
    const data = e.data;

    if (data.action === "CANCEL") {
        isCancelled = true;
        stopHeartbeat();
        return;
    }

    if (data.action === "START" && data.file) {
        isCancelled = false;
        startHeartbeat();
        const allData: any[][] = [];

        try {
            Papa.parse(data.file, {
                worker: false, // 이미 Worker 내부이므로 false 설정 (중첩 방지)
                chunkSize: 1024 * 1024 * 5, // 5MB 단위 스트리밍
                skipEmptyLines: true,
                chunk: (results, parser) => {
                    if (isCancelled) {
                        parser.abort();
                        return;
                    }

                    // 1. 데이터 병합
                    const chunkData = results.data as any[][];
                    for (let i = 0; i < chunkData.length; i++) {
                        allData.push(chunkData[i]);
                    }

                    // 2. 진행률 전송
                    const currentBytes = results.meta.cursor;
                    const progress = Math.min(
                        99,
                        Math.round((currentBytes / data.file.size) * 100),
                    );
                    postMessage({ type: "PROGRESS", payload: progress } as WorkerMessageOut);
                },
                complete: () => {
                    if (isCancelled) return;
                    stopHeartbeat();

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
                    stopHeartbeat();
                    postMessage({
                        type: "ERROR",
                        payload: `CSV 파싱 에러: ${error.message}`,
                    } as WorkerMessageOut);
                },
            });
        } catch (err: any) {
            stopHeartbeat();
            postMessage({
                type: "ERROR",
                payload: `워커 내부 에러: ${err.message}`,
            } as WorkerMessageOut);
        }
    }
};
