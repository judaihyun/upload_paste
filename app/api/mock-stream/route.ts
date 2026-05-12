import { NextResponse } from "next/server";

// Vercel 등 배포 환경에서 실제 스트리밍을 지원하기 위해 Edge 런타임 사용 강제
export const runtime = "edge";

// 🌟 언제든 마음대로 수정할 수 있는 Fake Schema 데이터 (기획/백엔드 스펙에 맞춰 수정)
const FAKE_SCHEMA_PAYLOAD = {
    title: "KPI 에이전트 분석 결과",
    columns: [
        { field: "athlete", headerName: "분류", type: "string" },
        { field: "age", headerName: "달성률", type: "number" },
        { field: "country", headerName: "상태", type: "string" },
        { field: "year", headerName: "year", type: "string" },
        { field: "date", headerName: "date", type: "string" },
        { field: "sport", headerName: "sport", type: "string" },
        { field: "gold", headerName: "gold", type: "string" },
        { field: "silver", headerName: "silver", type: "string" },
    ],
    metadata: {
        generatedAt: new Date().toISOString(),
        confidenceScore: 0.95,
    },
};

// 비동기 지연 유틸리티 (LLM 토큰 생성 지연 모사)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 실무 LLM API는 주로 POST를 사용하므로 POST 핸들러로 작성합니다.
export async function POST(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // SSE 표준 규격(data: {...}\n\n)에 맞춰 이벤트를 전송하는 헬퍼 함수
            const sendEvent = (type: string, content: string = "") => {
                const payload = { id: "fake_id", type, content };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };

            try {
                // 1. 추론 단계 (Reasoning Phase) 시뮬레이션
                sendEvent("reasoning:start");
                await delay(300);
                sendEvent("reasoning:delta", "데이터 구조를 분석하고 있습니다...");
                await delay(500);
                sendEvent("reasoning:delta", "\nKPI 스펙을 도출하는 중입니다...");
                await delay(300);
                sendEvent("reasoning:end");

                // 2. 텍스트 생성 단계 (Text Phase) 시작
                sendEvent("text:start");
                await delay(100);

                // 🌟 첫 번째 텍스트 뭉치 (인사말 + 펜스 블록 + 짧은 안내)
                const jsonString = JSON.stringify(FAKE_SCHEMA_PAYLOAD, null, 2);
                const firstTextChunk = `분석이 완료되었습니다.\n\n\`\`\`kpi_agent\n${jsonString}\n\`\`\`\n\n위의 스펙을 바탕으로 1차 그리드 렌더링을 시작합니다.`;

                let currentIndex = 0;
                while (currentIndex < firstTextChunk.length) {
                    const chunkSize = Math.floor(Math.random() * 4) + 1; // 1~4글자 무작위
                    const chunk = firstTextChunk.slice(currentIndex, currentIndex + chunkSize);
                    sendEvent("text:delta", chunk);
                    currentIndex += chunkSize;
                    await delay(20);
                }

                // 🌟 요청하신 부분: 펜스 블록 전송이 완전히 끝난 후, LLM이 추가 말을 덧붙이는 상황 모사
                await delay(600); // LLM이 잠시 고민하는 딜레이 (이때 UI에는 그리드가 짠 하고 떠있어야 함)

                const additionalText =
                    "\n\n추가적으로 궁금한 점이 있으신가요? 예를 들어 '한국의 데이터만 필터링해 줘' 혹은 '달성률 기준으로 내림차순 정렬해 줘'와 같이 자유롭게 요청하실 수 있습니다. 필요하다면 차트 분석도 도와드리겠습니다.";

                let addIndex = 0;
                while (addIndex < additionalText.length) {
                    const chunkSize = Math.floor(Math.random() * 3) + 1; // 1~3글자 무작위
                    const chunk = additionalText.slice(addIndex, addIndex + chunkSize);
                    sendEvent("text:delta", chunk);
                    addIndex += chunkSize;
                    await delay(30); // 조금 더 느린 타이핑 속도 모사
                }

                // 3. 텍스트 생성 종료 및 스트림 닫기
                sendEvent("text:end");

                // OpenAI 등 표준 스트림 종료 시그널
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
            } catch (error) {
                console.error("Mock Stream API Error:", error);
                controller.error(error);
            }
        },
    });

    // 브라우저가 버퍼링하지 않고 즉시 스트림으로 인식하도록 헤더 설정
    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
