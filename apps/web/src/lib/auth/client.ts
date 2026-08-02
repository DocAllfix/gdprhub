"use client";

import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";

// Client di autenticazione. I cookie di sessione restano HttpOnly: qui non si maneggiano
// token, si chiamano endpoint.

export const authClient = createAuthClient({
  plugins: [organizationClient(), twoFactorClient()],
});

export const { signIn, signOut, useSession } = authClient;
