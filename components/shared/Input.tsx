"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

// Props de l'Input
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: "default" | "filled" | "outline";
  inputSize?: "sm" | "md" | "lg";
  error?: boolean;
  errorMessage?: string;
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// Composant Input
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      variant = "default",
      inputSize = "md",
      error = false,
      errorMessage,
      label,
      hint,
      leftIcon,
      rightIcon,
      id,
      name,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const inputClassName = [
      styles.base,
      styles[variant],
      styles[inputSize],
      disabled ? styles.disabled : "",
      error ? styles.error : "",
      leftIcon ? styles.withLeftIcon : "",
      rightIcon ? styles.withRightIcon : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {props.required && (
              <span className={styles.required} aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className={styles.inputWrapper}>
          {leftIcon && (
            <span className={styles.icon}>{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={
              error && errorMessage ? `${inputId}-error` : undefined
            }
            className={inputClassName}
            {...props}
          />
          {rightIcon && (
            <span className={styles.icon}>{rightIcon}</span>
          )}
        </div>
        {error && errorMessage && (
          <p
            id={`${inputId}-error`}
            className={styles.errorMessage}
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        {hint && !error && (
          <p className={styles.hint}>{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
