"use client";
import CustomToolPanel from "@/components/CustomToolPanel";
import AG_GRID_KEY from "@/constants/key";
import {
    IServerSideDatasource,
    IServerSideGetRowsParams,
    AllEnterpriseModule,
    IntegratedChartsModule,
    FirstDataRenderedEvent,
    ChartToolPanelsDef,
    SideBarDef,
    ValidationModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";

interface DataWidgetProps {
    messageId: string;
}

export default function DataWidget({ messageId }: DataWidgetProps) {
    const gridRef = useRef<AgGridReact>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    const [domLayout, setDomLayout] = useState<"normal" | "autoHeight">("normal");

    // 🌟 1. 컬럼 정의를 React State로 관리
    const [columnDefs, setColumnDefs] = useState<any[]>([]);

    const onPaginationChanged = useCallback((params: any) => {
        const pageSize = params.api.paginationGetPageSize();
        if (pageSize <= 10) {
            setDomLayout("autoHeight");
            setTimeout(() => params.api.setGridOption("domLayout", "autoHeight"), 0);
        } else {
            setDomLayout("normal");
            setTimeout(() => params.api.setGridOption("domLayout", "normal"), 0);
        }
    }, []);

    // 🌟 2. 초기 뼈대(Schema)를 구성하기 위한 useEffect
    useEffect(() => {
        // 실제로는 "컬럼 스키마만 가져오는 API"를 호출하는 것이 이상적입니다.
        fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
            .then(resp => resp.json())
            .then(data => {
                if (data && data.length > 0) {
                    const firstRow = data[0];
                    const dynamicColumns = Object.keys(firstRow).map(key => ({
                        field: key,
                        filter: true,
                        sortable: true,
                    }));
                    setColumnDefs(dynamicColumns); // 상태 업데이트 -> 그리드 리렌더링
                }
            });
    }, []);

    // 🌟 3. 완전히 분리된 데이터소스 선언 (useMemo 활용)
    const serverSideDatasource = useMemo<IServerSideDatasource>(() => {
        return {
            getRows: (params: IServerSideGetRowsParams) => {
                console.log(`[${messageId}] 🚀 사용자 액션(필터/정렬/페이징):`, params.request);

                // API 호출을 흉내내는 블록
                fetch("https://www.ag-grid.com/example-assets/olympic-winners.json")
                    .then(resp => resp.json())
                    .then(data => {
                        const { startRow, endRow } = params.request;

                        // 단순 반환 및 페이징 시뮬레이션
                        setTimeout(() => {
                            params.success({
                                rowData: data.slice(startRow, endRow),
                                rowCount: data.length,
                            });
                        }, 200);
                    })
                    .catch(() => {
                        params.fail();
                    });
            },
        };
    }, [messageId]); // messageId가 바뀔 때만 재설정됨

    const onFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
        const chartContainerElement = chartContainerRef.current;
        if (!chartContainerElement) return;

        try {
            params.api.createRangeChart({
                chartType: "groupedColumn",
                cellRange: { rowStartIndex: 0, rowEndIndex: 99, columns: ["age", "year"] },
                chartContainer: chartContainerElement,
            });
        } catch (e) {
            console.log("차트를 그릴 컬럼이 부족합니다.");
        }
    }, []);

    const sideBarConfig: SideBarDef = useMemo(
        () => ({
            toolPanels: [
                {
                    id: "columns",
                    labelDefault: "Columns",
                    labelKey: "columns",
                    iconKey: "columns", // ag-Grid 내장 아이콘
                    toolPanel: "agColumnsToolPanel",
                },
                {
                    id: "filters",
                    labelDefault: "Filters",
                    labelKey: "filters",
                    iconKey: "filter", // ag-Grid 내장 아이콘
                    toolPanel: "agFiltersToolPanel",
                },
                {
                    id: "customToolPanel",
                    labelDefault: "Custom Tool Panel",
                    labelKey: "customToolPanel",
                    iconKey: "menu",
                    toolPanel: CustomToolPanel,
                },
            ],
            defaultToolPanel: "customToolPanel", // 처음에 열려있을 패널 ID
        }),
        [],
    );

    const chartToolPanelsDef: ChartToolPanelsDef = useMemo(
        () => ({ defaultToolPanel: "settings" }),
        [],
    );

    return (
        <div className="flex-col w-full">
            <AgGridProvider
                modules={[
                    AllEnterpriseModule,
                    IntegratedChartsModule.with(AgChartsEnterpriseModule),
                    ValidationModule,
                ]}
                licenseKey={AG_GRID_KEY}
            >
                <div
                    className="ag-theme-quartz mb-4 w-full"
                    style={{
                        height: domLayout === "autoHeight" ? "auto" : "450px",
                        display: "block",
                    }}
                >
                    <AgGridReact
                        ref={gridRef}
                        onFirstDataRendered={onFirstDataRendered}
                        rowModelType="serverSide"
                        // 🌟 4. JSX의 Props로 선언적으로 주입!
                        columnDefs={columnDefs}
                        serverSideDatasource={serverSideDatasource}
                        pagination={true}
                        domLayout={domLayout}
                        cellSelection={true}
                        enableCharts={true}
                        paginationPageSize={100}
                        paginationPageSizeSelector={[5, 10, 20, 50, 100]}
                        onPaginationChanged={onPaginationChanged}
                        chartToolPanelsDef={chartToolPanelsDef}
                        allowDragFromColumnsToolPanel={true}
                        sideBar={sideBarConfig}
                    />
                </div>
                <div
                    ref={chartContainerRef}
                    className="mt-4 h-96 w-full border rounded bg-white shadow-sm"
                />
            </AgGridProvider>
        </div>
    );
}
