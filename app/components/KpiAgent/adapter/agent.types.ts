// 1. 부모(Master) 데이터를 요청할 때의 표준 스펙
export interface StandardDataRequest {
    messageId: string;
    page: number;
    size: number;
    sort?: { field: string; direction: "asc" | "desc" }[];
    filters?: Record<string, any>;
}

// 2. 부모(Master) 데이터 응답 스펙
export interface StandardDataResponse<T = Record<string, unknown>> {
    data: T[];
    totalCount: number;
    schema: string[]; // 동적 컬럼용 키 배열
}

// 3. 자식(Detail) 데이터를 요청할 때의 표준 스펙 (데이터 연동의 핵심)
export interface DetailDataRequest {
    messageId: string;
    masterId: string; // 부모 행의 고유 ID
}

// 4. 자식(Detail) 데이터 응답 스펙
export interface DetailDataResponse<T = any> {
    data: T[];
}