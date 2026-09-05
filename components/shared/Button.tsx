"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

// Props du bouton
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Composant Button
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      fullWidth = false,
      disabled = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    // Construire la classe CSS en fonction des props
    const buttonClassName = [
      styles.base,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : "",
      disabled || isLoading ? styles.disabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={disabled || isLoading}
        {...props}
      >
        {leftIcon && !isLoading && (
          <span className={styles.icon}>{leftIcon}</span>
        )}
        {isLoading ? (
          <span className={styles.loadingWrapper}>
            <span className={styles.spinner}></span>
            <span className="visually-hidden">Chargement...</span>
          </span>
        ) : (
          children
        )}
        {rightIcon && !isLoading && (
          <span className={styles.icon}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
