"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Devuelve `false` durante el render en servidor y el primer render en cliente,
 * y `true` una vez hidratado. Evita desajustes con datos de localStorage.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
