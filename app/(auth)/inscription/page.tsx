import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/utils/auth";
import SignUpForm from "./SignUpForm";

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  // Vérifier si l'utilisateur est déjà connecté
  const session = await getCurrentSession();
  if (session?.user) {
    redirect("/installations");
  }

  return <SignUpForm />;
}
