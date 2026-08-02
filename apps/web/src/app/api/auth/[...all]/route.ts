import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Endpoint di Better Auth. La registrazione pubblica è chiusa nella configurazione
// (`disableSignUp`), quindi questo instradamento non espone una porta d'ingresso: espone
// accesso, uscita, secondo fattore e recupero password per utenti che esistono già.

export const { GET, POST } = toNextJsHandler(auth);
