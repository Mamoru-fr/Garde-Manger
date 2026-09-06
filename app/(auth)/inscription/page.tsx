import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import SignUpForm from "./SignUpForm";

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const headers = await getAuthHeaders();
  const session = await auth.api.getSession({ headers });
  if (session?.user) {
    redirect("/installations");
  }

  return <SignUpForm />;
}
