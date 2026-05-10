import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    {
        // 특정 규칙을 재정의하는 객체를 추가합니다.
        rules: {
            "@typescript-eslint/no-explicit-any": "off", // any 허용
            "@typescript-eslint/no-unused-vars": "warn", // (옵션) 미사용 변수 경고로 완화
        },
    },
    globalIgnores([
        // Default ignores of eslint-config-next:
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
    ]),
]);

export default eslintConfig;
