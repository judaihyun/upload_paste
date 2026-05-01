"use client";
import React, { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { themeQuartz } from "ag-grid-community";

interface CellRendererProps {
    data: any[][];
    isSwitching: boolean;
    onRenderComplete?: () => void;
}

export default function CellRenderer({ data, isSwitching, onRenderComplete }: CellRendererProps) {
    if (!data || data.length === 0) return null;

    // 1. 최소한의 엔진 보호: 데이터의 실제 최대 열 개수 계산 (더티 데이터 크래시 방지)
    const maxCols = useMemo(() => {
        let max = 0;
        const limit = Math.min(data.length, 1000);
        for (let i = 0; i < limit; i++) {
            if (data[i] && data[i].length > max) {
                max = data[i].length;
            }
        }
        return max === 0 ? 1 : max;
    }, [data]);

    // 💡 2. 컬럼 정의: field 대신 valueGetter 사용
    const columnDefs = useMemo(() => {
        const headerRow = data[0] || [];
        const cols = [];

        for (let i = 0; i < maxCols; i++) {
            const headerVal = headerRow[i];
            cols.push({
                headerName:
                    headerVal !== undefined && headerVal !== ""
                        ? String(headerVal)
                        : `Col ${i + 1}`,
                // 🚀 핵심 방어 로직: 객체의 field(예: "col_0")를 찾는 대신, 배열의 인덱스(i)로 직접 접근합니다.
                valueGetter: (params: any) => {
                    return params.data ? params.data[i] : "";
                },
                sortable: true,
                filter: true,
                resizable: true,
                minWidth: 100,
                cellClass: "text-center",
                headerClass: "text-center bg-gray-50 text-gray-700",
            });
        }
        return cols;
    }, [data, maxCols]);

    // 💡 3. 순수 데이터 매핑: map() 객체 변환을 완전히 제거!
    const rowData = useMemo(() => {
        if (data.length <= 1) return [];

        // 객체로 변환하지 않고, 파싱된 2차원 원시 배열을 얕은 복사(Shallow Copy)로 그대로 던집니다.
        // 메모리 팽창률 0%
        return data.slice(1);
    }, [data]);

    const myTheme = themeQuartz.withParams({
        spacing: 8,
        accentColor: "#2563eb",
    });

    return (
        <div className="w-full h-full relative bg-white">
            {isSwitching && (
                <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm font-bold text-blue-600 font-mono tracking-wider">
                            GRID SYNCING...
                        </span>
                    </div>
                </div>
            )}

            <div className="w-full h-full">
                <AgGridReact
                    theme={myTheme}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    onFirstDataRendered={() => {
                        if (onRenderComplete) onRenderComplete();
                    }}
                    animateRows={false} // 대용량 렌더링을 위해 애니메이션 OFF
                    domLayout="normal"
                />
            </div>
        </div>
    );
}
