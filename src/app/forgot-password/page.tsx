"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, KeyRound, ListTodo, Loader2, Lock, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { requestPasswordReset, resetPassword } from "@/lib/auth-client";
import { forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordSchema, type ResetPasswordSchema } from "@/lib/auth-validation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  // Form for Step 1: Request reset code
  const requestForm = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  // Form for Step 2: Enter code + new password
  const resetForm = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: "", password: "", confirmPassword: "" },
  });

  const onRequestSubmit = async (values: ForgotPasswordSchema) => {
    setLoading(true);
    try {
      const result = await requestPasswordReset({
        email: values.email,
        redirectTo: "/forgot-password",
      });

      if (result.error) {
        toast.error(result.error.message || "Error al solicitar código de restablecimiento.");
        setLoading(false);
        return;
      }

      setSentEmail(values.email);
      setStep("reset");
      toast.success("Código enviado a tu correo", {
        description: "Revisa tu bandeja de entrada e ingresa el código de verificación.",
      });
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al enviar el código.");
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (values: ResetPasswordSchema) => {
    setLoading(true);
    try {
      const result = await resetPassword({
        newPassword: values.password,
        token: values.token,
      });

      if (result.error) {
        toast.error(result.error.message || "Código inválido o expirado.");
        setLoading(false);
        return;
      }

      toast.success("¡Contraseña restablecida exitosamente!", {
        description: "Inicia sesión con tu nueva contraseña.",
      });

      router.push("/login");
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
            <ListTodo className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Hometable</h1>
          <p className="text-sm text-muted-foreground">Recuperación de contraseña</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {step === "request" ? "Recuperar contraseña" : "Ingresa tu nuevo password"}
            </CardTitle>
            <CardDescription>
              {step === "request"
                ? "Te enviaremos un código de verificación a tu correo registrado."
                : `Ingresa el código enviado a ${sentEmail} y tu nueva contraseña.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "request" ? (
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                <FieldGroup className="gap-4">
                  <Field data-invalid={Boolean(requestForm.formState.errors.email)}>
                    <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="correo@ejemplo.com"
                        className="pl-9"
                        {...requestForm.register("email")}
                      />
                    </div>
                    {requestForm.formState.errors.email ? (
                      <FieldError>{requestForm.formState.errors.email.message}</FieldError>
                    ) : null}
                  </Field>
                </FieldGroup>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Enviar código de verificación
                </Button>
              </form>
            ) : (
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FieldGroup className="gap-4">
                  <Field data-invalid={Boolean(resetForm.formState.errors.token)}>
                    <FieldLabel htmlFor="token">Código de verificación</FieldLabel>
                    <div className="relative">
                      <KeyRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="token"
                        placeholder="Código de 6 dígitos o token"
                        className="pl-9 font-mono"
                        {...resetForm.register("token")}
                      />
                    </div>
                    {resetForm.formState.errors.token ? (
                      <FieldError>{resetForm.formState.errors.token.message}</FieldError>
                    ) : null}
                  </Field>

                  <Field data-invalid={Boolean(resetForm.formState.errors.password)}>
                    <FieldLabel htmlFor="newPassword">Nueva contraseña</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        {...resetForm.register("password")}
                      />
                    </div>
                    <FieldDescription>Mínimo 8 caracteres, 1 mayúscula y 2 números</FieldDescription>
                    {resetForm.formState.errors.password ? (
                      <FieldError>{resetForm.formState.errors.password.message}</FieldError>
                    ) : null}
                  </Field>

                  <Field data-invalid={Boolean(resetForm.formState.errors.confirmPassword)}>
                    <FieldLabel htmlFor="confirmPassword">Confirmar nueva contraseña</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        {...resetForm.register("confirmPassword")}
                      />
                    </div>
                    {resetForm.formState.errors.confirmPassword ? (
                      <FieldError>{resetForm.formState.errors.confirmPassword.message}</FieldError>
                    ) : null}
                  </Field>
                </FieldGroup>

                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Restablecer contraseña
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center border-t py-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
              <ArrowLeft className="size-4" /> Volver al inicio de sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
