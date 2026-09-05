import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import VerificationEmailForm from "./VerificationEmailForm";

export default async function VerificationEmailPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await auth.api.getSession({ headers: await getAuthHeaders() });
  if (session?.user) {
    redirect("/installations");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-lg text-center">
        <h2 className="text-2xl font-bold text-primary-dark mb-sm">
          Vérifie ton email
        </h2>
        <p className="text-muted">
          Nous avons envoyé un lien de vérification à ton adresse email.
        </p>
      </div>
      <VerificationEmailForm />
    </div>
  );
}
