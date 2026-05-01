import * as XLSX from "xlsx";

self.onmessage = (e: MessageEvent) => {
    const { buffer } = e.data;

    try {
        const parseStart = performance.now();
        const workbook = XLSX.read(buffer, { type: "array" });
        const parseEnd = performance.now();

        // 💡 핵심: 모든 시트의 데이터를 저장할 딕셔너리(캐시) 객체 생성
        const allSheetsData: Record<string, any[][]> = {};

        workbook.SheetNames.forEach(sheetName => {
            const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
                header: 1,
            }) as any[][];

            // 각 시트별로 상위 200행만 잘라서 메모리 다이어트
            // allSheetsData[sheetName] = jsonData.slice(0, 2000);
            allSheetsData[sheetName] = jsonData;
        });
        console.log(allSheetsData);

        self.postMessage({
            success: true,
            sheetNames: workbook.SheetNames,
            allSheetsData: allSheetsData, // 💡 딕셔너리 전체를 메인 스레드로 전송
            parseTime: (parseEnd - parseStart).toFixed(2),
        });
    } catch (error: any) {
        self.postMessage({
            success: false,
            error: error.message || "알 수 없는 파싱 에러",
        });
    }
};
