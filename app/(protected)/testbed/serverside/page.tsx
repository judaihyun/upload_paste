"use client";
import { useState, useEffect, useRef } from "react";
// import DataWidget from "@/components/DataWidget";
// import KpiAgentGrid from "@/components/KpiAgent/ui/KpiAgentGrid";
import { useLlmStream } from "@/components/KpiAgent/useLlmStream";
import KpiAgentGrid from "@/components/KpiAgent";

// 1. 기존 타입 유지 + 스트리밍 플래그 추가
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    gridData?: any[];
    isExpanded: boolean;
    gridSnapshot?: any;

    // 🌟 추가됨: 이 메시지가 현재 스트리밍 대상인지 여부
    isStreamingPending?: boolean;
    // 🌟 추가됨: 백엔드에서 확정되어 내려온 스펙 (과거 대화용)
    viewSpec?: any;
}

// 🌟 2. 렌더링 격리용 하위 컴포넌트 (핵심)
// 배열 전체가 리렌더링되는 것을 막기 위해 스트리밍 로직은 이 안에서만 돕니다.
const ChatMessageRow = ({
    msg,
    toggleGrid,
}: {
    msg: ChatMessage;
    toggleGrid: (id: string) => void;
}) => {
    // 스트림 훅 연결
    const {
        text,
        viewSpec: streamedViewSpec,
        isStreaming,
        reasoningText,
        startStream,
    } = useLlmStream();
    const hasStarted = useRef(false);

    // 마운트 시 이 메시지가 '스트리밍 대기' 상태라면 스트림 시작
    useEffect(() => {
        if (msg.isStreamingPending && !hasStarted.current) {
            hasStarted.current = true;
            startStream(msg.id);
        }
    }, [msg.isStreamingPending, msg.id, startStream]);

    // 노출할 텍스트 결정 (스트리밍 중이면 스트림 텍스트, 과거 대화면 확정 텍스트)
    const displayText = msg.isStreamingPending ? text : msg.content;

    // 노출할 스펙 결정 (스트리밍 파싱 스펙 vs 과거 DB에 저장된 스펙)
    const effectiveViewSpec = msg.isStreamingPending ? streamedViewSpec : msg.viewSpec;

    return (
        <div className="flex flex-col gap-2">
            {/* 말풍선 영역 */}
            <div
                className={`p-4 rounded-lg w-fit max-w-[80%] ${
                    msg.role === "user"
                        ? "bg-blue-500 text-white self-end"
                        : "bg-white self-start shadow-sm"
                }`}
            >
                {/* 1. 추론 과정 UI (스트리밍 중에만 노출) */}
                {reasoningText && msg.isStreamingPending && (
                    <div className="mb-3 p-2 bg-slate-50 text-slate-500 text-xs font-mono rounded border border-slate-100 whitespace-pre-wrap">
                        <span className="font-bold text-slate-600 block mb-1">🧠 추론 중...</span>
                        {reasoningText}
                    </div>
                )}

                {/* 2. 메인 텍스트 영역 */}
                <div className="whitespace-pre-wrap leading-relaxed">
                    {/* 마크다운 펜스 블록 화면 숨김 처리 (정규식 치환) */}
                    {displayText.replace(/```kpi_agent[\s\S]*?```/g, "")}
                    {isStreaming && (
                        <span className="animate-pulse inline-block ml-1 w-2 h-4 bg-blue-500 align-middle" />
                    )}
                </div>

                {/* 3. 데이터 분석 토글 버튼 (AI 응답이고, 스펙이 존재할 때만 노출) */}
                {msg.role === "assistant" && effectiveViewSpec && !isStreaming && (
                    <button
                        onClick={() => toggleGrid(msg.id)}
                        className="mt-3 text-xs underline opacity-70 text-blue-600 font-medium hover:opacity-100 transition-opacity block"
                    >
                        {msg.isExpanded ? "데이터 닫기" : "데이터 분석 보기"}
                    </button>
                )}
            </div>

            {/* 4. 그리드 위젯 렌더링 영역 */}
            {/* 스트리밍 중 스펙이 튀어나왔거나(자동 펼침), 유저가 펼치기를 눌렀을 때 */}
            {(msg.isExpanded || (msg.isStreamingPending && effectiveViewSpec)) && (
                <div className="w-full bg-white p-4 rounded-xl shadow-md border animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* KpiAgentGrid가 import 되어있다고 가정하고 더미 div로 대체합니다 */}
                    <KpiAgentGrid messageId={msg.id} initialViewSpec={effectiveViewSpec} />
                </div>
            )}
        </div>
    );
};

// =====================================================================
// 메인 페이지 컴포넌트
// =====================================================================
export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // 유저의 새로운 질문 입력 (테스트용)
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
            content: "", // 초기 텍스트 비어있음
            isExpanded: false,
            isStreamingPending: true, // 🌟 스트림 시작 트리거 플래그
        };
        setMessages(prev => [...prev, newUserMsg, newAiMsg]);
    };

    const toggleGrid = (id: string) => {
        setMessages(prev =>
            prev.map(msg => (msg.id === id ? { ...msg, isExpanded: !msg.isExpanded } : msg)),
        );
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-y-auto p-4 gap-6 pb-32">
            {/* 테스트용 버튼 패널 */}
            <div className="sticky top-0 bg-white/80 backdrop-blur p-3 rounded shadow z-10 text-center">
                <button
                    onClick={handleNewQuestion}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                >
                    새 스트리밍 메시지 시뮬레이션
                </button>
            </div>

            {/* 메시지 리스트 렌더링 */}
            {messages.map(msg => (
                <ChatMessageRow key={msg.id} msg={msg} toggleGrid={toggleGrid} />
            ))}
        </div>
    );
}
