import { randomUUID, UUID } from "node:crypto";

export function generateToken(): string {
  const id: UUID = randomUUID();
  return id;
}