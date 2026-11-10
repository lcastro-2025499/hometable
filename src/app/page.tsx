import { redirect } from "next/navigation";

import { TaskBoard } from "@/components/board/task-board";
import { getSession } from "@/lib/auth-server";

// La sesión se lee de las cookies en cada petición: este segmento puede
// bloquear el prerender (Cache Components).
export const instant = false;

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
  }

  return <TaskBoard />;
}
