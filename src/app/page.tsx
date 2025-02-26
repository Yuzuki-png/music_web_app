"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";

// ===== PKCE用のユーティリティ (簡易版) =====
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ====== Spotify Web Playback SDK 用の型定義 (超簡易) =====
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

type Track = {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { name: string }[];
  album: { images: { url: string }[] };
};

export default function Home() {
  // ------------------------------
  // 既存の機能 (検索 + プレビュー再生)
  // ------------------------------
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // ----- 検索 -----
  const handleSearch = async () => {
    try {
      const res = await axios.get(`/api/spotify/tracks?q=${encodeURIComponent(query)}`);
      setTracks(res.data.tracks.items);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    }
  };

  // ----- 30秒プレビュー再生 -----
  const playTrackPreview = (previewUrl: string | null) => {
    if (!previewUrl) {
      alert("この曲にはプレビューがありません");
      return;
    }
    if (audio) audio.pause();
    const newAudio = new Audio(previewUrl);
    newAudio.play();
    setAudio(newAudio);
    setCurrentTrack(previewUrl);
  };

  // ------------------------------
  // Spotifyフル再生 (Web Playback SDK)
  // ------------------------------
  const [accessToken, setAccessToken] = useState<string>(""); // streamingスコープ付き
  const [player, setPlayer] = useState<any>(null);
  const [deviceId, setDeviceId] = useState<string>("");

  // ----- フル再生 -----
  const playTrackFull = async (trackId: string) => {
    if (!accessToken) {
      alert("Please log in with a Spotify Premium account (with streaming scope).");
      return;
    }
    if (!player || !deviceId) {
      alert("Player is not ready yet.");
      return;
    }
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
        }),
      });
      setCurrentTrack(`spotify:track:${trackId}`);
    } catch (err) {
      console.error("Error starting playback:", err);
    }
  };

  // ------------------------------
  // 1. Spotify認証 (PKCEフロー)
  // ------------------------------
  const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
  const REDIRECT_URI = "http://localhost:3000";
  console.log(`CLIENT_ID:${CLIENT_ID}`)
  // (A) 「Login with Spotify」ボタンを押したとき → authorizeへ飛ばす
  const handleLogin = async () => {
    // code_verifier & code_challenge
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    localStorage.setItem("spotify_code_verifier", codeVerifier);

    const scope = [
      "user-read-email",
      "user-read-private",
      "streaming",
      "user-modify-playback-state",
    ].join(" ");

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      scope,
      redirect_uri: REDIRECT_URI,
      code_challenge_method: "S256",
      codeChallenge,
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  };

  // (B) ロード時に URL?code=xxx があればトークンを交換
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    if (!code) return;

    const codeVerifier = localStorage.getItem("spotify_code_verifier");
    if (!codeVerifier) {
      console.warn("No code_verifier found in localStorage");
      return;
    }

    // トークン交換 (PKCE)
    const fetchToken = async () => {
      try {
        const data = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          code_verifier: codeVerifier,
        });

        const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: data.toString(),
        });
        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          throw new Error("Token request failed: " + errText);
        }
        const tokenJson = await tokenRes.json();
        setAccessToken(tokenJson.access_token);

        // URLパラメータを削除して見た目を綺麗に
        window.history.replaceState({}, document.title, "/");
        localStorage.removeItem("spotify_code_verifier");
      } catch (err) {
        console.error("Error fetching token:", err);
      }
    };
    fetchToken();
  }, []);

  // ------------------------------
  // 2. Web Playback SDK Script 読み込み & プレイヤー初期化
  // ------------------------------
  useEffect(() => {
    if (!accessToken) return;

    // すでに読み込み済みなら何もしない
    if (document.getElementById("spotify-player")) return;

    const scriptTag = document.createElement("script");
    scriptTag.id = "spotify-player";
    scriptTag.src = "https://sdk.scdn.co/spotify-player.js";
    scriptTag.async = true;
    document.body.appendChild(scriptTag);

    // SDK読み込み後に呼ばれる
    window.onSpotifyWebPlaybackSDKReady = () => {
      const _player = new window.Spotify.Player({
        name: "My Web Playback SDK",
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      _player.addListener("ready", ({ device_id }: { device_id: string }) => {
        console.log("Ready with Device ID", device_id);
        setDeviceId(device_id);
      });
      _player.addListener("not_ready", ({ device_id }: { device_id: string }) => {
        console.log("Device ID has gone offline", device_id);
      });
      _player.addListener("initialization_error", (e: any) => console.error(e));
      _player.addListener("authentication_error", (e: any) => console.error(e));
      _player.addListener("account_error", (e: any) => console.error(e));

      _player.connect();
      setPlayer(_player);
    };

    return () => {
      if (player) player.disconnect();
    };
  }, [accessToken, player]);

  // ------------------------------
  // レンダリング
  // ------------------------------
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-2">🎵 Spotify Search with PKCE & Web Playback</h1>

      {/* ログイン/ログアウト */}
      {!accessToken ? (
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700"
        >
          Login with Spotify
        </button>
      ) : (
        <p className="text-sm mb-4 text-green-400">Authenticated! (Ready for full playback)</p>
      )}

      {/* 検索フォーム */}
      <div className="flex gap-2 my-4">
        <input
          type="text"
          placeholder="Search for tracks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="px-3 py-2 rounded-md outline-none text-black w-72"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-green-600 rounded-md hover:bg-green-700 transition"
        >
          Search
        </button>
      </div>

      {/* 楽曲リスト */}
      {tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tracks.map((track) => (
            <div key={track.id} className="p-4 bg-gray-800 rounded-lg transition">
              <Image
                src={track.album.images[0]?.url}
                alt={track.name}
                width={200}
                height={200}
                className="rounded-lg"
              />
              <p className="mt-2 font-semibold">{track.name}</p>
              <p className="text-gray-400 text-sm">
                {track.artists.map((artist) => artist.name).join(", ")}
              </p>

              <div className="flex gap-2 mt-2">
                {/* 30秒プレビュー再生 */}
                <button
                  onClick={() => playTrackPreview(track.preview_url)}
                  className="px-2 py-1 text-sm bg-blue-600 rounded hover:bg-blue-700"
                >
                  Preview
                </button>

                {/* フル再生 (Web Playback SDK) */}
                <button
                  onClick={() => playTrackFull(track.id)}
                  className="px-2 py-1 text-sm bg-green-600 rounded hover:bg-green-700"
                >
                  Full
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No tracks to display. Try searching for a song!</p>
      )}

      {/* Now Playing */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black p-4 text-center">
          <p className="text-white">Now Playing: {currentTrack}</p>
        </div>
      )}
    </div>
  );
}
