import { VerifyEmailForm } from "./verify-email-form";

// `searchParams` se conoce en tiempo de petición: el segmento puede bloquear
// el prerender (Cache Components).
export const instant = false;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawEmail = params.email;
  const email = typeof rawEmail === "string" ? rawEmail : "";

  return <VerifyEmailForm initialEmail={email} />;
}
