"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import {
  addMemberToInstallation,
  removeMemberFromInstallation,
} from "@/lib/actions/InstallationActions";
import styles from "./Modal.module.css";

// Types
interface Member {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  role: string;
}

interface MembersModalProps {
  installationId: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
}

export default function MembersModal({
  installationId,
  members,
  currentUserId,
  onClose,
}: MembersModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"viewer" | "editor">("viewer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await addMemberToInstallation(
      installationId,
      email,
      selectedRole
    );

    if (!result.success) {
      setError(result.error || "Erreur lors de l'ajout du membre");
    } else {
      setEmail("");
      setSelectedRole("viewer");
      router.refresh();
    }
    setIsSubmitting(false);
  };

  const handleRemoveMember = async (userId: string) => {
    const result = await removeMemberFromInstallation(installationId, userId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Erreur lors de la suppression du membre");
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Gérer les membres"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      {/* Formulaire pour ajouter un membre */}
      <form onSubmit={handleAddMember} className={styles.modalForm}>
        <div className={styles.modalFormRow}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email du membre"
            className={styles.modalInput}
            required
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as "viewer" | "editor")}
            className={styles.modalSelect}
          >
            <option value="viewer">Lecture seule</option>
            <option value="editor">Édition autorisée</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.modalButton}
          >
            {isSubmitting ? "Ajout..." : "Ajouter"}
          </button>
        </div>
        {error && <p className={styles.modalError}>{error}</p>}
      </form>

      {/* Liste des membres */}
      <div className={styles.modalSection}>
        <h3 className={styles.modalSectionTitle}>
          Membres actuels ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className={styles.modalEmptyState}>
            Aucun membre pour le moment.
          </p>
        ) : (
          <ul className={styles.modalMembersList}>
            {members.map((member, index) => (
              <li key={index} className={styles.modalMemberItem}>
                <div className={styles.modalMemberInfo}>
                  <div className={styles.modalMemberName}>
                    {member.user.name || member.user.email}
                  </div>
                  <div className={styles.modalMemberRole}>
                    {member.role === "owner"
                      ? "Propriétaire"
                      : member.role === "editor"
                      ? "Éditeur"
                      : "Lecture seule"}
                  </div>
                </div>
                {/* Empêcher de se supprimer soi-même */}
                {member.user.id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(member.user.id)}
                    className={styles.modalRemoveButton}
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
