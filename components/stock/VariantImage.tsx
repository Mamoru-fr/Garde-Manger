"use client";

// ============================================
// VariantImage — l'image produit de la fiche détail variante
// (bloc 4 R2, réparé le 05/10 au chantier 4:2).
// La page qui la porte est un Server Component : un handler
// onError ne peut PAS y vivre (fonction prop non sérialisable
// → exception serveur au premier rendu). Ce composant client
// reprend le pattern ObjectGlobalCard : une image OFF morte
// se cache, elle ne casse pas la mise en page.
// ============================================

export default function VariantImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
      }}
    />
  );
}
