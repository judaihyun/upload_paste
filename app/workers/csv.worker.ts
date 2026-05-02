// app/workers/csv.worker.ts
import Papa from "papaparse";
import { CsvWorkerMessageIn, WorkerMessageOut } from "@/types/parser";

let isCancelled = false;

self.onmessage = async (e: MessageEvent<CsvWorkerMessageIn>) => {
    const data = e.data;

    if (data.action === "CANCEL") {
        isCancelled = true;
        return;
    }

    if (data.action === "START" && data.file) {
        isCancelled = false;
        const allData: any[][] = [];

        try {
            // 💡 [Stage 1] 파싱 시작 알림
            postMessage({
                type: "STAGE_UPDATE",
                stage: "PARSING",
                message: "데이터를 조각내어 읽고 있습니다...",
            } as WorkerMessageOut);

            Papa.parse(data.file, {
                worker: false,
                chunkSize: 1024 * 1024 * 5, // 5MB
                skipEmptyLines: true,
                chunk: (results, parser) => {
                    if (isCancelled) {
                        parser.abort();
                        return;
                    }
                    // 청크 병합 (여기에선 메시지를 쏘지 않음! 성능 핵심)
                    const chunkData = results.data as any[][];
                    for (let i = 0; i < chunkData.length; i++) {
                        allData.push(chunkData[i]);
                    }
                },
                complete: () => {
                    if (isCancelled) return;

                    // 💡 [Stage 2] 파싱 완료, 메인 스레드로 넘기기 직전 알림
                    postMessage({
                        type: "STAGE_UPDATE",
                        stage: "MERGING",
                        message: "데이터 병합 완료! 화면을 준비하고 있습니다...",
                    } as WorkerMessageOut);

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
            postMessage({ type: "ERROR", payload: err.message });
        }
    }
};
