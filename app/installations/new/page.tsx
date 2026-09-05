"use client";

import { useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createInstallation } from "@/lib/actions/InstallationActions";
import { ActionResponse } from "@/lib/types";
import { ArrowLeft, Warehouse } from "lucide-react";
import styles from "./InstallationForm.module.css";

interface FormState {
  name: string;
  description: string;
}

export default function CreateInstallationPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionResponse<{ installationId: string }> | null, formData: FormData) => {
      const result = await createInstallation(prevState, formData);
      if (result.success) {
        // La redirection est gérée par le server action
        // On ne fait rien ici, la redirection sera automatique
      }
      return result;
    },
    null as ActionResponse<{ installationId: string }> | null
  );

  const [formData, setFormData] = useState<FormState>({
    name: "",
    description: "",
  });

  // Gérer les erreurs
  const errorMessage = state?.error;
  const fieldErrors = state?.details as Record<string, string[]> | null;

  return (
    <main>
      <div className={styles.formContainer}>
        <div className={styles.formHeader}>
          <h1>Créer une nouvelle installation</h1>
          <p>Une installation représente un espace de stockage comme un garde-manger ou un frigo.</p>
        </div>

        {errorMessage && !fieldErrors && (
          <div className={styles.errorSummary}>
            <p>{errorMessage}</p>
          </div>
        )}

        {fieldErrors && (
          <div className={styles.errorSummary}>
            <h3>Erreurs dans le formulaire:</h3>
            <ul>
              {Object.entries(fieldErrors).map(([field, messages]) => (
                <li key={field}>
                  {field}: {messages.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div className={styles.formField}>
            <label htmlFor="name" className={styles.formLabel}>
              Nom de l'installation *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Mon Garde-Manger, Frigo de la cuisine, Placard du salon"
              required
              className={styles.formInput}
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="description" className={styles.formLabel}>
              Description (facultatif)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Garde-manger principal où je range les conserves et les épices"
              className={styles.formTextarea}
            />
            <p className={styles.formError}>
              {fieldErrors?.description ? fieldErrors.description[0] : ""}
            </p>
          </div>

          <div className={styles.formActions}>
            <Link href="/installations" className={`${styles.btn} ${styles.btnSecondary}`}>
              <ArrowLeft size={20} />
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <Warehouse size={20} />
              {isPending ? "Création en cours..." : "Créer l'installation"}
            </button>
          </div>
        </form>

        <div className={styles.links}>
          <Link href="/installations">← Retour à la liste des installations</Link>
        </div>
      </div>
    </main>
  );
}
