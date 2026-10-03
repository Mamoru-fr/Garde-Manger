"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth/auth-client";
import { ForgotPasswordSchema } from "@/lib/validations/auth";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import { CheckCircle } from "lucide-react";

// Demande de réinitialisation via le client officiel Better-Auth.
// redirectTo : c'est LÀ que Better-Auth envoie l'utilisateur quand il clique
// sur le lien de l'email (la page lit le token dans l'URL). L'ancien code
// redirigeait vers /forgot-password/confirm — une page qui n'existe pas.

export default function ForgotPasswordForm() {
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    // Validation Zod côté client (même schéma que l'ancienne server action)
    const validation = ForgotPasswordSchema.safeParse({ email });
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

    const { error } = await authClient.forgetPassword({
      email: validation.data.email,
      redirectTo: "/mot-de-passe/reset",
    });

    if (error) {
      setMessage({
        text: "Une erreur est survenue lors de l'envoi. Réessaie dans un instant.",
        type: "error",
      });
    } else {
      // Même comportement que Better-Auth : pas de révélation sur l'existence
      // du compte — on affiche le message de succès quoi qu'il arrive.
      setMessage({
        text: "Un email de réinitialisation a été envoyé à ton adresse. Vérifie ta boîte de réception.",
        type: "success",
      });
    }

    setIsLoading(false);
  };

  return (
    <>
      {message?.type === "success" ? (
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-md">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-800 mb-md">
            {message.text}
          </p>
          <Link href="/connexion" className="text-primary hover:underline">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <Form onSubmit={handleSubmit} className="mb-md">
          {message?.type === "error" && (
            <div className="mb-lg p-md rounded-md bg-red-50 border border-red-400 text-red-800 text-sm">
              {message.text}
            </div>
          )}
          <FormField>
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="ton@email.com"
              required
            />
          </FormField>
          <FormActions className="justify-end">
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
            </Button>
          </FormActions>
        </Form>
      )}
    </>
  );
}
