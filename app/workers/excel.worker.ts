// app/workers/excel.worker.ts
import * as XLSX from "xlsx";
import { ExcelWorkerMessageIn, WorkerMessageOut } from "@/types/parser";

let isCancelled = false;

self.onmessage = async (e: MessageEvent<ExcelWorkerMessageIn>) => {
    const data = e.data;

    if (data.action === "CANCEL") {
        isCancelled = true;
        return;
    }

    if (data.action === "START" && data.buffer) {
        isCancelled = false;
        const buffer = data.buffer;

        try {
            // 💡 [Stage 1] 엑셀 바이너리 분석 시작 (무거운 동기 작업 진입 전)
            postMessage({
                type: "STAGE_UPDATE",
                stage: "PARSING",
                message:
                    "엑셀 파일 구조를 분석하고 있습니다... (파일이 크면 시간이 걸릴 수 있습니다)",
            } as WorkerMessageOut);

            // 🚀 핵심 방어 로직: XLSX.read가 워커 스레드를 완전 블로킹하기 전에,
            // 위 메시지가 메인 스레드(UI)로 확실히 전송될 수 있도록 이벤트 루프를 한 턴 양보합니다.
            await new Promise(resolve => setTimeout(resolve, 50));

            if (isCancelled) return;

            // 🚨 가장 오래 걸리는 동기 블로킹 구간 (CPU 100% 점유)
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetNames = workbook.SheetNames;

            // 💡 [Stage 2] 시트별 데이터 추출 시작
            postMessage({
                type: "STAGE_UPDATE",
                stage: "MERGING",
                message: `총 ${sheetNames.length}개의 시트 데이터를 추출하고 있습니다...`,
            } as WorkerMessageOut);

            // 메시지 전송용 짧은 양보 (이후 루프에서는 논스톱으로 달립니다)
            await new Promise(resolve => setTimeout(resolve, 10));

            const allSheetsData: Record<string, any[][]> = {};
            const totalSheets = sheetNames.length;

            // 💡 기존에 있던 내부 setTimeout을 제거하여 추출 속도 극대화
            for (let i = 0; i < totalSheets; i++) {
                if (isCancelled) return;

                const sheetName = sheetNames[i];
                const worksheet = workbook.Sheets[sheetName];

                // header: 1 (2차원 배열 추출), defval: "" (빈 셀 보정)
                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
                    header: 1,
                    defval: "",
                });

                allSheetsData[sheetName] = jsonData;
            }

            if (isCancelled) return;

            // 💡 [Stage 3] 추출 완료 및 결과 전송
            postMessage({
                type: "COMPLETE",
                payload: {
                    success: true,
                    allSheetsData: allSheetsData,
                    sheetNames: sheetNames,
                },
            } as WorkerMessageOut);
        } catch (error: any) {
            postMessage({
                type: "ERROR",
                payload: `Excel 파싱 실패: ${error.message || "알 수 없는 파일 손상 및 메모리 에러"}`,
            } as WorkerMessageOut);
        }
    }
};
