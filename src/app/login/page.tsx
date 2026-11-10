"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ListTodo, Loader2, Lock, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginSchema } from "@/lib/auth-validation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
      rememberMe: true,
    },
  });

  const { errors } = form.formState;

  const onSubmit = async (values: LoginSchema) => {
    setLoading(true);
    try {
      const isEmail = values.emailOrUsername.includes("@");
      const result = isEmail
        ? await signIn.email({
            email: values.emailOrUsername,
            password: values.password,
            rememberMe: values.rememberMe ?? true,
            callbackURL: "/",
          })
        : await signIn.username({
            username: values.emailOrUsername,
            password: values.password,
            rememberMe: values.rememberMe ?? true,
            callbackURL: "/",
          });

      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          toast.error("Debes verificar tu correo antes de iniciar sesión.", {
            description: "Te enviamos un código nuevo. Revisa tu bandeja de entrada.",
          });
          const query = isEmail
            ? `?email=${encodeURIComponent(values.emailOrUsername.trim())}`
            : "";
          router.push(`/verify-email${query}`);
          setLoading(false);
          return;
        }

        toast.error(result.error.message || "Credenciales incorrectas o error al iniciar sesión.");
        setLoading(false);
        return;
      }

      toast.success("¡Bienvenido de nuevo!");
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al iniciar sesión.");
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
          <p className="text-sm text-muted-foreground">Tu tablero de tareas personal y colaborativo</p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tu correo o usuario y contraseña para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FieldGroup className="gap-4">
                <Field data-invalid={Boolean(errors.emailOrUsername)}>
                  <FieldLabel htmlFor="emailOrUsername">Correo electrónico o usuario</FieldLabel>
                  <div className="relative">
                    <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="emailOrUsername"
                      placeholder="usuario o correo@ejemplo.com"
                      className="pl-9"
                      {...form.register("emailOrUsername")}
                    />
                  </div>
                  {errors.emailOrUsername ? <FieldError>{errors.emailOrUsername.message}</FieldError> : null}
                </Field>

                <Field data-invalid={Boolean(errors.password)}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
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
                  {errors.password ? <FieldError>{errors.password.message}</FieldError> : null}
                </Field>

                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="rememberMe"
                    defaultChecked={form.getValues("rememberMe")}
                    onCheckedChange={(checked) => form.setValue("rememberMe", Boolean(checked))}
                  />
                  <label
                    htmlFor="rememberMe"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Recordarme en este dispositivo (7 días)
                  </label>
                </div>
              </FieldGroup>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Entrar al tablero
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center border-t py-4 text-center text-sm text-muted-foreground">
            <p>
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
