"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInstallation } from "@/lib/actions/InstallationActions";
import { Installation } from "@/lib/types";

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

      // Rediriger vers la page de l'installation après mise à jour
      router.push(`/installations/${installation.id}`);
      router.refresh(); // Rafraîchir les données
    } catch (err) {
      setError("Une erreur est survenue lors de la mise à jour");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FDF6E8] p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-[#2E1A10] mb-6">
          Modifier l'installation
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nom de l'installation
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5D4037] focus:border-transparent"
              required
              placeholder="Ex: Mon Frigo"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description (optionnel)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5D4037] focus:border-transparent"
              rows={4}
              placeholder="Ex: Garde-manger de la cuisine principale"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/installations/${installation.id}`)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#5D4037] text-white rounded-md hover:bg-[#3E2723] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "En cours..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
