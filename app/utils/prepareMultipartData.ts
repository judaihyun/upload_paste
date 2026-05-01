import Papa from "papaparse";

export const prepareMultipartData = (data: any[][], fileName: string) => {
    // 1. 배열을 CSV 텍스트로 변환 (PapaParse 사용)
    const csvContent = Papa.unparse(data);

    // 2. CSV 텍스트를 Blob으로 변환 (타입을 text/csv로 지정)
    const blob = new Blob([csvContent], { type: "text/csv" });

    // 3. Blob을 File 객체로 래핑 (서버가 파일 업로드로 인식하게 함)
    const virtualFile = new File([blob], fileName, { type: "text/csv" });

    // 4. FormData에 담기
    const formData = new FormData();
    formData.append("file", virtualFile); // 서버 미들웨어(Multer 등)가 인식하는 키 값

    return formData;
};
