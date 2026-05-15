import { useCallback, useEffect, useRef, useState } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import {
    AllEnterpriseModule,
    IntegratedChartsModule,
    ModuleRegistry,
    ValidationModule,
} from "ag-grid-enterprise";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import AG_GRID_KEY from "@/constants/key";
import { useWidgetManager } from "../useAgentManager";
import { PAGINATIONS } from "../adapter/agent.adapter";
import { widgetChartToolPanelsDef, widgetSideBarConfig } from "../config/agent.config";

ModuleRegistry.registerModules([AllEnterpriseModule]);

interface KpiAgentGridProps {
    messageId: string;
    initialViewSpec?: any;
}

export function KpiAgentGrid({ messageId, initialViewSpec }: KpiAgentGridProps) {
    const gridARef = useRef<AgGridReact>(null);
    const gridBRef = useRef<AgGridReact>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [bGridData, setBGridData] = useState<any[]>([]);

    // A그리드용 데이터 및 메타데이터 관리 훅
    const { domLayout, onGridReady, columnDefs, onPaginationChanged } = useWidgetManager(
        messageId,
        initialViewSpec,
        data => setBGridData(data),
    );

    // B그리드(통계용) 명시적 상태

    // [테스트 시뮬레이션] A그리드 필터 조작 후 통계 데이터를 가져왔다고 가정
    const handleSimulateDataFetch = () => {
        const mockAggregateData = [
            // 🌟 수정됨: category -> athlete, value -> gold 로 변경
            { athlete: "USA", gold: Math.floor(Math.random() * 1000) },
            { athlete: "KOR", gold: Math.floor(Math.random() * 1000) },
            { athlete: "JPN", gold: Math.floor(Math.random() * 1000) },
            { athlete: "CHN", gold: Math.floor(Math.random() * 1000) },
        ];

        // B그리드의 데이터 상태만 변경 (AG Grid가 이를 감지하고 스스로 렌더링함)
        setBGridData(mockAggregateData);
    };

    // 🌟 핵심 파이프라인: B그리드 데이터가 세팅되면, 약간의 지연 후 차트를 렌더링
    useEffect(() => {
        const apiB = gridBRef.current?.api;

        // 아직 데이터가 없거나, DOM이 마운트되지 않았으면 중단
        if (!apiB || bGridData.length === 0 || !chartContainerRef.current) return;

        // AG Grid의 가상화 엔진이 Hidden Grid의 DOM을 충분히 그릴 수 있도록 300ms 보장
        const timer = setTimeout(() => {
            // 1. 메모리 누수 방지: 기존에 띄워둔 차트가 있다면 전부 파괴
            const existingCharts = apiB.getChartModels() || [];
            existingCharts.forEach(model => (apiB as any).destroyChart({ chartId: model.chartId }));

            // 기존 코드: columns: ["category", "value"]
            // 🌟 수정 코드: 실제 데이터의 필드명으로 매핑
            apiB.createRangeChart({
                cellRange: {
                    columns: ["athlete", "gold"], // X축(분류)과 Y축(값) 지정
                },
                chartType: "groupedColumn",
                chartContainer: chartContainerRef.current!,
                suppressChartRanges: true,
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [bGridData]);

    return (
        <div className="w-full flex flex-col gap-4">
            {/* 테스트 구동 버튼 */}
            <button
                onClick={handleSimulateDataFetch}
                className="w-full p-2 bg-black text-white font-bold text-xs uppercase tracking-widest hover:bg-gray-800"
            >
                [TEST] Simulate Filter / GetRows / Draw Chart
            </button>

            {/* Provider로 A와 B 모두 엔터프라이즈 모듈 적용 */}
            <AgGridProvider
                modules={[
                    AllEnterpriseModule,
                    IntegratedChartsModule.with(AgChartsEnterpriseModule),
                    ValidationModule,
                ]}
                licenseKey={AG_GRID_KEY}
            >
                {/* ============================================================== */}
                {/* 1. GRID A: 실제 사용자에게 보여지는 서버사이드 메인 그리드 */}
                {/* ============================================================== */}
                <div className="w-full p-2 bg-gray-50 border-2 border-dashed border-gray-400">
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase text-center w-full">
                        [GRID A: VISIBLE SERVER-SIDE GRID]
                    </div>
                    <div
                        className="ag-theme-quartz w-full border border-gray-400 bg-white"
                        style={{
                            height: domLayout === "autoHeight" ? "auto" : "300px",
                            display: "block",
                        }}
                    >
                        <AgGridReact
                            ref={gridARef}
                            onGridReady={onGridReady}
                            rowModelType="serverSide"
                            pagination={true}
                            cellSelection={false}
                            enableCharts={false}
                            domLayout={domLayout}
                            sideBar={widgetSideBarConfig}
                            chartToolPanelsDef={widgetChartToolPanelsDef}
                            allowDragFromColumnsToolPanel={true}
                            paginationPageSizeSelector={PAGINATIONS}
                            onPaginationChanged={onPaginationChanged}
                            columnDefs={columnDefs} // 🌟 복구됨: 정상적으로 데이터와 헤더가 그려집니다.
                        />
                    </div>
                </div>

                {/* ============================================================== */}
                {/* 2. GRID B: 화면 밖으로 던져둔 통계/차트 전용 히든 그리드 */}
                {/* ============================================================== */}
                <div
                    className="ag-theme-quartz"
                    style={{
                        position: "absolute",
                        top: "-9999px",
                        left: "-9999px",
                        width: "2000px",
                        height: "2000px",
                        opacity: 0,
                        pointerEvents: "none",
                    }}
                >
                    <AgGridReact
                        ref={gridBRef}
                        rowModelType="clientSide"
                        enableCharts={true}
                        cellSelection={true}
                        rowData={bGridData} // 여기에 저 8개의 배열 데이터가 들어와야 합니다.
                        columnDefs={[
                            { field: "athlete", chartDataType: "category" }, // 차트의 X축 (분류)
                            { field: "gold", chartDataType: "series" }, // 차트의 Y축 (막대 그래프의 높이)
                        ]}
                    />
                </div>
            </AgGridProvider>

            {/* ============================================================== */}
            {/* 3. CHART CONTAINER: B그리드에서 생성된 차트가 꽂히는 물리적 위치 */}
            {/* ============================================================== */}
            <div
                ref={chartContainerRef}
                className="w-full h-[300px] border-2 border-dashed border-black bg-gray-200 flex flex-col items-center justify-center p-4 relative overflow-hidden"
            >
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-50 z-0">
                    <span className="text-gray-600 font-bold tracking-widest uppercase mb-2">
                        [CHART RENDER AREA]
                    </span>
                    <span className="text-xs text-gray-500 font-bold">
                        (Click the TEST button to inject chart)
                    </span>
                </div>
            </div>
        </div>
    );
}
