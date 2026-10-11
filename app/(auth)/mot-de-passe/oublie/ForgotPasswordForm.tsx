"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/AuthActions";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import { CheckCircle } from "lucide-react";

// Demande de réinitialisation via la chaîne ACS :
// action → contrôleur → service → Better-Auth (requestPasswordReset).
// En cas de succès, pas de redirection : le formulaire affiche l'écran de
// confirmation (l'ancienne version redirigeait vers une page inexistante).

export default function ForgotPasswordForm() {
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPassword(null, formData);

    if (!result.success) {
      setMessage({
        text: result.error || "Erreur lors de la demande",
        type: "error",
      });
    } else {
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
