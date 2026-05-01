const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ==========================================
// ⚙️ 생성기 환경 설정
// ==========================================
const CONFIG = {
    TARGET_FILE_SIZE_MB: 500, // 🟢 목표 파일 용량 (원하는 MB 입력)
    SHEET_COUNT: 5, // 시트 수 (다중 시트 분배용)
    GENERATE_CSV: true, // 💡 CSV 동시 생성 여부 (true/false)
    GENERATE_XLSX: false, // 💡 Excel 생성 여부 (true/false)
    OUTPUT_DIR: path.join(__dirname, "."),
    BASE_FILE_NAME: "stress_test_data",
};

// ==========================================
// 🛠️ 내부 로직
// ==========================================
class DummyGenerator {
    constructor(config) {
        this.config = config;

        // 1MB를 맞추기 위해 역산된 포맷별 근사치
        this.XLSX_ROWS_PER_MB = 3000;
        this.CSV_ROWS_PER_MB = 8500;

        if (!fs.existsSync(this.config.OUTPUT_DIR)) {
            fs.mkdirSync(this.config.OUTPUT_DIR, { recursive: true });
        }
    }

    _generateRow(index) {
        return [
            index,
            `USER_${Math.random().toString(36).substring(2, 10)}`,
            new Date().toISOString(),
            (Math.random() * 1000000).toFixed(2),
            Math.random() > 0.5 ? "ACTIVE" : "INACTIVE",
            Math.random().toString(36),
            Math.random().toString(36),
            Math.random().toString(36),
        ];
    }

    async generateCSV() {
        if (!this.config.GENERATE_CSV) {
            console.log(`⏩ [CSV] 생성 옵션이 false로 설정되어 건너뜁니다.`);
            return;
        }

        const fileName = `${this.config.BASE_FILE_NAME}_${this.config.TARGET_FILE_SIZE_MB}MB.csv`;
        const filePath = path.join(this.config.OUTPUT_DIR, fileName);
        const stream = fs.createWriteStream(filePath);

        const totalRows = this.config.TARGET_FILE_SIZE_MB * this.CSV_ROWS_PER_MB;

        console.log(
            `[CSV] 생성 시작 (목표: ${this.config.TARGET_FILE_SIZE_MB}MB, 약 ${totalRows.toLocaleString()}행)`,
        );
        stream.write("ID,Name,Date,Amount,Status,Dummy1,Dummy2,Dummy3\n");

        for (let i = 1; i <= totalRows; i++) {
            stream.write(this._generateRow(i).join(",") + "\n");
            if (i % 100000 === 0) console.log(`  - CSV 진행 중: ${i.toLocaleString()} 행 완료`);
        }

        stream.end();
        console.log(`✅ [CSV] 생성 완료: ${fileName}\n`);
    }

    generateXLSX() {
        if (!this.config.GENERATE_XLSX) {
            console.log(`⏩ [XLSX] 생성 옵션이 false로 설정되어 건너뜁니다.`);
            return;
        }

        const fileName = `${this.config.BASE_FILE_NAME}_${this.config.TARGET_FILE_SIZE_MB}MB.xlsx`;
        const filePath = path.join(this.config.OUTPUT_DIR, fileName);
        const wb = XLSX.utils.book_new();

        const totalRowsTarget = this.config.TARGET_FILE_SIZE_MB * this.XLSX_ROWS_PER_MB;
        const rowsPerSheet = Math.floor(totalRowsTarget / this.config.SHEET_COUNT);

        console.log(
            `[XLSX] 생성 시작 (목표: ${this.config.TARGET_FILE_SIZE_MB}MB, 시트당 약 ${rowsPerSheet.toLocaleString()}행)`,
        );

        for (let s = 1; s <= this.config.SHEET_COUNT; s++) {
            const data = [["ID", "Name", "Date", "Amount", "Status", "Dummy1", "Dummy2", "Dummy3"]];

            for (let i = 1; i <= rowsPerSheet; i++) {
                data.push(this._generateRow(i));
            }

            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, `DataSheet_${s}`);
        }

        console.log(`[XLSX] 압축 및 파일 쓰기 진행 중...`);
        XLSX.writeFile(wb, filePath);
        console.log(`✅ [XLSX] 생성 완료: ${fileName}\n`);
    }

    async run() {
        console.time("총 소요 시간");
        await this.generateCSV();
        this.generateXLSX();
        console.timeEnd("총 소요 시간");
    }
}

const generator = new DummyGenerator(CONFIG);
generator.run();
