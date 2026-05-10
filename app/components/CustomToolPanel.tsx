import React, { useState, useEffect } from "react";
import { IToolPanelParams } from "ag-grid-community";

export default function CustomToolPanel(props: IToolPanelParams) {
    const [rowCount, setRowCount] = useState(0);

    useEffect(() => {
        const onModelUpdated = () => setRowCount(props.api.getDisplayedRowCount());
        props.api.addEventListener("modelUpdated", onModelUpdated);
        return () => props.api.removeEventListener("modelUpdated", onModelUpdated);
    }, [props.api]);

    // 🔥 핵심 로직: 모든 필터와 정렬 상태를 초기화
    const handleResetAll = () => {
        // 1. 모든 필터 상태 날리기 (null 주입)
        props.api.setFilterModel(null);

        // 2. 모든 컬럼의 정렬 상태 초기화
        // (참고: 구버전의 columnApi 대신 최신 버전은 api.applyColumnState를 사용합니다)
        props.api.applyColumnState({
            defaultState: { sort: null }, // 모든 컬럼의 sort를 null로 덮어씀
        });

        // 필요하다면 컬럼 순서/숨김 상태도 초기화 가능
        // props.api.resetColumnState();
    };

    const applyQuickFilter = () => {
        props.api.setFilterModel({
            status: { filterType: "text", type: "equals", filter: "완료" },
        });
    };

    return (
        <div className="h-full flex flex-col p-4 bg-white gap-4">
            <div className="flex-none flex justify-between items-center mb-2">
                <h2 className="font-bold text-gray-800">대시보드 컨트롤러</h2>

                {/* 초기화 버튼 배치 */}
                <button
                    onClick={handleResetAll}
                    className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                >
                    초기화 ↺
                </button>
            </div>

            <div className="flex-none p-3 bg-gray-50 border rounded text-center">
                <p className="text-sm text-gray-500">현재 로드된 데이터</p>
                <p className="text-xl font-bold">{rowCount} 건</p>
            </div>

            <div className="flex-1 border-t pt-4">
                <button
                    onClick={applyQuickFilter}
                    className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                    완료 상태만 보기
                </button>
            </div>
        </div>
    );
}
