"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AtSign, CheckCircle2, ListTodo, Loader2, Lock, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { registerSchema, type RegisterSchema } from "@/lib/auth-validation";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaKey, setRecaptchaKey] = useState(0);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LdjaxguAAAAACh5fP3_qDgLFAvcdzvTTc5Cs4-l";

  const form = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit", // Solo validar al enviar el formulario
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { errors } = form.formState;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isButtonDisabled = !!errors.confirmPassword || loading || isSubmitting;

  const onSubmit = async (values: RegisterSchema) => {
    if (!recaptchaToken) {
      toast.error("Por favor completa la verificación de reCAPTCHA.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Verify reCAPTCHA token with server
      const recaptchaRes = await fetch("/api/auth/verify-recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: recaptchaToken }),
      });

      const recaptchaData = await recaptchaRes.json();
      if (!recaptchaData.success) {
        toast.error(recaptchaData.message || "Error al verificar reCAPTCHA.");
        setRecaptchaToken(null);
        setRecaptchaKey((k) => k + 1);
        setIsSubmitting(false);
        return;
      }

      // 2. Sign up user via API (handles additional fields firstName, lastName)
      const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
          name: fullName,
          username: values.username.trim(),
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
        }),
      });

      const registerData = await res.json();

      if (!res.ok) {
        toast.error(registerData.error || "Error al registrar la cuenta.");
        setRecaptchaToken(null);
        setRecaptchaKey((k) => k + 1);
        setIsSubmitting(false);
        return;
      }

      toast.success("¡Registro completado exitosamente!", {
        description: "Ahora puedes iniciar sesión con tu correo o nombre de usuario.",
      });

      router.push("/login");
      router.refresh();
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al registrar la cuenta.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-2">
            <ListTodo className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Hometable</h1>
          <p className="text-sm text-muted-foreground">Crea tu cuenta para organizar tus tareas</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Crear una cuenta</CardTitle>
            <CardDescription>Completa todos los campos para registrarte</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field data-invalid={Boolean(errors.firstName)}>
                    <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="Juan"
                        className="pl-9"
                        {...form.register("firstName")}
                      />
                    </div>
                    {errors.firstName ? <FieldError>{errors.firstName.message}</FieldError> : null}
                  </Field>

                  <Field data-invalid={Boolean(errors.lastName)}>
                    <FieldLabel htmlFor="lastName">Apellidos</FieldLabel>
                    <div className="relative">
                      <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="lastName"
                        placeholder="Pérez"
                        className="pl-9"
                        {...form.register("lastName")}
                      />
                    </div>
                    {errors.lastName ? <FieldError>{errors.lastName.message}</FieldError> : null}
                  </Field>
                </div>

                <Field data-invalid={Boolean(errors.username)}>
                  <FieldLabel htmlFor="username">Nombre de usuario</FieldLabel>
                  <div className="relative">
                    <AtSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="juanperez"
                      className="pl-9"
                      {...form.register("username")}
                    />
                  </div>
                  <FieldDescription>Entre 3 y 15 caracteres (solo letras, números y _)</FieldDescription>
                  {errors.username ? <FieldError>{errors.username.message}</FieldError> : null}
                </Field>

                <Field data-invalid={Boolean(errors.email)}>
                  <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      className="pl-9"
                      {...form.register("email")}
                    />
                  </div>
                  {errors.email ? <FieldError>{errors.email.message}</FieldError> : null}
                </Field>

                <Field data-invalid={Boolean(errors.password)}>
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      {...form.register("password")}
                    />
                  </div>
                  <FieldDescription>Mínimo 8 caracteres, al menos 1 mayúscula y 2 números</FieldDescription>
                  {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}
                </Field>

                <Field data-invalid={Boolean(errors.confirmPassword)}>
                  <FieldLabel htmlFor="confirmPassword">Confirmar contraseña</FieldLabel>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      {...form.register("confirmPassword")}
                    />
                  </div>
                  {errors.confirmPassword ? <FieldError>{errors.confirmPassword.message}</FieldError> : null}
                </Field>

                <div className="flex justify-center pt-2">
                  <ReCAPTCHA
                    key={recaptchaKey}
                    sitekey={siteKey}
                    onChange={(token) => setRecaptchaToken(token)}
                    onExpired={() => setRecaptchaToken(null)}
                  />
                </div>
              </FieldGroup>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={isButtonDisabled}
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                Registrarse
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center border-t py-4 text-center text-sm text-muted-foreground">
            <p>
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
