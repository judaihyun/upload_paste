import { NextResponse } from "next/server";

// Vercel 등 배포 환경에서 실제 스트리밍을 지원하기 위해 Edge 런타임 사용 강제
export const runtime = "edge";

// 🌟 언제든 마음대로 수정할 수 있는 Fake Schema 데이터 (기획/백엔드 스펙에 맞춰 수정)
const FAKE_SCHEMA_PAYLOAD = {
    title: "KPI 에이전트 분석 결과",
    columns: [
        { field: "category", headerName: "분류", type: "string" },
        { field: "value", headerName: "달성률", type: "number" },
        { field: "status", headerName: "상태", type: "string" },
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

                // 🌟 LLM이 생성할 전체 텍스트 (마크다운 펜스 + JSON)
                const jsonString = JSON.stringify(FAKE_SCHEMA_PAYLOAD, null, 2);
                const fullText = `분석이 완료되었습니다.\n\n\`\`\`kpi_agent\n${jsonString}\n\`\`\`\n\n위의 스펙을 바탕으로 그리드를 렌더링합니다.`;

                // 🚀 핵심: 무작위 파편화 (Random Token Chunking)
                // 실제 LLM처럼 1~4글자 단위로 문자열을 무자비하게 쪼개어 스트림으로 방출합니다.
                // 이를 통해 프론트엔드의 정규식 파서가 분절된 마크다운(예: ` ```kp ` 와 `i_agent `)에서
                // 에러를 뿜지 않고 잘 대기하는지 완벽하게 검증할 수 있습니다.
                let currentIndex = 0;
                while (currentIndex < fullText.length) {
                    const chunkSize = Math.floor(Math.random() * 4) + 1; // 1~4글자 무작위
                    const chunk = fullText.slice(currentIndex, currentIndex + chunkSize);

                    sendEvent("text:delta", chunk);

                    currentIndex += chunkSize;
                    await delay(20); // 20ms 간격으로 청크 전송
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
