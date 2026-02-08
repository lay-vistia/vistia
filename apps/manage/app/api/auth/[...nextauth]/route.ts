import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

export const runtime = "nodejs";

// 環境変数の存在確認（値は出力しない）
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("[auth] NEXTAUTH_SECRET is missing");
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
