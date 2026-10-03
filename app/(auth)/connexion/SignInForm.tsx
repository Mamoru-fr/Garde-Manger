"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";
import { SignInSchema } from "@/lib/validations/auth";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";

// Connexion via le client officiel Better-Auth (doc : authentication/email-password).
// Le cookie de session est posé par le handler /api/auth/* dans la réponse HTTP —
// c'est lui qui marchait à côté de l'ancienne server action (les RSC ne peuvent
// pas poser de cookies). Plus de chaîne AuthActions → AuthController → AuthService.

export default function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Gérer les messages depuis l'URL (vérification email, reset mot de passe)
  useEffect(() => {
    const error = searchParams.get("error");
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");

    if (error && error !== "true") {
      setMessage({
        text: decodeURIComponent(error),
        type: "error",
      });
    } else if (verified === "success") {
      setMessage({
        text: "Email vérifié avec succès ! Tu peux maintenant te connecter.",
        type: "success",
      });
    } else if (reset === "success") {
      setMessage({
        text: "Mot de passe réinitialisé avec succès ! Tu peux maintenant te connecter.",
        type: "success",
      });
    }
  }, [searchParams]);

  // Soumettre le formulaire — authClient.signIn.email fait tout :
  // appel /api/auth/sign-in/email, pose du cookie, redirection (callbackURL).
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Validation Zod côté client (même schéma que l'ancienne server action)
    const validation = SignInSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      setMessage({
        text: fieldErrors
          ? Object.values(fieldErrors)[0][0]
          : "Données invalides",
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    const { error } = await authClient.signIn.email({
      email: validation.data.email,
      password: validation.data.password,
      callbackURL: "/installations",
    });

    if (error) {
      setMessage({
        text: getAuthErrorMessage({ status: error.status, code: error.code, message: error.message }),
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    // Redirection explicite (le callbackURL de Better-Auth vise la même cible)
    router.push("/installations");
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold text-primary-dark mb-sm">
          Connexion
        </h2>
        <p className="text-muted">
          Connecte-toi à ton compte pour gérer tes garde-mangers.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-lg p-md rounded-md flex items-start gap-sm ${
            message.type === "error"
              ? "bg-red-50 border border-red-400"
              : "bg-green-50 border border-green-400"
          }`}
        >
          {message.type === "error" ? (
            <AlertTriangle className="shrink-0 mt-0.5 text-red-600 w-5 h-5" />
          ) : (
            <CheckCircle className="shrink-0 mt-0.5 text-green-600 w-5 h-5" />
          )}
          <p
            className={`leading-relaxed text-sm ${
              message.type === "error" ? "text-red-800" : "text-green-800"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      <Form onSubmit={handleSubmit} className="mb-md">
        <FormField>
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="ton@email.com"
            required
          />
        </FormField>
        <FormField>
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            placeholder="Ton mot de passe"
            required
          />
        </FormField>
        <FormActions className="justify-end">
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Se connecter
          </Button>
        </FormActions>
      </Form>

      <div className="flex justify-between items-center text-sm mb-md">
        <Link href="/mot-de-passe/oublie" className="text-muted hover:text-primary">
          Mot de passe oublié ?
        </Link>
      </div>

      <p className="text-center text-muted">
        Tu n&apos;as pas de compte ?{" "}
        <Link href="/inscription" className="text-primary hover:underline">
          Crée-en un
        </Link>
      </p>
    </div>
  );
}
