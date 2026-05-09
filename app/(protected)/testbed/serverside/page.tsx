"use client";
import AG_GRID_KEY from "@/constants/key";
import { AllEnterpriseModule, ColDef } from "ag-grid-enterprise";
import { AgGridProvider, AgGridReact } from "ag-grid-react";
import { useRef, useState } from "react";

export default function Page() {
    const gridRef = useRef<AgGridReact>(null);
    const [rowData, setRowData] = useState([
        { make: "Tesla", model: "Model Y", price: 64950, electric: true },
        { make: "Ford", model: "F-Series", price: 33850, electric: false },
        { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    ]);

    const [colDefs, setColDefs] = useState<ColDef[]>([
        { field: "make" },
        { field: "model" },
        { field: "price" },
        { field: "electric" },
    ]);

    return (
        <div className="h-screen flex flex-col">
            <h1 className="text-2xl font-bold mb-4">서버 사이드 렌더링 테스트</h1>
            <p className="mb-2">이 페이지는 서버 사이드에서 렌더링됩니다.</p>
            <p>데이터 그리드 테스트를 위해 CellRenderer 컴포넌트를 포함할 수 있습니다.</p>
            <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => {
                    const gridApi = gridRef.current?.api;
                    if (gridApi) {
                        gridApi.applyColumnState({
                            state: [{ colId: "price", sort: "asc" }],
                        });
                    }
                }}
            >
                update cell state
            </button>
            <AgGridProvider modules={[AllEnterpriseModule]} licenseKey={AG_GRID_KEY}>
                <div className="flex-1 w-full">
                    <AgGridReact ref={gridRef} rowData={rowData} columnDefs={colDefs} />
                </div>
            </AgGridProvider>
        </div>
    );
}
