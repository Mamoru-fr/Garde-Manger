import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getAuthHeaders } from "@/lib/utils/auth";
import SignUpForm from "./SignUpForm";

export default async function SignUpPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await auth.api.getSession({ headers: await getAuthHeaders() });
  if (session?.user) {
    redirect("/installations");
  }

  return <SignUpForm />;
}
