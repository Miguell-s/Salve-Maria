import { destroySession } from "@/lib/auth";
import { handle, ok } from "@/lib/security";

export const POST = handle(async () => {
  await destroySession();
  return ok();
});
