"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/actions/AuthActions";
import { Input, Button, Form, FormField, FormActions } from "@/components/shared";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function SignUpForm() {
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await signup(null, formData);
    
    if (!result.success) {
      setMessage({
        text: result.error || "Erreur lors de l'inscription",
        type: "error",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold text-primary-dark mb-sm">
          Créer un compte
        </h2>
        <p className="text-muted">
          Rejoins Garde-Manger pour gérer tes stocks facilement.
        </p>
      </div>

      {/* Messages */}
      {message && (
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
            label="Nom"
            name="name"
            type="text"
            placeholder="Ton nom"
            required
            hint="Ton nom sera visible aux autres utilisateurs de tes installations"
          />
        </FormField>
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
            placeholder="Un mot de passe sécurisé"
            required
            hint="Minimum 8 caractères"
          />
        </FormField>
        <FormActions className="justify-end">
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isLoading ? "Création en cours..." : "Créer mon compte"}
          </Button>
        </FormActions>
      </Form>

      <p className="text-center text-muted">
        Tu as déjà un compte ?{" "}
        <Link href="/connexion" className="text-primary hover:underline">
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}
