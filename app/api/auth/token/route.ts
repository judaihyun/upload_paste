// app/api/auth/token/route.ts
import { NextResponse } from "next/server";

export async function POST() {
    const newAccessToken = `access_${Date.now()}`;
    const expiresInSeconds = 6000; // 100분 만료 테스트

    const response = NextResponse.json({ success: true });

    // 💡 단일 토큰 하나만 굽습니다. 프론트 감지를 위해 httpOnly는 false로 둡니다.
    response.cookies.set({
        name: "access_token",
        value: newAccessToken,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: expiresInSeconds,
    });

    return response;
}
