import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

/**
 * Cliente de Better Auth. Usa el mismo origen que la página: no se configura
 * una URL absoluta para evitar enlaces y cookies apuntando al host equivocado.
 */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});

export const { useSession, signIn, signUp, signOut, requestPasswordReset, resetPassword } = authClient;
