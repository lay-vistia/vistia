"use client";

import { CSSProperties, useMemo, useState } from "react";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInfo = useMemo(() => {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return {
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
      ext,
    };
  }, [file]);

  async function handleUpload() {
    if (!fileInfo || !file) {
      setStatus("ファイルを選択してください。");
      return;
    }

    if (fileInfo.size <= 0 || fileInfo.size > MAX_UPLOAD_BYTES) {
      setStatus("ファイルサイズが上限を超えています。");
      return;
    }

    setIsUploading(true);
    setStatus("署名URLを取得中...");

    try {
      const presignRes = await fetch("/api/assets/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ext: fileInfo.ext,
          contentType: fileInfo.contentType,
          sizeBytes: fileInfo.size,
        }),
      });

      const presignData = await presignRes.json().catch(() => null);
      if (!presignRes.ok) {
        setStatus(presignData?.error ?? "署名URLの取得に失敗しました。");
        return;
      }

      const uploadUrl = presignData?.uploadUrl as string | undefined;
      const assetId = presignData?.assetId as string | undefined;
      if (!uploadUrl || !assetId) {
        setStatus("署名URLのレスポンスが不正です。");
        return;
      }

      setStatus("アップロード中...");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileInfo.contentType },
        body: file,
      });

      if (!putRes.ok) {
        setStatus("S3アップロードに失敗しました。");
        return;
      }

      setStatus("検証中...");
      const completeRes = await fetch(`/api/assets/${assetId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ext: fileInfo.ext }),
      });

      const completeData = await completeRes.json().catch(() => null);
      if (!completeRes.ok) {
        setStatus(completeData?.error ?? "検証に失敗しました。");
        return;
      }

      setStatus("完了。変換を開始しました。");
    } catch {
      setStatus("通信エラーが発生しました。");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.title}>アップロード</h1>
        <p style={styles.text}>1枚だけアップロードできます。</p>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          style={styles.input}
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          style={styles.button}
        >
          {isUploading ? "処理中..." : "アップロード"}
        </button>
        {fileInfo ? (
          <p style={styles.meta}>{fileInfo.name} / {Math.ceil(fileInfo.size / 1024)} KB</p>
        ) : null}
        {status ? <p style={styles.status}>{status}</p> : null}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  main: {
    minHeight: "100dvh",
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "#f7f7f8",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    display: "grid",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.3,
  },
  text: {
    margin: 0,
    color: "#4b5563",
  },
  input: {
    minHeight: 44,
  },
  button: {
    minHeight: 44,
    border: 0,
    borderRadius: 10,
    background: "#111827",
    color: "#ffffff",
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  meta: {
    margin: 0,
    fontSize: 14,
    color: "#6b7280",
  },
  status: {
    margin: 0,
    fontSize: 14,
    color: "#1f2937",
  },
};
