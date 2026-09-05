import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await auth.api.getSession({ headers: await getAuthHeaders() });
  if (session?.user) {
    redirect("/installations");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold text-primary-dark mb-sm">
          Mot de passe oublié ?
        </h2>
        <p className="text-muted">
          Saisis ton adresse email et nous t'enverrons un lien pour réinitialiser ton mot de passe.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
