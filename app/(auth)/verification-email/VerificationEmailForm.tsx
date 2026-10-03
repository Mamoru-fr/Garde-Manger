"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { verifyEmail, resendVerificationEmail } from "@/lib/actions/AuthActions";
import { Button } from "@/components/shared";
import { CheckCircle, Clock, AlertTriangle } from "lucide-react";

// Vérification d'email via la chaîne ACS :
// action → contrôleur → service → Better-Auth (verifyEmail / sendVerificationEmail).
// Le lien de l'email pointe vers le handler /api/auth/verify-email, qui
// vérifie le token automatiquement puis redirige ; la page gère les états,
// la vérification manuelle et le renvoi (maintenant réellement branché sur
// l'action, l'ancien TODO affichait un succès factice).

export default function VerificationEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Vérifier le token (bouton « Vérifier manuellement »)
  const handleAutoVerify = async () => {
    if (!token) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("token", token);
    const result = await verifyEmail(null, formData);

    if (result.success) {
      setMessage({
        text: "Ton email a été vérifié avec succès ! Tu peux maintenant te connecter.",
        type: "success",
      });
    } else {
      setMessage({
        text: result.error || "Erreur lors de la vérification",
        type: "error",
      });
    }
    setIsLoading(false);
  };

  // Renvoyer l'email de vérification — vrai appel via la chaîne ACS
  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    const formData = new FormData();
    formData.append("email", email);
    const result = await resendVerificationEmail(null, formData);

    if (result.success) {
      setMessage({
        text: "Un nouvel email de vérification a été envoyé.",
        type: "success",
      });
    } else {
      setMessage({
        text: result.error || "Erreur lors de l'envoi de l'email",
        type: "error",
      });
    }
    setIsResending(false);
  };

  return (
    <div className="text-center">
      {/* Si un token est présent */}
      {token ? (
        <div className="flex flex-col items-center gap-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-muted">Vérification en cours...</p>
          <Button
            variant="primary"
            onClick={handleAutoVerify}
            isLoading={isLoading}
          >
            Vérifier manuellement
          </Button>
        </div>
      ) : (
        <>
          {/* Si email est présent mais pas de token */}
          {email && (
            <div className="flex flex-col items-center gap-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-muted">
                Un email de vérification a été envoyé à <strong>{email}</strong>.
              </p>
              <div className="flex gap-sm">
                <Button variant="outline" onClick={handleResend} isLoading={isResending}>
                  Renvoyer l&apos;email
                </Button>
                <Button variant="primary" onClick={() => window.location.href = "/connexion"}>
                  Retour à la connexion
                </Button>
              </div>
            </div>
          )}

          {/* Si aucun paramètre */}
          {!email && !token && (
            <div className="flex flex-col items-center gap-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                <AlertTriangle className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-muted">
                Aucune information de vérification fournie.
              </p>
              <Button variant="primary" onClick={() => window.location.href = "/connexion"}>
                Retour à la connexion
              </Button>
            </div>
          )}
        </>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`mt-lg p-md rounded-md ${
            message.type === "success"
              ? "bg-green-50 border border-green-400 text-green-800"
              : "bg-red-50 border border-red-400 text-red-800"
          }`}
        >
          {message.text}
          {message.type === "success" && (
            <div className="mt-sm">
              <Button variant="primary" size="sm" onClick={() => window.location.href = "/connexion"}>
                Se connecter
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
