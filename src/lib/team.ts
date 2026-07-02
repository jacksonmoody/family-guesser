import { cookies } from "next/headers";

const TEAM_COOKIE = "team_id";
const ADMIN_COOKIE = "admin_ok";

export async function getTeamId(): Promise<string | null> {
  const store = await cookies();
  return store.get(TEAM_COOKIE)?.value ?? null;
}

export async function setTeamCookie(teamId: string): Promise<void> {
  const store = await cookies();
  store.set(TEAM_COOKIE, teamId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 3,
    path: "/",
  });
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "1";
}

export async function setAdminCookie(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}
