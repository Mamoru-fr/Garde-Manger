"use client";

import { HTMLAttributes, forwardRef } from "react";
import styles from "./Card.module.css";

// Props de la Card
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "primary" | "secondary" | "'accent'";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
  clickable?: boolean;
  shadow?: "none" | "sm" | "md" | "lg";
}

// Composant Card
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = "",
      variant = "default",
      padding = "md",
      hoverable = false,
      clickable = false,
      shadow = "sm",
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const cardClassName = [
      styles.base,
      styles[variant],
      styles[`padding_${padding}`],
      styles[`shadow_${shadow}`],
      hoverable ? styles.hoverable : "",
      clickable ? styles.clickable : "",
      onClick ? styles.clickable : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={cardClassName}
        onClick={onClick}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// Composant CardHeader
export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.header} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// Composant CardContent
export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.content} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

// Composant CardFooter
export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`${styles.footer} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";
