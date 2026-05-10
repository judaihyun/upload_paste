"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GridReadyEvent, IServerSideDatasource } from "ag-grid-enterprise";
import { AgentAdapter } from "./adapter/agent.adapter";
import { WidgetMockService } from "./mock.service";

export function useWidgetManager(messageId: string) {
    const [columnDefs, setColumnDefs] = useState<any[]>([]);
    const [domLayout, setDomLayout] = useState<"normal" | "autoHeight">("normal");

    useEffect(() => {
        WidgetMockService.fetchInitialSchema(messageId).then(firstRow => {
            // 어댑터를 통해 AG Grid 언어로 번역 후 렌더링
            const dynamicColumns = AgentAdapter.toColumnDefs(firstRow);
            setColumnDefs(dynamicColumns);
        });
    }, [messageId]);

    const onPaginationChanged = useCallback((params: any) => {
        const pageSize = params.api.paginationGetPageSize();
        const layout = pageSize <= 10 ? "autoHeight" : "normal";
        setDomLayout(layout);
        setTimeout(() => params.api.setGridOption("domLayout", layout), 0);
    }, []);

    const onGridReady = useCallback(
        (params: GridReadyEvent) => {
            params.api.setGridOption("loading", true);
            console.log("그리드 준비 완료:");

            const datasource: IServerSideDatasource = {
                getRows: async getRowsParams => {
                    try {
                        console.log(
                            `[${messageId}] 🚀 사용자 액션(필터/정렬/페이징):`,
                            getRowsParams.request,
                        );
                        const standardReq = AgentAdapter.toStandard(
                            messageId,
                            getRowsParams.request,
                        );
                        console.log(standardReq);
                        const response = await WidgetMockService.fetchMasterData(standardReq);

                        // 스키마 동기화 (최초 1회)
                        if (response.schema.length > 0 && columnDefs.length === 0) {
                            const dynamicColumns = response.schema.map((key, index) => {
                                return {
                                    field: key,
                                    filter: true,
                                    sortable: true,
                                    // 마스터/디테일 [+] 버튼은 무조건 첫 번째 컬럼에 배정
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
                        console.error("데이터 로딩 실패:", error);
                        getRowsParams.fail();
                    }
                },
            };

            params.api.setGridOption("serverSideDatasource", datasource);
        },
        [messageId, columnDefs.length],
    );

    const detailCellRendererParams = useMemo(() => {
        return {
            getDetailRowData: async (params: any) => {
                const masterRowId = params.data.id;
                try {
                    const response = await WidgetMockService.fetchDetailData({
                        messageId: messageId,
                        masterId: masterRowId,
                    });
                    params.successCallback(response.data);
                } catch (e) {
                    params.successCallback([]);
                }
            },
            detailGridOptions: {
                columnDefs: [
                    { field: "detailId", headerName: "상세 ID" },
                    { field: "category", headerName: "분류" },
                    { field: "hours", headerName: "소요 시간" },
                    { field: "status", headerName: "상태" },
                ],
                domLayout: "autoHeight",
            },
        };
    }, [messageId]);

    return {
        domLayout,
        onGridReady,
        columnDefs,
        onPaginationChanged,
        detailCellRendererParams,
    };
}
