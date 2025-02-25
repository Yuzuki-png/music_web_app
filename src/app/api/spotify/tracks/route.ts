import { NextResponse } from "next/server";

export async function GET(request: Request) {
  console.log("🚀 [API] GET /api/spotify/tracks にリクエストが来ました");
  
  console.log("SPOTIFY_CLIENT_ID:", process.env.SPOTIFY_CLIENT_ID);
  console.log("SPOTIFY_CLIENT_SECRET:", process.env.SPOTIFY_CLIENT_SECRET);

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.error("❌ 環境変数が不足しています");
    return NextResponse.json({ error: "Missing Spotify credentials" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "top hits";
  console.log("🔍 searchQuery:", q);

  try {
    // ★ ここでトークン取得
    const authString = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authString}`,
      },
      body: "grant_type=client_credentials",
    },
    );
    console.log(`tokenRes:${tokenRes.status}`)

    
    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("❌ トークン取得APIエラー:", errorText);
      return NextResponse.json({ error: "Failed to get token", details: errorText }, { status: 500 });
    }

    const { access_token } = await tokenRes.json();
    console.log("✅ トークン取得成功:", access_token ? "[OK]" : "[NO TOKEN]");

    // ★ ここでSpotify検索APIにリクエスト
    console.log("🎵 楽曲検索開始...");
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ 楽曲検索APIエラー:", errorText);
      return NextResponse.json({ error: "Failed to fetch tracks", details: errorText }, { status: 500 });
    }

    const data = await res.json();
    console.log("✅ 楽曲取得成功:", data?.tracks?.items?.length, "件");

    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ 予期せぬエラー:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
