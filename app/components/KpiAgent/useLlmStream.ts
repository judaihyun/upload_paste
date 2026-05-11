import { useState, useCallback, useRef } from "react";

export interface StreamState {
    text: string;
    viewSpec: any | null;
    isStreaming: boolean;
    reasoningText: string;
}

export function useLlmStream() {
    const [state, setState] = useState<StreamState>({
        text: "",
        viewSpec: null,
        isStreaming: false,
        reasoningText: "",
    });

    // 중복 파싱을 막기 위한 로컬 상태 참조
    const specParsedRef = useRef(false);

    const startStream = useCallback(async (messageId: string) => {
        // 초기화
        setState({ text: "", viewSpec: null, isStreaming: true, reasoningText: "" });
        specParsedRef.current = false;

        let accumulatedText = "";
        let accumulatedReasoning = "";

        try {
            // 실제 API 경로로 수정
            const response = await fetch("/api/mock-stream", {
                method: "POST", // 실 API는 POST일 확률이 높음
                headers: { "Content-Type": "application/json" },
            });

            if (!response.body) throw new Error("ReadableStream not supported in this browser.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 1. 청크 디코딩 및 버퍼 누적
                // { stream: true } 옵션은 멀티바이트 문자(한글)가 청크 경계에서 잘렸을 때 깨짐을 방지합니다.
                buffer += decoder.decode(value, { stream: true });

                // 2. 완벽한 하나의 SSE 메시지(\n\n)가 완성되었는지 확인
                let boundary = buffer.indexOf("\n\n");
                while (boundary !== -1) {
                    const message = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 2); // 처리한 메시지는 버퍼에서 제거

                    if (message.startsWith("data:")) {
                        const jsonStr = message.replace(/^data:\s*/, "");

                        try {
                            // SSE 종료 시그널 처리 (OpenAI 표준 대응)
                            if (jsonStr === "[DONE]") break;

                            const event = JSON.parse(jsonStr);

                            // --- 이벤트 타입에 따른 라우팅 ---
                            if (event.type === "reasoning:delta") {
                                accumulatedReasoning += event.content;
                                setState(prev => ({
                                    ...prev,
                                    reasoningText: accumulatedReasoning,
                                }));
                            } else if (event.type === "text:delta") {
                                accumulatedText += event.content;

                                // 상태 업데이트 (React 렌더링 큐에 등록)
                                setState(prev => ({ ...prev, text: accumulatedText }));

                                // 🌟 3. 마크다운 펜스 파싱 (비용 최적화: 1회 성공 후 스킵)
                                if (!specParsedRef.current) {
                                    const match = accumulatedText.match(
                                        /```kpi_agent\s*([\s\S]*?)\s*```/,
                                    );
                                    if (match && match[1]) {
                                        try {
                                            const parsedSpec = JSON.parse(match[1]);
                                            specParsedRef.current = true; // 파싱 성공 마킹
                                            setState(prev => ({ ...prev, viewSpec: parsedSpec }));
                                            console.log(
                                                `[${messageId}] 🚀 스펙 파싱 완료, 그리드 마운트 트리거!`,
                                                parsedSpec,
                                            );
                                        } catch (e) {
                                            // JSON 파싱 실패는 무시 (아직 청크가 덜 와서 닫히는 ```만 일치했을 수 있음)
                                        }
                                    }
                                }
                            }
                        } catch (err) {
                            console.warn("SSE JSON Parse Error. Message:", message, err);
                            // JSON 파싱 에러가 나더라도 스트림 전체를 죽이지 않고 다음 청크를 기다립니다.
                        }
                    }

                    // 다음 메시지가 버퍼에 있는지 재검사
                    boundary = buffer.indexOf("\n\n");
                }
            }
        } catch (error) {
            console.error("Stream connection failed:", error);
        } finally {
            setState(prev => ({ ...prev, isStreaming: false }));
        }
    }, []);

    return { ...state, startStream };
}
