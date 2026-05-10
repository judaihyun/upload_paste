"use client";
import DataWidget from "@/components/DataWidget";
import { useState } from "react";

// 타입을 명확히 정의합니다.
interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    gridData?: any[]; // 이 메시지에 포함된 그리드 데이터
    isExpanded: boolean; // 그리드가 펼쳐져 있는지 여부
    gridSnapshot?: any; // (지난번에 논의한) 필터, 정렬 백업본
}

export default function ChatPage() {
    const [messages, setMessages] = useState([
        {
            id: "1",
            role: "assistant",
            content: "안녕하세요! 어떤 데이터를 분석해 드릴까요?",
            isExpanded: false,
        },
        {
            id: "2",
            role: "user",
            content: "최근 올림픽 우승자들의 통계 데이터를 보고 싶어.",
            isExpanded: false,
        },
        {
            id: "3",
            role: "assistant",
            content: "네, 요청하신 올림픽 데이터를 가져왔습니다. 아래에서 상세 내용을 확인하세요.",
            isExpanded: false, // 첫 데이터는 바로 보이게 설정
            gridData: [],
        },
        {
            id: "4",
            role: "user",
            content: "여기서 20대 선수들만 필터링해줄 수 있어?",
            isExpanded: false,
        },
        {
            id: "5",
            role: "assistant",
            content:
                "필터 조종기 탭을 이용하시거나, Age 컬럼의 필터 메뉴를 통해 20세에서 29세 사이를 설정하시면 실시간으로 서버에서 데이터를 가져옵니다.",
            isExpanded: false,
        },
        {
            id: "6",
            role: "user",
            content: "알겠어. 다른 종목 데이터도 추가해줘.",
            isExpanded: false,
        },
        {
            id: "7",
            role: "assistant",
            content:
                "데이터 업데이트가 완료되었습니다. 현재 총 8,618건의 레코드가 로드되어 있습니다.",
            isExpanded: false,
            gridData: [],
        },
        {
            id: "8",
            role: "user",
            content: "데이터가 너무 많은데 성능은 괜찮나?",
            isExpanded: false,
        },
        {
            id: "9",
            role: "assistant",
            content:
                "본 시스템은 SSRM(Server-Side Row Model)을 사용하여 100만 건 이상의 데이터도 브라우저 메모리 부하 없이 페이징 처리합니다.",
            isExpanded: false,
        },

        // --- 스크롤 테스트를 위한 대량의 일반 대화 추가 ---
        ...Array.from({ length: 50 }).map((_, i) => ({
            id: `dummy-${i}`,
            role: i % 2 === 0 ? "user" : "assistant",
            content:
                `${i + 10}번째 추가 질문/답변입니다. 가상화 리스트가 제대로 동작하는지 확인하기 위한 긴 대화 내용입니다. `.repeat(
                    2,
                ),
            isExpanded: true,
        })),

        // --- 하단에 다시 데이터 위젯 포함 응답 추가 ---
        {
            id: "25",
            role: "assistant",
            content: "마지막으로 요청하신 국가별 금메달 합계 분석 결과입니다.",
            isExpanded: false,
            gridData: [],
        },
        {
            id: "26",
            role: "user",
            content: "차트가 자동으로 그려지는지 확인해볼게.",
            isExpanded: false,
        },
        {
            id: "27",
            role: "assistant",
            content: "네, 데이터 렌더링 직후 하단 컨테이너에 차트가 자동으로 생성됩니다.",
            isExpanded: false,
            gridData: [],
        },
        { id: "28", role: "user", content: "수고했어.", isExpanded: false },
        {
            id: "29",
            role: "assistant",
            content: "언제든 필요한 분석이 있으면 말씀해 주세요!",
            isExpanded: false,
        },
        {
            id: "30",
            role: "assistant",
            content: "시스템 정합성 테스트를 위해 하나 더 펼쳐둔 위젯입니다.",
            isExpanded: true,
            gridData: [],
        },
    ]);

    // 그리드 펼치기/접기 토글 함수
    const toggleGrid = (id: string) => {
        setMessages(prev =>
            prev.map(msg => (msg.id === id ? { ...msg, isExpanded: !msg.isExpanded } : msg)),
        );
    };

    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-y-auto p-4 gap-6">
            {messages.map(msg => (
                <div key={msg.id} className="flex flex-col gap-2">
                    {/* 말풍선 영역 */}
                    <div
                        className={`p-4 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white self-end" : "bg-white self-start shadow-sm"}`}
                    >
                        {msg.content}
                        {msg.role === "assistant" && (
                            <button
                                onClick={() => toggleGrid(msg.id)}
                                className="ml-4 text-xs underline opacity-70"
                            >
                                {msg.isExpanded ? "데이터 접기" : "데이터 분석 보기"}
                            </button>
                        )}
                    </div>

                    {/* 그리드/차트 위젯 영역 (펼쳐졌을 때만 렌더링) */}
                    {msg.isExpanded && (
                        <div className="w-full bg-white p-4 rounded-xl shadow-md border animate-in fade-in duration-300">
                            <DataWidget
                                messageId={msg.id}
                                // initialSnapshot={msg.gridSnapshot}
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
