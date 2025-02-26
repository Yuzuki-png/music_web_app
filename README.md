## Spotify Search & Playback App
Spotify Web APIとPKCEフローを用いた認証を使い、
Spotifyの曲を検索 & 30秒プレビュー再生 & (Premiumユーザーのみ) フル再生 できるデモアプリです。


## 機能概要
Spotify認証 (PKCEフロー)

「Login with Spotify」ボタンでSpotifyアカウント認証
streaming スコープ付きのアクセストークンを取得 (Premiumユーザーのみフル再生可能)
楽曲検索

検索ワードを入力して「Search」ボタンを押すと、Spotifyの /v1/search API から楽曲データを取得
30秒プレビュー再生

リストに表示された曲を「Preview」ボタンで再生
ただし、一部の曲は preview_url が存在せず再生不可のことあり
フル再生 (Web Playback SDK)

「Full」ボタンを押すと、Spotify Web Playback SDKを使ってフル再生
要件：ユーザーが Spotify Premium アカウント + streaming スコープ付きアクセストークン

## 技術スタック
Next.js 13 (App Router)
TypeScript
Tailwind CSS (UIスタイル)
Spotify Web API (検索 + 認証 + 再生)
Spotify Web Playback SDK (フル再生)
PKCE (Proof Key for Code Exchange) フロー

## セットアップ手順
1. リポジトリをクローン
2. 依存関係をインストール
3. Spotify Developer でアプリ登録
Spotify Developer Dashboard にアクセス
アプリを新規作成し、Client ID を取得
Redirect URI に http://localhost:3000 を登録
スコープに streaming, user-read-email, user-read-private, user-modify-playback-state などを設定
4. 環境変数の設定
プロジェクトルートに .env.local を作成し、以下の内容を記載してください。（例）
SPOTIFY_CLIENT_ID=your_spotify_client_id
Note:
フロントエンド（PKCEフロー）で使うので NEXT_PUBLIC_SPOTIFY_CLIENT_ID を使う場合もありますが、
ここではサンプル上 process.env.SPOTIFY_CLIENT_ID としているため、そちらに合わせています。

5. 開発サーバーを起動
npm run dev
ブラウザで http://localhost:3000 を開きます。
エラーが出る場合は、コンソールログや .env.local の設定を確認してください。

## 使い方
「Login with Spotify」ボタン でログイン (PKCEフロー)

Spotifyの認証画面に遷移 → 同意 → code が付いて戻ってくる
アプリ側で access_token を取得
楽曲を検索

検索バーにキーワードを入力し「Search」
/api/spotify/tracks?q=... → Spotify検索API → 楽曲一覧表示
プレビュー再生 (Preview)

30秒プレビューがある曲のみ再生可能
preview_url がない曲は再生不可
フル再生 (Full)

Premiumアカウント + streaming スコープトークンが必須
Web Playback SDKでフル再生

## よくある問題
Client IDが読み込めない (Missing required parameter: client_id)

.env.local の SPOTIFY_CLIENT_ID が正しく設定されていない
サーバー再起動を忘れている
プレビューURLが全部 null

Spotifyの仕様上、プレビューがない曲が多々ある
検索クエリや地域、バージョンによってはプレビュー付が返る場合も
フル再生で対応することを検討
フル再生できない (Please log in with a Spotify Premium account...)

無料アカウントではフル再生不可
streaming スコープがないアクセストークンを使っている
ブラウザが iOS Safari などの場合、一部制限がある

## ライセンス
このリポジトリのコードは MIT License などで自由に使用できます。
ただし、Spotifyの楽曲再生に関しては Spotifyの利用規約に従う ことを忘れずに。

## 今後の拡張・課題
リフレッシュトークン を使ったトークン更新（アクセストークンの有効期限が切れた時）
プレイリスト管理 (ユーザーのプレイリストを取得・編集)
検索条件の拡張 (アーティスト名やジャンル絞り込み)
UIの改善 (Player UI, ダークモード切り替えなど)


以上がREADME例になります。お好みに合わせて修正し、GitHubにアップロードしてください。