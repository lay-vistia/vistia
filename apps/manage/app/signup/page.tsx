"use client";

import { CSSProperties, FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: handle.trim().toLowerCase(),
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(data?.error ?? "作成に失敗しました。");
        return;
      }

      setStatus("作成しました。ログインしてください。");
      window.location.href = "/login";
    } catch {
      setStatus("通信エラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.title}>新規作成</h1>
        <form onSubmit={handleSignup} style={styles.form}>
          <label style={styles.label}>
            ハンドル
            <input
              type="text"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              autoComplete="username"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            表示名
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={isSubmitting} style={styles.button}>
            {isSubmitting ? "作成中..." : "作成する"}
          </button>
        </form>

        <div style={styles.divider} />

        <div style={styles.oauthGroup}>
          <button
            type="button"
            onClick={() => signIn("google")}
            style={styles.outlineButton}
          >
            Googleで作成
          </button>
          <button
            type="button"
            onClick={() => signIn("twitter")}
            style={styles.outlineButton}
          >
            Xで作成
          </button>
          <button
            type="button"
            onClick={() => signIn("tiktok")}
            style={styles.outlineButton}
          >
            TikTokで作成
          </button>
        </div>

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
  divider: {
    height: 1,
    background: "#e5e7eb",
    margin: "8px 0",
  },
  oauthGroup: {
    display: "grid",
    gap: 8,
  },
  outlineButton: {
    minHeight: 44,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    color: "#111827",
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  status: {
    margin: 0,
    color: "#b91c1c",
  },
};
