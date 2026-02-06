"use client";

import { CSSProperties, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

export default function OnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedHandle = useMemo(() => handle.trim().toLowerCase(), [handle]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!HANDLE_REGEX.test(normalizedHandle)) {
      setError("handle は a-z / 0-9 / _ の 3-20 文字で入力してください。");
      return;
    }
    if (!displayName.trim()) {
      setError("displayName を入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          handle: normalizedHandle,
          displayName: displayName.trim(),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "初期設定に失敗しました。");
        return;
      }

      const redirectTo = typeof data?.redirectTo === "string" ? data.redirectTo : "/";
      router.replace(redirectTo);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.title}>初期設定</h1>
        <p style={styles.description}>
          OAuthの初回ログインです。handle と displayName を入力してください。
        </p>
        <form onSubmit={onSubmit} style={styles.form}>
          <label style={styles.label}>
            handle
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              autoComplete="username"
              placeholder="example_handle"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            displayName
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              placeholder="Example Name"
              style={styles.input}
            />
          </label>
          {error ? <p style={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? "送信中..." : "作成して続行"}
          </button>
        </form>
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
    maxWidth: 480,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  title: {
    margin: "0 0 8px",
    fontSize: 24,
    lineHeight: 1.3,
  },
  description: {
    margin: "0 0 16px",
    color: "#4b5563",
  },
  form: {
    display: "grid",
    gap: 12,
  },
  label: {
    display: "grid",
    gap: 6,
    fontWeight: 600,
  },
  input: {
    minHeight: 44,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 16,
  },
  error: {
    margin: 0,
    color: "#b91c1c",
    fontSize: 14,
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
};
