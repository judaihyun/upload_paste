export interface ParseResult {
    uiText: string;
    parsedSpec: any | null;
}

export class LlmStreamParser {
    private rawText: string = "";
    private isInsideFence: boolean = false;
    private isParsed: boolean = false;
    private fenceStartIndex: number = -1;

    // Fenced Block 식별자 (추후 다른 에이전트 확장 시 상수로 분리 가능)
    private readonly OPEN_TOKEN = "```kpi_agent";
    private readonly CLOSE_TOKEN = "```";

    /**
     * 스트림 청크를 받아 상태 머신을 통과시킨 뒤, UI용 정제 텍스트와 파싱된 스펙을 반환합니다.
     * @param chunkContent 새롭게 들어온 스트림 문자열 조각
     */
    public processChunk(chunkContent: string): ParseResult {
        // 1. 원본 버퍼에 무조건 누적
        this.rawText += chunkContent;

        let uiText = "";
        let parsedSpec = null;

        // ---------------------------------------------------------
        // [상태 1] 조립 완료 (JSON 파싱 끝)
        // ---------------------------------------------------------
        if (this.isParsed) {
            // 이미 펜스 처리가 끝났으므로, 원본에서 펜스 블록 전체를 잘라낸 나머지를 UI에 노출
            // (이 정규식은 파싱이 끝난 이후에만 돌기 때문에 성능에 영향이 거의 없습니다)
            uiText = this.rawText.replace(/```kpi_agent[\s\S]*?```/, "");
            return { uiText, parsedSpec: null };
        }

        // ---------------------------------------------------------
        // [상태 2] 여는 펜스를 기다리는 중 (일반 텍스트 타이핑)
        // ---------------------------------------------------------
        if (!this.isInsideFence) {
            const openIdx = this.rawText.indexOf(this.OPEN_TOKEN);

            if (openIdx !== -1) {
                // 🌟 상태 전환: 여는 펜스 발견
                this.isInsideFence = true;
                this.fenceStartIndex = openIdx;
                // UI 텍스트는 펜스 직전까지만 잘라서 반환 (여기서부터 렌더링 홀딩 시작)
                uiText = this.rawText.substring(0, openIdx);
            } else {
                uiText = this.rawText;
            }
            return { uiText, parsedSpec };
        }

        // ---------------------------------------------------------
        // [상태 3] 펜스 내부 진입 (JSON 조립 중 -> UI 동결)
        // ---------------------------------------------------------
        // 🌟 핵심: 아무리 많은 청크가 들어와도 uiText는 과거 위치에 고정됨
        uiText = this.rawText.substring(0, this.fenceStartIndex);

        const searchStartIndex = this.fenceStartIndex + this.OPEN_TOKEN.length;
        const closeIdx = this.rawText.indexOf(this.CLOSE_TOKEN, searchStartIndex);

        if (closeIdx !== -1) {
            // 🌟 상태 전환: 닫는 펜스 발견
            const jsonString = this.rawText.substring(searchStartIndex, closeIdx).trim();

            try {
                parsedSpec = JSON.parse(jsonString);
                this.isParsed = true;
                // 객체 반환은 최초 1회만 발생
            } catch (error) {
                console.error("[LlmStreamParser] JSON 구문 에러 (LLM 생성 오류):", error);
                this.isParsed = true; // 에러가 나도 무한 홀딩을 막기 위해 닫아줌
            }
        }

        return { uiText, parsedSpec };
    }
}
