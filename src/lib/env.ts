/**
 * Lectura de variables de entorno del servidor. Se evalúa en tiempo de
 * ejecución (no al importar el módulo) para no romper `next build` cuando el
 * entorno de compilación no tiene secretos, y para fallar de forma clara en
 * cuanto una ruta realmente los necesita.
 */

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(`Falta la variable de entorno obligatoria ${name}.`);
  }

  return value;
}

export function requireSecret(name: string, minLength = 32): string {
  const value = requireEnv(name);

  if (value.length < minLength) {
    throw new Error(
      `La variable ${name} debe tener al menos ${minLength} caracteres.`,
    );
  }

  return value;
}
