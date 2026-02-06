import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/auth-options";

export async function requireUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const userId = session?.user && "id" in session.user ? (session.user as any).id : null;
  if (!userId || typeof userId !== "string") {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}
