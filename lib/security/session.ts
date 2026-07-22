import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "./errors";
import { limitByUser, type RateLimitPolicy } from "./rateLimit";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  sessionVersion: number;
}

export async function requireCurrentUser(
  policy?: RateLimitPolicy,
): Promise<CurrentUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (
    !user?.id ||
    typeof user.sessionVersion !== "number" ||
    user.sessionVersion < 0
  ) {
    throw new ApiError(401, "UNAUTHENTICATED", "Não autenticado.");
  }
  if (policy) await limitByUser(user.id, policy);
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    sessionVersion: user.sessionVersion,
  };
}
