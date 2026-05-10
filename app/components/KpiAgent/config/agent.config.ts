import { SideBarDef, ChartToolPanelsDef } from "ag-grid-enterprise";
import CustomToolPanel from "@/components/CustomToolPanel"; // 경로 확인 필요

// 1. 사이드바 및 커스텀 패널 설정
export const widgetSideBarConfig: SideBarDef = {
    toolPanels: [
        {
            id: "columns",
            labelDefault: "Columns",
            labelKey: "columns",
            iconKey: "columns",
            toolPanel: "agColumnsToolPanel",
        },
        {
            id: "filters",
            labelDefault: "Filters",
            labelKey: "filters",
            iconKey: "filter",
            toolPanel: "agFiltersToolPanel",
        },
        {
            id: "myRemoteControl",
            labelDefault: "필터 조종기",
            labelKey: "myRemoteControl",
            iconKey: "menu",
            toolPanel: CustomToolPanel, // 커스텀 리모컨
        },
    ],
    defaultToolPanel: "myRemoteControl",
};

// 2. 차트 툴 패널 설정
export const widgetChartToolPanelsDef: ChartToolPanelsDef = {
    defaultToolPanel: "settings",
};
