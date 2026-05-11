import { ColDef, IServerSideGetRowsRequest } from "ag-grid-enterprise";
import { StandardDataRequest } from "./agent.types";

const DEFAULT_START_ROW = 0;
const DEFAULT_END_ROW = 100;
const DEFAULT_PAGE_SIZE = 20;
export const PAGINATIONS = [5, 10, 20, 50, DEFAULT_END_ROW];

export const AgentAdapter = {
    toStandard(messageId: string, agRequest: IServerSideGetRowsRequest): StandardDataRequest {
        const startRow = agRequest.startRow ?? DEFAULT_START_ROW;
        const endRow = agRequest.endRow ?? DEFAULT_END_ROW;
        const pageSize = endRow - startRow || DEFAULT_PAGE_SIZE;
        const currentPage = Math.floor(startRow / pageSize) + 1;

        const sort = agRequest.sortModel.map(s => ({
            field: s.colId,
            direction: s.sort === "asc" ? "asc" : ("desc" as "asc" | "desc"),
        }));

        const filters: Record<string, any> = {};
        Object.entries(agRequest.filterModel ?? {}).forEach(([key, value]: [string, any]) => {
            filters[key] = value.filter;
        });

        return {
            messageId,
            page: currentPage,
            size: pageSize,
            sort,
            filters,
        };
    },
    toColumnDefs(schemaColumns: any[] | null): ColDef[] {
        // 1. 방어 코드: 스키마가 없거나 비어있을 경우 안전한 Fallback 제공
        if (!schemaColumns || !Array.isArray(schemaColumns) || schemaColumns.length === 0) {
            return [{ field: "no_data", headerName: "데이터 구조 없음" }];
        }

        // 2. 명시적 매핑: 백엔드/LLM 스펙을 AG Grid ColDef 스펙으로 1:1 번역
        return schemaColumns.map((col, index) => {
            // 데이터 타입에 따른 필터 전략 분기
            let filterType: string | boolean = true;
            if (col.type === "number") {
                filterType = "agNumberColumnFilter";
            } else if (col.type === "date") {
                filterType = "agDateColumnFilter";
            } else {
                filterType = "agTextColumnFilter";
            }

            return {
                field: col.field,
                headerName: col.headerName || col.field, // headerName이 누락됐을 경우 field명으로 폴백
                filter: filterType,
                sortable: true,

                // 마스터/디테일의 하위 그리드 펼침 [+] 버튼이 필요하다면 첫 번째 컬럼에 주입
                // cellRenderer: index === 0 ? "agGroupCellRenderer" : undefined,
            };
        });
    },
};
