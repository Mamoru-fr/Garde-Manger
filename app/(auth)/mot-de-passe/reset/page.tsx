import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await getCurrentSession();
  if (session?.user) {
    redirect("/installations");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-lg">
        <h2 className="text-2xl font-bold text-primary-dark mb-sm">
          Nouveau mot de passe
        </h2>
        <p className="text-muted">
          Choisis un nouveau mot de passe pour ton compte.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
