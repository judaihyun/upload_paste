// ---------------------------------------------------------
// 1. Worker -> Main Thread (공통 출력 타입)
// ---------------------------------------------------------
export interface ParseCompletePayload {
    success: boolean;
    allSheetsData: Record<string, any[][]>;
    sheetNames: string[];
}

export type ParserStage = "READING" | "PARSING" | "MERGING" | "RENDERING" | "COMPLETE";

export interface WorkerMessageOut {
    type: "STAGE_UPDATE" | "COMPLETE" | "ERROR";
    stage?: ParserStage;
    message?: string; // 사용자에게 보여줄 친절한 메시지
    payload?: any;
}
// ---------------------------------------------------------
// 2. Main Thread -> Worker (개별 입력 타입)
// ---------------------------------------------------------
// 공통 취소 요청
export interface CancelRequest {
    action: "CANCEL";
}

// CSV 워커 전용 요청 (File 객체 요구)
export interface CsvStartRequest {
    action: "START";
    file: File;
}
export type CsvWorkerMessageIn = CsvStartRequest | CancelRequest;

// Excel 워커 전용 요청 (ArrayBuffer 요구)
export interface ExcelStartRequest {
    action: "START";
    buffer: ArrayBuffer;
}
export type ExcelWorkerMessageIn = ExcelStartRequest | CancelRequest;
