"use client";
import { useEffect, useRef } from "react";
import { AgGridReact, AgGridProvider } from "ag-grid-react";
import {
    AllEnterpriseModule,
    IntegratedChartsModule,
    ModuleRegistry,
    ValidationModule,
} from "ag-grid-enterprise";
import AG_GRID_KEY from "@/constants/key";
import { useWidgetManager } from "../useAgentManager";
import { AgChartsEnterpriseModule } from "ag-charts-enterprise";
import { PAGINATIONS } from "../adapter/agent.adapter";
import { widgetChartToolPanelsDef, widgetSideBarConfig } from "../config/agent.config";

// 모듈 레지스트리 등록
ModuleRegistry.registerModules([AllEnterpriseModule]);

interface KpiAgentGridProps {
    messageId: string;
    initialViewSpec?: any; // 초기 ViewSpec (과거 대화용)
}

export default function KpiAgentGrid({ messageId, initialViewSpec }: KpiAgentGridProps) {
    const gridRef = useRef<AgGridReact>(null);

    const { domLayout, onGridReady, columnDefs, onPaginationChanged, detailCellRendererParams } =
        useWidgetManager(messageId, initialViewSpec);

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
                        onGridReady={onGridReady}
                        rowModelType="serverSide"
                        pagination={true}
                        cellSelection={true}
                        enableCharts={true}
                        domLayout={domLayout}
                        sideBar={widgetSideBarConfig}
                        chartToolPanelsDef={widgetChartToolPanelsDef}
                        allowDragFromColumnsToolPanel={true}
                        paginationPageSizeSelector={PAGINATIONS}
                        onPaginationChanged={onPaginationChanged}
                        masterDetail={true}
                        detailCellRendererParams={detailCellRendererParams}
                        columnDefs={columnDefs}
                    />
                </div>
            </AgGridProvider>
        </div>
    );
}
