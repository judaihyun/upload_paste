import * as XLSX from "xlsx";
import { ExcelWorkerMessageIn, WorkerMessageOut } from "@/types/parser";

// 취소 플래그 (시트 파싱 루프 중간에 탈출하기 위함)
let isCancelled = false;

self.onmessage = async (e: MessageEvent<ExcelWorkerMessageIn>) => {
    const data = e.data;

    // 💡 1. 취소 요청 처리
    if (data.action === "CANCEL") {
        isCancelled = true;
        return;
    }

    // 💡 2. 파싱 시작 요청 처리
    if (data.action === "START" && data.buffer) {
        isCancelled = false;
        const buffer = data.buffer;

        try {
            // [진행률 10%] 파일 메모리 적재 시작 알림
            postMessage({ type: "PROGRESS", payload: 10 } as WorkerMessageOut);

            // 🚀 핵심 방어 로직 1: UI 스레드에 메시지가 도달할 수 있도록 이벤트 루프 양보
            await new Promise(resolve => setTimeout(resolve, 50));

            if (isCancelled) return; // 양보한 사이에 취소 요청이 왔다면 즉시 종료

            // 🚨 가장 오래 걸리는 동기 블로킹 구간 (수 초 ~ 수십 초 소요)
            const workbook = XLSX.read(buffer, { type: "array" });
            const sheetNames = workbook.SheetNames;

            // [진행률 40%] 로드 완료, 시트 데이터 추출 준비
            postMessage({ type: "PROGRESS", payload: 40 } as WorkerMessageOut);
            await new Promise(resolve => setTimeout(resolve, 50));

            const allSheetsData: Record<string, any[][]> = {};
            const totalSheets = sheetNames.length;

            // 💡 3. 각 시트별 데이터 추출 루프
            for (let i = 0; i < totalSheets; i++) {
                if (isCancelled) return; // 시트 처리 중간에 취소 가능성 부여

                const sheetName = sheetNames[i];
                const worksheet = workbook.Sheets[sheetName];

                // header: 1 옵션으로 객체가 아닌 원시 2차원 배열(any[][])로 추출
                // defval: "" 을 주어 빈 셀이 undefined로 날아가 배열 인덱스가 틀어지는 것을 방지
                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
                    header: 1,
                    defval: "",
                });

                allSheetsData[sheetName] = jsonData;

                // 시트 하나를 파싱할 때마다 진행률 계산 (40% ~ 90% 사이)
                const progress = 40 + Math.floor(((i + 1) / totalSheets) * 50);
                postMessage({ type: "PROGRESS", payload: progress } as WorkerMessageOut);

                // 🚀 핵심 방어 로직 2: 다음 시트로 넘어가기 전 메인 스레드에 진행률 보고할 시간 양보
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            if (isCancelled) return;

            // 💡 4. 최종 결과 전송 (100% 진행률은 메인 스레드의 SUCCESS 블록에서 처리됨)
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
                payload: `Excel 파싱 실패: ${error.message || "알 수 없는 메모리 에러"}`,
            } as WorkerMessageOut);
        }
    }
};
