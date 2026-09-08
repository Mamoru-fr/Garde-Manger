"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateObjectInInstallation } from "@/lib/actions/ObjectActions";
import { ObjectInstallation } from "@/lib/types";
import { Pencil, X, Calendar, MapPin, Package, AlertTriangle } from "lucide-react";
import styles from "./EditObjectInstallationForm.module.css";

interface EditObjectInstallationFormProps {
  objectInstallation: ObjectInstallation;
  installationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  quantity: number;
  location: string;
  expiryDate: string;
  notes: string;
}

export default function EditObjectInstallationForm({
  objectInstallation,
  installationId,
  onSuccess,
  onCancel,
}: EditObjectInstallationFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    quantity: objectInstallation.quantity || 1,
    location: objectInstallation.location || "",
    expiryDate: objectInstallation.expiryDate 
      ? new Date(objectInstallation.expiryDate).toISOString().split("T")[0]
      : "",
    notes: objectInstallation.note || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const submitFormData = new FormData();
      submitFormData.append("objectInstallationId", objectInstallation.id);
      submitFormData.append("quantity", formData.quantity.toString());
      submitFormData.append("location", formData.location);
      
      if (formData.expiryDate) {
        submitFormData.append("expiryDate", formData.expiryDate);
      }
      
      // Note: Le schema ObjectInstallation a un champ "note" mais UpdateObjectQuantitySchema
      // ne semble pas le gérer. On va essayer quand même.
      if (formData.notes) {
        submitFormData.append("note", formData.notes);
      }

      const result = await updateObjectInInstallation(null, submitFormData);

      if (!result.success) {
        setError(result.error || "Erreur lors de la mise à jour de l'objet");
        setIsSubmitting(false);
        return;
      }

      // Appeler onSuccess si fourni, sinon rediriger
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/installations/${installationId}`);
        router.refresh();
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la mise à jour");
      setIsSubmitting(false);
    }
  };

  // Formater la date pour l'affichage
  const formatDateForDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>
        <Pencil size={20} />
        Modifier l'objet dans l'installation
      </h2>

      <div className={styles.objectHeader}>
        <Package size={24} />
        <div>
          <h3 className={styles.objectName}>{objectInstallation?.objectDirectory?.name || "Objet inconnu"}</h3>
          {objectInstallation?.objectDirectory?.brand && (
            <p className={styles.objectBrand}>( {objectInstallation.objectDirectory.brand} )</p>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Quantité */}
          <div className={styles.formGroup}>
            <label htmlFor="quantity" className={styles.formLabel}>
              Quantité
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              className={styles.formInput}
              required
            />
          </div>

          {/* Emplacement */}
          <div className={styles.formGroup}>
            <label htmlFor="location" className={styles.formLabel}>
              <MapPin size={16} />
              Emplacement
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={styles.formInput}
              placeholder="Ex: Frigo, étagère A, placard"
            />
          </div>

          {/* Date de péremption */}
          <div className={styles.formGroup}>
            <label htmlFor="expiryDate" className={styles.formLabel}>
              <Calendar size={16} />
              Date de péremption
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          {/* Notes */}
          <div className={styles.formGroupFull}>
            <label htmlFor="notes" className={styles.formLabel}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className={styles.formTextarea}
              rows={3}
              placeholder="Ex: Acheté en promotion, à consommer rapidement"
            />
          </div>
        </div>

        <div className={styles.buttonsContainer}>
          <button
            type="button"
            onClick={onCancel || (() => router.push(`/installations/${installationId}`))}
            className={styles.btnCancel}
          >
            <X size={16} />
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.btnSubmit}
          >
            {isSubmitting ? (
              <>
                <span className={styles.spinner}></span>
                En cours...
              </>
            ) : (
              "Enregistrer"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
