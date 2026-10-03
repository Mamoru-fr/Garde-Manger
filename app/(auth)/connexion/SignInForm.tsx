"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signin } from "@/lib/actions/AuthActions";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import Link from "next/link";
import { AlertTriangle, CheckCircle } from "lucide-react";

// Connexion via la chaîne ACS : action → contrôleur → service → Better-Auth.
// Le formulaire envoie les champs ; la brève vérification (Zod) est faite
// par l'action, la vérification poussée par le contrôleur, et c'est
// Better-Auth qui fait toute la connexion (session + cookies). La
// redirection vers /installations est portée par l'action en cas de succès.

export default function SignInForm() {
  const searchParams = useSearchParams();
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

  // Soumettre le formulaire — la chaîne ACS fait la vérification et
  // Better-Auth la connexion ; l'action redirige vers /installations.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    console.log("🔵 [CLIENT] Début de la soumission du formulaire de connexion");
    const formData = new FormData(e.currentTarget);
    console.log("🔵 [CLIENT] FormData:", {
      email: formData.get("email"),
      password: formData.get("password") ? "***" : "empty",
    });
    console.log("🔵 [CLIENT] Appel de signin()");
    const result = await signin(null, formData);
    console.log("🔵 [CLIENT] Résultat de signin():", result);

    if (!result.success) {
      console.log("❌ [CLIENT] Erreur de connexion:", result.error);
      setMessage({
        text: result.error || "Erreur de connexion",
        type: "error",
      });
      setIsLoading(false);
    } else {
      console.log("✅ [CLIENT] Connexion réussie, en attente de redirection...");
    }
    // En cas de succès : la redirection est portée par l'action
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
        Tu n'as pas de compte ?{" "}
        <Link href="/inscription" className="text-primary hover:underline">
          Crée-en un
        </Link>
      </p>
    </div>
  );
}
