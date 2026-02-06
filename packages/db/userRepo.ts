import type { DbClient } from "./assetRepo";

export type CreateUserInput = {
  id: string;
  handle: string;
  displayName: string;
};

export async function createUser(db: DbClient, input: CreateUserInput): Promise<void> {
  await db.query(
    "INSERT INTO users (id, handle, displayName, bio, plan, createdAt, updatedAt) VALUES ($1, $2, $3, '', 'FREE', now(), now())",
    [input.id, input.handle, input.displayName]
  );
}
