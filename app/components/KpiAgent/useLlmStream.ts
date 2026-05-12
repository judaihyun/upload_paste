// src/components/KpiAgent/useLlmStream.ts
import { useCallback, useRef, useEffect } from "react";

export interface LlmStreamCallbacks {
    onChunkReceived: (chunk: string) => void; // 🌟 텍스트 조각(delta)만 그대로 던짐
    onReasoningUpdate: (reasoning: string) => void;
    onStreamStatusChange: (isStreaming: boolean) => void;
}

export function useLlmStream(callbacks: LlmStreamCallbacks) {
    const callbacksRef = useRef(callbacks);

    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    const startStream = useCallback(async (messageId: string) => {
        const { onChunkReceived, onReasoningUpdate, onStreamStatusChange } = callbacksRef.current;

        onStreamStatusChange(true);
        onReasoningUpdate("");

        let accumulatedReasoning = "";

        try {
            const response = await fetch("/api/mock-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.body) throw new Error("ReadableStream not supported in this browser.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.indexOf("\n\n");

                // 🌟 [핵심 방어 코드] 1틱(Tick) 동안 들어온 텍스트 조각을 모을 임시 버퍼
                let tickTextChunk = "";

                // 이 while 문은 뭉탱이로 들어온 네트워크 패킷을 하나하나 뜯어보는 과정입니다.
                // 수십 번을 빠르게 회전합니다.
                while (boundary !== -1) {
                    const message = buffer.slice(0, boundary).trim();
                    buffer = buffer.slice(boundary + 2);

                    if (message.startsWith("data:")) {
                        const jsonStr = message.replace(/^data:\s*/, "");

                        try {
                            if (jsonStr === "[DONE]") break;

                            const event = JSON.parse(jsonStr);

                            if (event.type === "reasoning:delta") {
                                accumulatedReasoning += event.content;
                                onReasoningUpdate(accumulatedReasoning);
                            } else if (event.type === "text:delta") {
                                // 🚨 여기서 setState를 직접 때리지 않고 임시 버퍼에 누적만 시킵니다!
                                tickTextChunk += event.content;
                            }
                        } catch (err) {
                            console.warn("SSE JSON Parse Error. Message:", message, err);
                        }
                    }
                    boundary = buffer.indexOf("\n\n");
                }

                // 🌟 [해결점] 패킷 파싱 루프가 완전히 끝난 뒤, 모아둔 텍스트가 있다면 딱 1번만 상태 업데이트!
                if (tickTextChunk) {
                    onChunkReceived(tickTextChunk);
                }
            }
        } catch (error) {
            console.error("Stream connection failed:", error);
        } finally {
            onStreamStatusChange(false);
        }
    }, []);

    return { startStream };
}
