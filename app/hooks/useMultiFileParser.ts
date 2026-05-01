import { useState, useRef, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { FileEntry } from "@/testbed/multi/page";

interface ParseResult {
    allSheetsData: Record<string, any[][]>;
    sheetNames: string[];
    parseTime: number;
}

interface UseMultiFileParserProps {
    onQueueUpdate: (queue: FileEntry[]) => void;
    onFileComplete: (fileId: string, result: ParseResult) => void;
}

export function useMultiFileParser({ onQueueUpdate, onFileComplete }: UseMultiFileParserProps) {
    const [queue, setQueue] = useState<FileEntry[]>([]);
    const processingRef = useRef<boolean>(false);
    const isCancelledRef = useRef<Record<string, boolean>>({});
    const workerRef = useRef<Worker | null>(null);
    const [isParsing, setIsParsing] = useState(false);

    // 큐 상태가 변할 때마다 부모에게 알림
    useEffect(() => {
        onQueueUpdate(queue);
    }, [queue, onQueueUpdate]);

    // 💡 큐 스케줄러: 대기 중인 파일이 있고 현재 처리 중이 아니면 실행
    useEffect(() => {
        const nextFile = queue.find(f => f.status === "waiting");
        if (nextFile && !processingRef.current) {
            processFile(nextFile);
        }
    }, [queue]);

    const updateFileStatus = useCallback((id: string, updates: Partial<FileEntry>) => {
        setQueue(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
    }, []);

    const processFile = async (entry: FileEntry) => {
        const file = (entry as any).rawFile as File; // 임시 보관된 실제 파일 객체
        if (!file) return;

        processingRef.current = true;
        setIsParsing(true);
        updateFileStatus(entry.id, { status: "processing", progress: 0 });

        const startTime = performance.now();
        const extension = file.name.split(".").pop()?.toLowerCase();

        try {
            if (extension === "csv") {
                // --- CSV 처리 로직 (Real Progress) ---
                const allData: any[][] = [];
                Papa.parse(file, {
                    header: false,
                    skipEmptyLines: true,
                    chunkSize: 1024 * 1024 * 5, // 5MB 단위
                    chunk: (results, parser) => {
                        if (isCancelledRef.current[entry.id]) {
                            parser.abort();
                            return;
                        }
                        const chunkData = results.data as any[][];
                        for (let i = 0; i < chunkData.length; i++) allData.push(chunkData[i]);

                        const currentBytes = results.meta.cursor;
                        const realProgress = Math.min(
                            99,
                            Math.round((currentBytes / file.size) * 100),
                        );
                        updateFileStatus(entry.id, { progress: realProgress });
                    },
                    complete: () => {
                        const parseTime = performance.now() - startTime;
                        const result = {
                            allSheetsData: { "CSV Data": allData },
                            sheetNames: ["CSV Data"],
                            parseTime,
                        };
                        finalizeFile(entry.id, result);
                    },
                });
            } else {
                // --- Excel 처리 로직 (Fake Progress + Worker) ---
                let fakeProgress = 0;
                const timer = setInterval(() => {
                    fakeProgress += Math.random() * 5;
                    if (fakeProgress > 95) fakeProgress = 95;
                    updateFileStatus(entry.id, { progress: Math.floor(fakeProgress) });
                }, 300);

                const buffer = await file.arrayBuffer();
                workerRef.current = new Worker(
                    new URL("../workers/excel.worker.ts", import.meta.url),
                );
                workerRef.current.postMessage({ buffer }, [buffer]);

                workerRef.current.onmessage = e => {
                    clearInterval(timer);
                    if (e.data.success) {
                        const parseTime = performance.now() - startTime;
                        finalizeFile(entry.id, { ...e.data, parseTime });
                    } else {
                        updateFileStatus(entry.id, { status: "error" });
                        processingRef.current = false;
                    }
                    workerRef.current?.terminate();
                };
            }
        } catch (err) {
            updateFileStatus(entry.id, { status: "error" });
            processingRef.current = false;
        }
    };

    const finalizeFile = (id: string, result: ParseResult) => {
        updateFileStatus(id, {
            status: "completed",
            progress: 100,
            parseTime: result.parseTime,
            allSheetsData: result.allSheetsData,
            sheetNames: result.sheetNames,
        });
        onFileComplete(id, result);
        processingRef.current = false;
        setIsParsing(false);
    };

    const addFiles = (files: FileList) => {
        const newEntries = Array.from(files).map(file => ({
            id: `${file.name}-${file.size}-${Date.now()}`,
            name: file.name,
            size: file.size,
            status: "waiting" as const,
            progress: 0,
            parseTime: null,
            totalTime: null,
            sheetNames: [],
            rawFile: file, // 파싱을 위해 원본 파일 객체 보관
        }));
        setQueue(prev => [...prev, ...newEntries].slice(0, 5)); // 최대 5개 제한
    };

    const cancelFile = (id: string) => {
        isCancelledRef.current[id] = true;
        setQueue(prev => prev.filter(f => f.id !== id));
        if (processingRef.current) {
            workerRef.current?.terminate();
            processingRef.current = false;
            setIsParsing(false);
        }
    };

    return { addFiles, cancelFile, isParsing };
}
