import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import TikTokProvider from "next-auth/providers/tiktok";
import { getDb } from "../../../../../../packages/db/client";
import {
  getAuthAccountByProviderUserId,
  getEmailAuthAccountByEmail,
} from "../../../../../../packages/db/authAccountRepo";
import { verifyPassword } from "../../../../../../packages/auth/password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "EmailPassword",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const db = getDb();
        const account = await getEmailAuthAccountByEmail(db, email);
        if (!account || !account.passwordHash) return null;

        const ok = await verifyPassword(password, account.passwordHash);
        if (!ok) return null;

        return { id: account.userId, email: account.email };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    // X（Twitter）
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID ?? "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
    }),
    TikTokProvider({
      clientId: process.env.TIKTOK_CLIENT_ID ?? "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      const userId = (token as any).userId as string | undefined;
      if (session.user && userId) (session.user as any).id = userId;
      if (session.user && !userId && (token as any).oauthProvider) {
        (session.user as any).needsOnboarding = true;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user?.id) (token as any).userId = user.id;
      if (!(token as any).userId && account?.provider && account.provider !== "credentials") {
        const provider =
          account.provider === "google"
            ? "GOOGLE"
            : account.provider === "twitter"
            ? "X"
            : account.provider === "tiktok"
            ? "TIKTOK"
            : null;
        if (provider && account.providerAccountId) {
          const db = getDb();
          const authAccount = await getAuthAccountByProviderUserId(
            db,
            provider,
            account.providerAccountId
          );
          if (authAccount?.userId) {
            (token as any).userId = authAccount.userId;
          } else {
            // OAuth 初回ログイン用の一時情報をトークンに保持
            (token as any).oauthProvider = provider;
            (token as any).oauthProviderAccountId = account.providerAccountId;
          }
        }
      }
      return token;
    },
    async signIn({ account }) {
      if (!account || account.provider === "credentials") return true;
      const provider =
        account.provider === "google"
          ? "GOOGLE"
          : account.provider === "twitter"
          ? "X"
          : account.provider === "tiktok"
          ? "TIKTOK"
          : null;
      if (!provider || !account.providerAccountId) return false;
      // OAuth 初回ログインも許可し、後続のオンボーディングでユーザー作成する
      return true;
    },
  },
  session: { strategy: "jwt" },
  // TODO: adapter / secret / pages などの設定を追加
  secret: process.env.NEXTAUTH_SECRET,
};
