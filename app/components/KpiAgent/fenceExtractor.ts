export interface ExtractResult {
    uiText: string;
    gridSpec: any | null; // 추출된 스펙 (단 1회만 반환)
}

export class FenceExtractor {
    private accumulated: string = "";
    private phase: "TEXT_BEFORE" | "INSIDE_FENCE" | "TEXT_AFTER" = "TEXT_BEFORE";

    private fenceStartIdx: number = -1;
    private fenceEndIdx: number = -1;
    private hasEmittedSpec: boolean = false; // 전역 스토어 중복 호출 방지용

    public processChunk(chunk: string): ExtractResult {
        this.accumulated += chunk;
        let uiText = "";
        let gridSpec = null;

        // ---------------------------------------------------------
        // Phase 1: 여는 펜스 탐색 (앞부분 텍스트 노출)
        // ---------------------------------------------------------
        if (this.phase === "TEXT_BEFORE") {
            this.fenceStartIdx = this.accumulated.indexOf("```kpi_agent");
            if (this.fenceStartIdx !== -1) {
                this.phase = "INSIDE_FENCE"; // 상태 전환!
                uiText = this.accumulated.substring(0, this.fenceStartIdx);
            } else {
                uiText = this.accumulated; // 일반 텍스트 노출
            }
        }

        // ---------------------------------------------------------
        // Phase 2: 펜스 내부 (JSON 수집 및 UI 동결)
        // ---------------------------------------------------------
        if (this.phase === "INSIDE_FENCE") {
            // UI는 여는 펜스 직전으로 동결시킴
            uiText = this.accumulated.substring(0, this.fenceStartIdx);

            const searchStart = this.fenceStartIdx + "```kpi_agent".length;
            const closeIdx = this.accumulated.indexOf("```", searchStart);

            if (closeIdx !== -1) {
                // 닫는 펜스 발견! 상태 전환
                this.fenceEndIdx = closeIdx + 3; // "```"의 길이(3)만큼 더함
                this.phase = "TEXT_AFTER";

                // 딱 1번만 파싱해서 gridSpec 생성
                if (!this.hasEmittedSpec) {
                    const jsonStr = this.accumulated.substring(searchStart, closeIdx).trim();
                    try {
                        gridSpec = JSON.parse(jsonStr);
                        this.hasEmittedSpec = true;
                    } catch (e) {
                        console.error("JSON 파싱 에러:", e);
                        this.hasEmittedSpec = true; // 에러나도 막음
                    }
                }
            }
        }

        // ---------------------------------------------------------
        // Phase 3: 조립 완료 후 (뒷부분 텍스트 이어붙이기)
        // ---------------------------------------------------------
        if (this.phase === "TEXT_AFTER") {
            // 🌟 핵심: 펜스 구역만 쏙 빼고 앞부분 텍스트와 뒷부분 텍스트를 이어붙임
            const textBefore = this.accumulated.substring(0, this.fenceStartIdx);
            const textAfter = this.accumulated.substring(this.fenceEndIdx);
            uiText = textBefore + textAfter;
        }

        return { uiText, gridSpec };
    }
}
