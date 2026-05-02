// hooks/useFPS.ts
import { useState, useEffect, useRef } from "react";

export function useFPS() {
    const [fps, setFps] = useState(0);

    // 화면을 리렌더링하지 않고 메모리에서만 빠르게 값을 추적하기 위한 Ref
    const frames = useRef(0);
    const lastTime = useRef(performance.now());
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const calculateFPS = () => {
            frames.current += 1;
            const now = performance.now();

            // 1초(1000ms)마다 모인 프레임 수를 React 상태로 밀어넣어 UI 업데이트
            if (now - lastTime.current >= 1000) {
                setFps(frames.current);
                frames.current = 0; // 프레임 카운트 초기화
                lastTime.current = now; // 시간 초기화
            }

            // 브라우저의 다음 페인트(Paint) 사이클에 다시 자신을 호출 (무한 루프)
            frameRef.current = requestAnimationFrame(calculateFPS);
        };

        // 루프 시작
        frameRef.current = requestAnimationFrame(calculateFPS);

        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return fps;
}
