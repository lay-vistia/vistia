import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const runtime = "nodejs";

// 環境変数の存在確認（値は出力しない）
const authEnvKeys = Object.keys(process.env).filter(
  (key) => key.includes("NEXTAUTH") || key.includes("AUTH")
);
console.warn("[auth] auth env keys:", authEnvKeys);
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("[auth] NEXTAUTH_SECRET is missing");
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
