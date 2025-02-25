"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";

type Track = {
  id: string;
  name: string;
  preview_url: string | null;
  artists: { name: string }[];
  album: { images: { url: string }[] };
};

export default function Home() {
  // 検索キーワード
  const [query, setQuery] = useState("");
  // 楽曲リスト
  const [tracks, setTracks] = useState<Track[]>([]);
  // 現在再生中のトラック
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  // Audio要素
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // 🎵 楽曲の再生処理
  const playTrack = (previewUrl: string | null) => {
    if (!previewUrl) {
      alert("この曲にはプレビューがありません");
      return;
    }
    if (audio) {
      audio.pause(); // 既に再生している音楽を停止
    }
    const newAudio = new Audio(previewUrl);
    newAudio.play();
    setAudio(newAudio);
    setCurrentTrack(previewUrl);
  };

  // 🔍 検索実行
  const handleSearch = async () => {
    try {
      const res = await axios.get(`/api/spotify/tracks?q=${encodeURIComponent(query)}`);
      setTracks(res.data.tracks.items);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">🎵 Spotify Search</h1>

      {/* ===== 検索フォーム ===== */}
      <div className="flex gap-2 mb-6">
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

      {/* ===== 楽曲リスト表示 ===== */}
      {tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700 transition"
              onClick={() => playTrack(track.preview_url)}
            >
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
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No tracks to display. Try searching for a song!</p>
      )}

      {/* ===== Now Playing ===== */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-black p-4 text-center">
          <p className="text-white">Now Playing: {currentTrack}</p>
        </div>
      )}
    </div>
  );
}
