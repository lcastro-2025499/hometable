"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, ListTodo, Loader2, Mail, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import {
  emailSchema,
  verifyEmailSchema,
  type VerifyEmailSchema,
} from "@/lib/auth-validation";

const RESEND_COOLDOWN_SECONDS = 60;

export function VerifyEmailForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const form = useForm<VerifyEmailSchema>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: initialEmail, otp: "" },
  });

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (values: VerifyEmailSchema) => {
    setLoading(true);

    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: values.email,
        otp: values.otp,
      });

      if (result.error) {
        const code = result.error.code ?? "";
        const message =
          code === "TOO_MANY_ATTEMPTS"
            ? "Demasiados intentos. Solicita un código nuevo."
            : code === "USER_NOT_FOUND"
              ? "No encontramos una cuenta con ese correo."
              : "Código incorrecto o expirado.";
        toast.error(message);
        return;
      }

      toast.success("¡Correo verificado!", {
        description: "Tu cuenta está activa. Bienvenido a Hometable.",
      });

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error inesperado al verificar el correo.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const parsedEmail = emailSchema.safeParse(form.getValues("email"));

    if (!parsedEmail.success) {
      toast.error("Ingresa un correo electrónico válido.");
      return;
    }

    setResending(true);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: parsedEmail.data,
        type: "email-verification",
      });

      if (result.error) {
        toast.error(result.error.message || "No pudimos reenviar el código.");
        return;
      }

      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Código reenviado", {
        description: "Revisa tu bandeja de entrada y la carpeta de spam.",
      });
    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error inesperado al reenviar el código.");
    } finally {
      setResending(false);
    }
  };

  const { errors } = form.formState;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
            <ListTodo className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Hometable</h1>
          <p className="text-sm text-muted-foreground">Verifica tu correo para activar la cuenta</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Código de verificación</CardTitle>
            <CardDescription>
              Enviamos un código de 6 dígitos al correo que registraste. Caduca en 10 minutos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="gap-4">
                <Field data-invalid={Boolean(errors.email)}>
                  <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="pl-9"
                      autoComplete="email"
                      {...form.register("email")}
                    />
                  </div>
                  {errors.email ? <FieldError>{errors.email.message}</FieldError> : null}
                </Field>

                <Field data-invalid={Boolean(errors.otp)}>
                  <FieldLabel htmlFor="otp">Código de 6 dígitos</FieldLabel>
                  <div className="relative">
                    <KeyRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className="pl-9 font-mono text-lg tracking-[0.4em]"
                      {...form.register("otp")}
                    />
                  </div>
                  <FieldDescription>Revisa también la carpeta de spam.</FieldDescription>
                  {errors.otp ? <FieldError>{errors.otp.message}</FieldError> : null}
                </Field>
              </FieldGroup>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="size-4 mr-2" />
                )}
                Verificar correo
              </Button>
            </form>

            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
              >
                {resending ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : (
                  <RotateCw className="size-4 mr-2" />
                )}
                {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar código"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center gap-2 border-t py-4 text-center text-sm text-muted-foreground">
            <p>
              ¿Te equivocaste de correo?{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                Crea otra cuenta
              </Link>
            </p>
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
