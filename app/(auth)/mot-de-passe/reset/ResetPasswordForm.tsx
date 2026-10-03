"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/utils/auth-errors";
import { ResetPasswordSchema } from "@/lib/validations/auth";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

// Réinitialisation du mot de passe via le client officiel Better-Auth.
// L'utilisateur arrive ici en cliquant sur le lien de l'email : le token est
// passé dans l'URL par le handler /api/auth/reset-password/:token (callbackURL).
// C'était la page manquante du flux : le lien de l'email n'aboutissait nulle part.

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validation Zod côté client (même schéma que l'ancienne server action :
    // le refine vérifie que les deux mots de passe correspondent)
    const validation = ResetPasswordSchema.safeParse({
      token: token ?? "",
      password,
      confirmPassword,
    });
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

    const { error } = await authClient.resetPassword({
      newPassword: validation.data.password,
      token: validation.data.token,
    });

    if (error) {
      setMessage({
        text: getAuthErrorMessage({ status: error.status, code: error.code, message: error.message }),
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    // Succès : retour à la connexion avec le message qui va bien
    router.push("/connexion?reset=success");
  };

  if (!token) {
    return (
      <div className="text-center flex flex-col items-center gap-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-muted">
          Lien de réinitialisation invalide ou expiré. Demande un nouvel email.
        </p>
        <Link href="/mot-de-passe/oublie" className="text-primary hover:underline">
          Refaire une demande
        </Link>
      </div>
    );
  }

  return (
    <>
      {message?.type === "error" && (
        <div className="mb-lg p-md rounded-md flex items-start gap-sm bg-red-50 border border-red-400">
          <AlertTriangle className="shrink-0 mt-0.5 text-red-600 w-5 h-5" />
          <p className="leading-relaxed text-sm text-red-800">
            {message.text}
          </p>
        </div>
      )}

      <Form onSubmit={handleSubmit} className="mb-md">
        <FormField>
          <Input
            label="Nouveau mot de passe"
            name="password"
            type="password"
            placeholder="Un mot de passe sécurisé"
            required
            hint="Minimum 8 caractères"
          />
        </FormField>
        <FormField>
          <Input
            label="Confirmer le mot de passe"
            name="confirmPassword"
            type="password"
            placeholder="Encore une fois"
            required
          />
        </FormField>
        <FormActions className="justify-end">
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isLoading ? "Réinitialisation..." : "Réinitialiser mon mot de passe"}
          </Button>
        </FormActions>
      </Form>

      <p className="text-center text-muted">
        <Link href="/connexion" className="text-primary hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
