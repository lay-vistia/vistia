import { CSSProperties } from "react";

type PageProps = {
  searchParams?: {
    relogin?: string;
  };
};

export default function ManageTopPage({ searchParams }: PageProps) {
  const showRelogin = searchParams?.relogin === "1";

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <h1 style={styles.title}>Manage</h1>
        {showRelogin ? (
          <p style={styles.notice}>
            初期設定が完了しました。続行するには再ログインしてください。
          </p>
        ) : (
          <p style={styles.text}>ログインしてください。</p>
        )}
        <div style={styles.actions}>
          <a href="/login" style={styles.linkButton}>ログイン</a>
          <a href="/upload" style={styles.linkButton}>アップロードへ</a>
          <a href="/logout" style={styles.linkButton}>ログアウト</a>
        </div>
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
  notice: {
    margin: 0,
    color: "#92400e",
    background: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: 10,
    padding: 12,
  },
  text: {
    margin: 0,
    color: "#374151",
  },
  linkButton: {
    marginTop: 12,
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    background: "#111827",
    color: "#ffffff",
    padding: "10px 14px",
    fontWeight: 700,
    textDecoration: "none",
  },
  actions: {
    display: "grid",
    gap: 8,
  },
};
