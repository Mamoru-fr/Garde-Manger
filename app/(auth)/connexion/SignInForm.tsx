"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signin } from "@/lib/actions/AuthActions";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  // Gérer les messages depuis l'URL
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

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await signin(null, formData);
    
    if (!result.success) {
      setMessage({
        text: result.error || "Erreur de connexion",
        type: "error",
      });
    }
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
          <Button type="submit" variant="primary">
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
        Tu n'as pas de compte ?{" "}
        <Link href="/inscription" className="text-primary hover:underline">
          Crée-en un
        </Link>
      </p>
    </div>
  );
}
