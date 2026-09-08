"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteInstallation } from "@/lib/actions/InstallationActions";
import { Trash2 } from "lucide-react";

interface DeleteInstallationButtonProps {
  installationId: string;
  installationName: string;
  className?: string;
}

export default function DeleteInstallationButton({
  installationId,
  installationName,
  className = "btn btnDanger",
}: DeleteInstallationButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm(`Voulez-vous vraiment supprimer l'installation "${installationName}" ? Cette action est irreversible.`)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("id", installationId);
      
      const result = await deleteInstallation(null, formData);
      
      if (!result.success) {
        setError(result.error || "Erreur dans la suppression");
        setIsLoading(false);
        return;
      }
      
      // Redirection après suppression réussie
      router.push("/installations");
      router.refresh();
    } catch (err) {
      setError("Une erreur est survenue lors de la suppression");
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        type="button"
        onClick={handleDelete}
        disabled={isLoading}
        className={className}
      >
        <Trash2 size={16} />
        {isLoading ? "Suppression..." : "Supprimer"}
      </button>
      
      {error && (
        <div style={{ color: 'var(--danger-color, #ef4444)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
    </>
  );
}
