"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { AllEnterpriseModule, ModuleRegistry } from "ag-grid-enterprise";

import { useLlmStream } from "@/components/KpiAgent/useLlmStream";
import { KpiAgentGrid } from "@/components/KpiAgent/ui/KpiAgentGrid";

// 모듈 레지스트리 등록
ModuleRegistry.registerModules([AllEnterpriseModule]);

// =====================================================================
// 1. 타입 및 훅 정의 (useLlmStream)
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

    // 🌟 핵심 추가: 메시지 전체 영역 접기/펼치기 로컬 상태
    const [isMessageCollapsed, setIsMessageCollapsed] = useState(false);

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
        <div
            className={`flex flex-col w-full mb-8 ${msg.role === "user" ? "items-end" : "items-start"}`}
        >
            {/* 🌟 수정됨: 화자 표시 및 전체 메시지 접기/펼치기 토글 영역 */}
            <div className="flex justify-between items-center w-full max-w-3xl mb-1">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    [{msg.role === "user" ? "USER" : "AI AGENT"}]
                </div>

                {/* AI 답변일 경우에만, 그리고 스트리밍이 끝났을 때만 전체 토글 허용 */}
                {msg.role === "assistant" && !isStreaming && (
                    <button
                        onClick={() => setIsMessageCollapsed(!isMessageCollapsed)}
                        className="px-2 py-1 text-[10px] font-bold border border-gray-400 bg-gray-100 hover:bg-gray-200 uppercase text-gray-600"
                    >
                        {isMessageCollapsed ? "▼ EXPAND MESSAGE" : "▲ COLLAPSE MESSAGE"}
                    </button>
                )}
            </div>

            {/* 🌟 핵심 분기: 메시지가 접혔을 때와 펼쳐졌을 때 렌더링 분리 */}
            {isMessageCollapsed ? (
                // 1. 메시지가 접혔을 때 (요약 표시)
                <div
                    onClick={() => setIsMessageCollapsed(false)}
                    className="w-full max-w-3xl border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs text-gray-400 font-bold tracking-widest cursor-pointer hover:bg-gray-100 uppercase"
                >
                    [RESPONSE HIDDEN - CLICK TO EXPAND]
                </div>
            ) : (
                // 2. 메시지가 펼쳐졌을 때 (기존 렌더링 유지)
                <>
                    {/* 추론 영역 */}
                    {reasoningText && msg.isStreamingPending && (
                        <div className="w-full max-w-3xl border-2 border-dashed border-gray-400 bg-gray-50 p-4 mb-4">
                            <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-2">
                                <span className="text-sm font-bold text-gray-600">
                                    REASONING PROCESS
                                </span>
                                <span className="text-xs text-gray-500 animate-pulse">
                                    Processing...
                                </span>
                            </div>
                            <div className="font-mono text-sm text-gray-600 whitespace-pre-wrap">
                                {reasoningText}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 w-full max-w-3xl">
                        {contentNodes.map((node, index) => {
                            if (node.type === "text") {
                                return (
                                    <div
                                        key={`${msg.id}_node_${index}`}
                                        className={`p-4 border border-black whitespace-pre-wrap leading-relaxed ${
                                            msg.role === "user" ? "bg-gray-200" : "bg-white"
                                        }`}
                                    >
                                        {node.content}
                                        {isStreaming && index === contentNodes.length - 1 && (
                                            <span className="inline-block ml-2 w-2 h-4 bg-black animate-pulse align-middle" />
                                        )}
                                    </div>
                                );
                            }

                            if (node.type === "grid") {
                                const isExpanded = msg.isExpanded || msg.isStreamingPending;

                                return (
                                    <div
                                        key={node.id}
                                        className="flex flex-col w-full border-2 border-gray-800 bg-gray-100 p-2"
                                    >
                                        {/* 🌟 내부 데이터 모듈(AG Grid/Chart) 전용 토글 */}
                                        {!isStreaming && (
                                            <div className="flex justify-between items-center bg-gray-300 p-2 border border-gray-400">
                                                <span className="text-sm font-bold text-gray-800">
                                                    [DATA MODULE]
                                                </span>
                                                <button
                                                    onClick={() => toggleGrid(msg.id)}
                                                    className="px-3 py-1 text-xs font-bold border border-black bg-white hover:bg-gray-200"
                                                >
                                                    {isExpanded ? "HIDE MODULE" : "SHOW MODULE"}
                                                </button>
                                            </div>
                                        )}

                                        {isExpanded && (
                                            <div className="w-full mt-2 flex flex-col gap-4">
                                                {/* 1. AG Grid 렌더링 영역 */}
                                                <div className="w-full bg-white relative">
                                                    <KpiAgentGrid
                                                        messageId={msg.id}
                                                        initialViewSpec={node.spec}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// =====================================================================
// 4. 부모 컴포넌트: 페이지 라우팅 진입점
// =====================================================================
export default function ServerSideChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

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
            isStreamingPending: true,
        };
        setMessages(prev => [...prev, newUserMsg, newAiMsg]);
    };

    const toggleGrid = (id: string) => {
        setMessages(prev =>
            prev.map(msg => (msg.id === id ? { ...msg, isExpanded: !msg.isExpanded } : msg)),
        );
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-white font-sans">
            {/* 상단 헤더 */}
            <div className="w-full border-b-2 border-black bg-gray-100 p-4 shrink-0 flex justify-between items-center">
                <h1 className="text-lg font-bold uppercase tracking-wider text-black">
                    [APP HEADER] KPI Agent Workspace
                </h1>
            </div>

            {/* 메인 챗 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 w-full max-w-5xl mx-auto border-x-2 border-dashed border-gray-200">
                {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 m-8 font-bold tracking-widest uppercase">
                        [EMPTY CHAT AREA]
                    </div>
                )}

                {messages.map(msg => (
                    <ChatMessageRow key={msg.id} msg={msg} toggleGrid={toggleGrid} />
                ))}
            </div>

            {/* 하단 LLM 프롬프트 영역 */}
            <div className="w-full border-t-2 border-black bg-gray-100 p-6 shrink-0 safe-area-bottom">
                <div className="w-full max-w-5xl mx-auto relative flex items-center">
                    <input
                        type="text"
                        placeholder="[INPUT FIELD] Type your message here..."
                        readOnly
                        className="w-full border-2 border-black bg-white h-14 pl-4 pr-16 text-black font-mono text-sm outline-none"
                    />
                    <button
                        onClick={handleNewQuestion}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white px-4 py-2 font-bold hover:bg-gray-800 flex items-center justify-center border border-black"
                        title="Send Message"
                    >
                        ↑ SEND
                    </button>
                </div>
            </div>
        </div>
    );
}
