"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GridReadyEvent, IServerSideDatasource } from "ag-grid-enterprise";
import { AgentAdapter } from "./adapter/agent.adapter";
import { WidgetMockService } from "./mock.service";

export function useWidgetManager(
    messageId: string,
    initialViewSpec?: any,
    onDataFetched?: (data: any[], schema: string[]) => void, // <-- 추가됨
) {
    const [columnDefs, setColumnDefs] = useState<any[]>(() => {
        if (initialViewSpec?.columns) {
            return AgentAdapter.toColumnDefs(initialViewSpec.columns);
        }
        return [];
    });
    const [domLayout, setDomLayout] = useState<"normal" | "autoHeight">("normal");

    const onPaginationChanged = useCallback((params: any) => {
        const pageSize = params.api.paginationGetPageSize();
        const layout = pageSize <= 10 ? "autoHeight" : "normal";
        setDomLayout(layout);
        setTimeout(() => params.api.setGridOption("domLayout", layout), 0);
    }, []);

    const onGridReady = useCallback(
        (params: GridReadyEvent) => {
            params.api.setGridOption("loading", true);

            const datasource: IServerSideDatasource = {
                getRows: async getRowsParams => {
                    try {
                        const standardReq = AgentAdapter.toStandard(
                            messageId,
                            getRowsParams.request,
                        );
                        const response = await WidgetMockService.fetchMasterData(standardReq);

                        // 🌟 2. 백엔드에서 가져온 실제 데이터와 스키마를 KpiAgentGrid(B그리드)로 토스!
                        if (onDataFetched && response.data) {
                            onDataFetched(response.data, response.schema);
                        }

                        if (response.schema.length > 0 && columnDefs.length === 0) {
                            const dynamicColumns = response.schema.map((key, index) => {
                                return {
                                    field: key,
                                    filter: true,
                                    sortable: true,
                                    cellRenderer: index === 0 ? "agGroupCellRenderer" : undefined,
                                };
                            });
                            setColumnDefs(dynamicColumns);
                            params.api.setGridOption("columnDefs", dynamicColumns);
                        }

                        getRowsParams.success({
                            rowData: response.data,
                            rowCount: response.totalCount,
                        });
                        params.api.setGridOption("loading", false);
                    } catch (error) {
                        getRowsParams.fail();
                    }
                },
            };

            params.api.setGridOption("serverSideDatasource", datasource);
        },
        [messageId, columnDefs.length, onDataFetched], // 의존성 배열에 추가
    );

    return {
        domLayout,
        onGridReady,
        columnDefs,
        onPaginationChanged,
    };
}
