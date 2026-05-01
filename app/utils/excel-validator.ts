import * as XLSX from 'xlsx';

export const ExcelValidator = {
  /**
   * [파일 업로드용] SheetJS Workbook에서 병합된 셀이 단 1개라도 있는지 검사
   */
  hasMergedCellsInFile(workbook: XLSX.WorkBook): boolean {
    return workbook.SheetNames.some(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      // !merges 속성이 존재하고, 길이가 1 이상이면 병합 셀 존재
      return Array.isArray(sheet['!merges']) && sheet['!merges'].length > 0;
    });
  },

  /**
   * [클립보드 붙여넣기용] HTML 문자열에서 병합(colspan/rowspan) 속성이 있는지 검사
   */
  hasMergedCellsInClipboard(htmlData: string): boolean {
    if (!htmlData) return false;
    // 엑셀에서 복사된 HTML 테이블 내에 값이 2 이상인 colspan 또는 rowspan이 존재하는지 스캔
    const mergePattern = /(?:colspan|rowspan)\s*=\s*["']?[2-9]\d*["']?/i;
    return mergePattern.test(htmlData);
  }
};