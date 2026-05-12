"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import KpiAgentGrid from "@/components/KpiAgent";
import { useLlmStream } from "@/components/KpiAgent/useLlmStream";

// =====================================================================
// 1. 타입 정의
// =====================================================================
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    gridData?: any[];
    isExpanded: boolean;
    gridSnapshot?: any;
    isStreamingPending?: boolean;
    viewSpec?: any;
}

type ContentNode = { type: "text"; content: string } | { type: "grid"; spec: any; id: string };

// =====================================================================
// 2. 자식 컴포넌트: 개별 메시지 행 (스트리밍 및 파싱 전담)
// =====================================================================
const ChatMessageRow = ({
    msg,
    toggleGrid,
}: {
    msg: ChatMessage;
    toggleGrid: (id: string) => void;
}) => {
    const [rawText, setRawText] = useState(msg.content || "");
    const [reasoningText, setReasoningText] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);

    const { startStream } = useLlmStream({
        onChunkReceived: chunk => {
            setRawText(prev => prev + chunk);
        },
        onReasoningUpdate: text => setReasoningText(text),
        onStreamStatusChange: status => setIsStreaming(status),
    });

    const hasStarted = useRef(false);

    useEffect(() => {
        if (msg.isStreamingPending && !hasStarted.current) {
            hasStarted.current = true;
            startStream(msg.id);
        }
    }, [msg.isStreamingPending, msg.id, startStream]);

    const contentNodes = useMemo<ContentNode[]>(() => {
        const nodes: ContentNode[] = [];
        const openToken = "```kpi_agent";
        const closeToken = "```";

        let currentIndex = 0;
        let textBuffer = "";

        while (currentIndex < rawText.length) {
            const openIdx = rawText.indexOf(openToken, currentIndex);

            if (openIdx === -1) {
                textBuffer += rawText.substring(currentIndex);

                break;
            }

            textBuffer += rawText.substring(currentIndex, openIdx);

            const contentStartIdx = openIdx + openToken.length;
            const closeIdx = rawText.indexOf(closeToken, contentStartIdx);

            if (closeIdx === -1) {
                break;
            }

            if (textBuffer.trim()) {
                nodes.push({ type: "text", content: textBuffer });
            }
            textBuffer = "";

            const jsonString = rawText.substring(contentStartIdx, closeIdx).trim();
            try {
                const parsedSpec = JSON.parse(jsonString);
                nodes.push({
                    type: "grid",
                    spec: parsedSpec,
                    id: `${msg.id}_grid_${openIdx}`,
                });
            } catch (e) {
                console.warn(`[${msg.id}] JSON 파싱 실패, 텍스트로 대체:`, e);
                nodes.push({ type: "text", content: jsonString });
            }

            currentIndex = closeIdx + closeToken.length;
        }

        if (textBuffer.trim()) {
            nodes.push({ type: "text", content: textBuffer });
        }

        return nodes;
    }, [rawText, msg.id]);

    return (
        <div className="flex flex-col gap-3">
            {reasoningText && msg.isStreamingPending && (
                <div className={`p-4 rounded-lg bg-white self-start shadow-sm w-fit max-w-[80%]`}>
                    <div className="p-2 bg-slate-50 text-slate-500 text-xs font-mono rounded border border-slate-100 whitespace-pre-wrap">
                        <span className="font-bold text-slate-600 block mb-1">🧠 추론 중...</span>
                        {reasoningText}
                    </div>
                </div>
            )}

            {contentNodes.map((node, index) => {
                if (node.type === "text") {
                    return (
                        <div
                            key={`${msg.id}_node_${index}`}
                            className={`p-4 rounded-lg w-fit max-w-[80%] whitespace-pre-wrap leading-relaxed ${
                                msg.role === "user"
                                    ? "bg-blue-500 text-white self-end"
                                    : "bg-white self-start shadow-sm"
                            }`}
                        >
                            {node.content}
                            {isStreaming && index === contentNodes.length - 1 && (
                                <span className="animate-pulse inline-block ml-1 w-2 h-4 bg-blue-500 align-middle" />
                            )}
                        </div>
                    );
                }

                if (node.type === "grid") {
                    const isExpanded = msg.isExpanded || msg.isStreamingPending;

                    return (
                        <div key={node.id} className="flex flex-col gap-2">
                            {!isStreaming && (
                                <div className="p-4 rounded-lg bg-white self-start shadow-sm w-fit">
                                    <button
                                        onClick={() => toggleGrid(msg.id)}
                                        className="text-xs underline opacity-70 text-blue-600 font-medium"
                                    >
                                        {isExpanded ? "데이터 닫기" : "데이터 분석 보기"}
                                    </button>
                                </div>
                            )}

                            {isExpanded && (
                                <div className="w-full bg-white p-4 rounded-xl shadow-md border animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <KpiAgentGrid messageId={msg.id} initialViewSpec={node.spec} />
                                </div>
                            )}
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
};

// =====================================================================
// 3. 부모 컴포넌트: 페이지 라우팅 진입점 (상태 배열 관리)
// =====================================================================
export default function ServerSideChatPage() {
    // 전체 대화 기록을 관리하는 메인 상태
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // 유저의 새로운 질문 입력 시뮬레이션
    const handleNewQuestion = () => {
        const newUserMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: "여기에 대한 국가별 통계를 새로 그려줘.",
            isExpanded: false,
        };
        const newAiMsg: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: "",
            isExpanded: false,
            isStreamingPending: true, // 자식 컴포넌트가 마운트되면서 스트림을 시작하도록 유도
        };
        setMessages(prev => [...prev, newUserMsg, newAiMsg]);
    };

    // 자식 컴포넌트에서 그리드를 열고 닫을 때 부모의 상태를 변경
    const toggleGrid = (id: string) => {
        setMessages(prev =>
            prev.map(msg => (msg.id === id ? { ...msg, isExpanded: !msg.isExpanded } : msg)),
        );
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-y-auto p-4 gap-6 pb-32">
            <div className="sticky top-0 bg-white/80 backdrop-blur p-3 rounded shadow z-10 text-center">
                <button
                    onClick={handleNewQuestion}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                    새 스트리밍 메시지 시뮬레이션
                </button>
            </div>

            {/* 메인 상태(messages) 배열을 순회하며 자식 컴포넌트(ChatMessageRow)를 마운트 */}
            {messages.map(msg => (
                <ChatMessageRow key={msg.id} msg={msg} toggleGrid={toggleGrid} />
            ))}
        </div>
    );
}
