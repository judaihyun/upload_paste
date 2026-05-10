import {
    DetailDataRequest,
    DetailDataResponse,
    StandardDataRequest,
    StandardDataResponse,
} from "./adapter/agent.types";

let cachedDbData: any[] | null = null;

export const WidgetMockService = {
    async fetchMasterData(req: StandardDataRequest): Promise<StandardDataResponse> {
        console.log(`[Mock Server] 마스터 데이터 요청:`, req);

        if (!cachedDbData) {
            const resp = await fetch("https://www.ag-grid.com/example-assets/olympic-winners.json");
            const rawData = await resp.json();
            cachedDbData = rawData.map((item: any, index: number) => ({
                ...item,
                id: `master_row_${index + 1}`,
            }));
        }

        let processedData = [...cachedDbData];

        // 정렬 처리
        if (req.sort && req.sort.length > 0) {
            const { field, direction } = req.sort[0];
            processedData.sort((a, b) => {
                if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
                if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
                return 0;
            });
        }

        // 필터 처리
        if (req.filters && Object.keys(req.filters).length > 0) {
            Object.keys(req.filters).forEach(key => {
                const keyword = String(req.filters![key]).toLowerCase();
                processedData = processedData.filter(item =>
                    String(item[key]).toLowerCase().includes(keyword),
                );
            });
        }

        // 페이징 처리
        const startIndex = (req.page - 1) * req.size;
        const endIndex = startIndex + req.size;
        const rowsThisPage = processedData.slice(startIndex, endIndex);

        const schema =
            processedData.length > 0
                ? Object.keys(processedData[0]).filter(key => key !== "id")
                : [];

        // 네트워크 지연 흉내
        await new Promise(resolve => setTimeout(resolve, 300));

        return {
            data: rowsThisPage,
            totalCount: processedData.length,
            schema: schema,
        };
    },

    async fetchDetailData(req: DetailDataRequest): Promise<DetailDataResponse> {
        console.log(`[Mock Server] 디테일 데이터 요청 (부모 ID: ${req.masterId})`);

        await new Promise(resolve => setTimeout(resolve, 400));

        return {
            data: [
                { detailId: "D1", category: "Training", hours: 120, status: "Completed" },
                { detailId: "D2", category: "Medical", hours: 5, status: "Pending" },
                { detailId: "D3", category: "Media", hours: 12, status: "Scheduled" },
            ],
        };
    },

    async fetchInitialSchema(messageId: string): Promise<any | null> {
        console.log(`[${messageId}] 🌐 스키마 추출용 API 호출`);
        try {
            // 실제로는 limit=1 형태의 API를 호출하는 것이 이상적
            const resp = await fetch("https://www.ag-grid.com/example-assets/olympic-winners.json");
            const data = await resp.json();

            if (Array.isArray(data) && data.length > 0) {
                return data[0]; // 첫 번째 행만 반환
            }
            return null;
        } catch (error) {
            console.error(`[${messageId}] 스키마 API 호출 실패:`, error);
            return null;
        }
    },
};
