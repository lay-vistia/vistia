"use client";

import { CSSProperties } from "react";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.title}>ログアウト</h1>
        <p style={styles.text}>セッションを終了します。</p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          style={styles.button}
        >
          ログアウトする
        </button>
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
