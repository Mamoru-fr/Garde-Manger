"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInstallation } from "@/lib/actions/InstallationActions";
import { Installation } from "@/lib/types";
import styles from "./EditInstallationForm.module.css";

// Type pour les props
interface EditInstallationFormProps {
  installation: Installation;
}

export default function EditInstallationForm({ installation }: EditInstallationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(installation.name);
  const [description, setDescription] = useState(installation.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("installationId", installation.id);
      formData.append("name", name);
      formData.append("description", description);
      
      const result = await updateInstallation(null, formData);

      if (!result.success) {
        setError(result.error || "Erreur lors de la mise à jour de l'installation");
        setIsSubmitting(false);
        return;
      }

      router.push(`/installations/${installation.id}`);
      router.refresh();
    } catch (err) {
      setError("Une erreur est survenue lors de la mise à jour");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h1 className={styles.formTitle}>
        Modifier l'installation
      </h1>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.formLabel}>
            Nom de l'installation
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.formInput}
            required
            placeholder="Ex: Mon Frigo"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.formLabel}>
            Description (optionnel)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.formTextarea}
            rows={4}
            placeholder="Ex: Garde-manger de la cuisine principale"
          />
        </div>

        <div className={styles.buttonsContainer}>
          <button
            type="button"
            onClick={() => router.push(`/installations/${installation.id}`)}
            className={styles.btnCancel}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.btnSubmit}
          >
            {isSubmitting ? "En cours..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
