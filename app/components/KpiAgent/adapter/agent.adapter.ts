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
    toColumnDefs(firstRow: any | null): ColDef[] {
        // 방어 코드: 데이터가 없을 경우 Fallback 컬럼 반환
        if (!firstRow || Object.keys(firstRow).length === 0) {
            return [{ field: "no_data", headerName: "데이터 없음" }];
        }

        // 느슨한 추론: 키값을 기반으로 기본 필터/정렬 컬럼 생성
        return Object.keys(firstRow).map(key => ({
            field: key,
            filter: true,
            sortable: true,
            // (필요하다면 데이터 타입에 따라 agNumberColumnFilter 등을 분기 처리할 수도 있습니다)
        }));
    },
};
