"use client";

import { Fragment, ReactNode, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./Modal.module.css";

// Props de la Modal
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

// Composant Modal
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  // Fermer la modal avec Escape
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (closeOnEscape && event.key === "Escape") {
      onClose();
    }
  };

  // Fermer la modal en cliquant sur l'overlay
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  // Ne pas rendre si non ouvert
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <Fragment>
      {/* Overlay */}
      <div
        className={styles.overlay}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className={styles.modalWrapper}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${title}-modal-title` : undefined}
      >
        <div
          className={`${styles.modal} ${styles[size]}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className={styles.header}>
              {title && (
                <h2
                  id={`${title}-modal-title`}
                  className={styles.title}
                >
                  {title}
                </h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={styles.closeButton}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}
          
          {/* Content */}
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </Fragment>,
    document.body
  );
}
