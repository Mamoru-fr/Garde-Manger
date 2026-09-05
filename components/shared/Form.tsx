"use client";

import { FormHTMLAttributes, HTMLAttributes, forwardRef } from "react";
import styles from "./Form.module.css";

// Props du Form
export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  spacing?: "sm" | "md" | "lg";
}

// Composant Form
export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ className = "", spacing = "md", children, ...props }, ref) => {
    const formClassName = [
      styles.base,
      styles[`spacing_${spacing}`],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <form ref={ref} className={formClassName} {...props}>
        {children}
      </form>
    );
  }
);

Form.displayName = "Form";

// Composant FormField (conteneur pour un champ de formulaire)
export const FormField = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.field} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FormField.displayName = "FormField";

// Composant FormActions (conteneur pour les boutons du formulaire)
export const FormActions = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.actions} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FormActions.displayName = "FormActions";
