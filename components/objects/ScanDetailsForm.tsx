"use client";

import {useState, useEffect, useCallback} from "react";
import {useRouter} from "next/navigation";
import {
  Package,
  Calendar,
  MapPin,
  Hash,
  Euro,
  StickyNote,
  Plus,
  Minus,
  X,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import {addScannedObject, adjustObjectQuantity} from "@/lib/actions/ObjectActions";
import {correctVariantFromScan} from "@/lib/actions/VariantActions";
import {searchProductsByName, linkBarcodeToDirectory} from "@/lib/actions/DirectoryActions";
import {buildScanCorrectionPlan} from "@/lib/services/ScanResolutionViewService";
import Link from "next/link";
import {SimplifiedDirectoryItem} from "@/lib/types/scanTypes";
import NutriscoreBadge from "@/components/objects/NutriscoreBadge";
import styles from "./ScanDetailsForm.module.css";

interface ScanDetailsFormProps {
  installationId: string;
  directoryItem: SimplifiedDirectoryItem | null;
  barcode: string;
  currentQuantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScanDetailsForm({
  installationId,
  directoryItem,
  barcode,
  currentQuantity = 0,
  onClose,
  onSuccess,
}: ScanDetailsFormProps) {
  const router = useRouter();

  // Valeurs par défaut intelligentes
  const today = new Date().toISOString().split("T")[0];

  // État du formulaire
  const [formData, setFormData] = useState({
    quantity: currentQuantity > 0 ? 1 : 1,
    location: localStorage.getItem("lastLocation") || "",
    purchaseDate: today,
    expiryDate: "",
    lotNumber: "",
    price: "",
    notes: "",
    // Champs pour l'objet
    name: directoryItem?.name || "",
    brand: directoryItem?.brand || "",
    category: directoryItem?.category || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Round 3 du 4:2 (11/10) — liaison code-barres → fiche existante :
  // le produit est inconnu (directoryItem null), l'utilisateur peut le
  // retrouver dans l'annuaire. La fiche choisie remplace alors la vue
  // « objet inconnu » : header, préremplissage et correction R2
  // travaillent sur elle, et le submit ira chez elle (addScannedObject
  // retrouve la ligne barcode_directory fraîchement écrite).
  const [linkedItem, setLinkedItem] = useState<SimplifiedDirectoryItem | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState<SimplifiedDirectoryItem[]>([]);
  const [linkSearched, setLinkSearched] = useState(false);
  const [isLinkSearching, setIsLinkSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  // La fiche effective : celle du scan, sinon celle liée à la main.
  const effectiveItem = directoryItem ?? linkedItem;

  // Sauvegarder le dernier emplacement utilisé
  useEffect(() => {
    if (formData.location) {
      localStorage.setItem("lastLocation", formData.location);
    }
  }, [formData.location]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const {name, value, type} = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseInt(value)) : value,
    }));
  }, []);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  }, []);

  // Rechercher une fiche existante par son nom (action existante —
  // zéro nouvelle requête). Seules les fiches LOCALES sont proposées :
  // barcode === "" = marqueur d'annuaire (DirectoryService l.432) ; un
  // résultat OFF non résolu n'a pas de fiche locale à lier.
  const handleLinkSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkSearch.trim();
    if (!trimmed || isLinkSearching) return;
    setIsLinkSearching(true);
    setLinkError(null);
    setLinkSearched(false);
    try {
      const result = await searchProductsByName(trimmed, 10);
      if (result.success && result.data) {
        setLinkResults(result.data.filter((r) => r.barcode === ""));
      } else {
        setLinkResults([]);
      }
      setLinkSearched(true);
    } catch (err) {
      console.error("[ScanDetailsForm] Erreur recherche liaison:", err);
      setLinkError("Erreur lors de la recherche dans l'annuaire");
    } finally {
      setIsLinkSearching(false);
    }
  };

  // Lier le code-barres scanné à la fiche choisie. Le service invalide
  // le scanCache (le négatif était caché — sans ça, le submit
  // re-créerait une fiche). Conflit → message explicite, la fusion
  // de fiches (R4/R5) reste LE geste pour déplacer un code.
  const handleLinkSelect = async (item: SimplifiedDirectoryItem) => {
    setLinkingId(item.id);
    setLinkError(null);
    try {
      const result = await linkBarcodeToDirectory(barcode, item.id);
      if (!result.success) {
        setLinkError(result.error || "La liaison a échoué");
        return;
      }
      console.log("[ScanDetailsForm] Code-barres lié à la fiche:", item.name);
      setLinkedItem(item);
      // Préremplir le formulaire avec la fiche choisie
      setFormData(prev => ({
        ...prev,
        name: item.name || prev.name,
        brand: item.brand || prev.brand,
        category: item.category || prev.category,
      }));
      setLinkResults([]);
      setLinkSearch("");
      setLinkSearched(false);
    } catch (err) {
      console.error("[ScanDetailsForm] Erreur liaison:", err);
      setLinkError("Une erreur inattendue est survenue lors de la liaison");
    } finally {
      setLinkingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // R2 4:2 (option B — Alexis 06/10) : correction de fiche au submit,
    // AVANT l'ajout. BONUS : son échec n'empêche jamais l'ajout.
    // Décisions 11/10 : nom → générique, marque → variante (repli
    // générique), le verrou OFF est passé (cible du geste).
    const scannedVariant = effectiveItem?.variant ?? null;
    const correctionPlan = buildScanCorrectionPlan({
      currentName: effectiveItem?.name ?? "",
      submittedName: formData.name,
      currentBrand: scannedVariant?.brand ?? effectiveItem?.brand ?? null,
      submittedBrand: formData.brand,
      hasVariant: Boolean(scannedVariant),
    });
    if (correctionPlan.nameChanged || correctionPlan.brandChanged) {
      try {
        await correctVariantFromScan(
          barcode,
          formData.name.trim(),
          formData.brand.trim()
        );
        console.log("[ScanDetailsForm] Fiche corrigée depuis le scan");
      } catch (corrErr) {
        console.error("[ScanDetailsForm] Correction échouée (bonus, l'ajout continue) :", corrErr);
      }
    }

    try {
      // Ajouter ou mettre à jour
      const isUpdate = currentQuantity > 0;
      const result = isUpdate
        ? await adjustObjectQuantity(installationId, barcode, formData.quantity)
        : await addScannedObject(
            installationId,
            barcode,
            formData.quantity,
            {
              name: formData.name || undefined,
              category: formData.category || undefined,
              description: effectiveItem?.description || undefined,
              brand: formData.brand || undefined,
              expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
              location: formData.location?.trim() || undefined
            }
          );
      
      if (!result.success) {
        setError(result.error || "Erreur lors de l'ajout de l'objet");
        setIsSubmitting(false);
        return;
      }

      // Succès
      onSuccess();
    } catch (err) {
      setError("Une erreur inattendue est survenue. Veuillez réessayer.");
      setIsSubmitting(false);
    }
  };

  // Calculer les jours jusqu'à péremption
  const getDaysUntilExpiry = useCallback(() => {
    if (!formData.expiryDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliser à minuit

    const expiry = new Date(formData.expiryDate + "T00:00:00");
    const diff = expiry.getTime() - today.getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [formData.expiryDate]);

  const daysUntilExpiry = getDaysUntilExpiry();

  // Est-ce que la date de péremption est dans le passé ?
  const isExpiryInPast = daysUntilExpiry !== null && daysUntilExpiry < 0;

  // Vérifier si l'objet existe déjà dans l'installation
  const alreadyExists = currentQuantity > 0;

  // Prix formaté pour l'affichage
  const displayPrice = formData.price
    ? new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(formData.price))
    : "";

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-details-title"
    >
      <div className={styles.modalContent}>
        {/* En-tête avec infos produit */}
        <div className={styles.productHeader}>
          <div className={styles.productImageContainer}>
            {effectiveItem?.imageUrl ? (
              <img
                src={effectiveItem.imageUrl}
                alt={effectiveItem.name || "Produit"}
                className={styles.productImage}
              />
            ) : (
              <div className={styles.productPlaceholder}>
                <Package size={48} />
              </div>
            )}
          </div>

          <div className={styles.productInfo}>
            {effectiveItem?.isReadOnly ? (
              // Affichage en lecture seule pour les objets OpenFoodFacts
              <>
                <div className={styles.productNameRow}>
                  <h2 id="scan-details-title" className={styles.productName}>
                    {effectiveItem?.name || "Objet inconnu"}
                  </h2>
                  {effectiveItem?.nutriscore && (
                    <NutriscoreBadge score={effectiveItem.nutriscore} size="small" />
                  )}
                </div>

                {effectiveItem?.brand && (
                  <p className={styles.productBrand}>
                    <strong>Marque:</strong> {effectiveItem.brand}
                  </p>
                )}
                {effectiveItem?.category && (
                  <p className={styles.productCategory}>
                    <strong>Catégorie:</strong> {effectiveItem.category}
                  </p>
                )}
                {effectiveItem?.openFoodFactsId && (
                  <p className={styles.productOFF}>
                    <a
                      href={`https://openfoodfacts.org/product/${effectiveItem.openFoodFactsId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.offLink}
                    >
                      Voir sur OpenFoodFacts
                    </a>
                  </p>
                )}
              </>
            ) : (
              // Champs éditables pour les objets modifiables
              <div>
                <div className={styles.productEditForm}>
                  <div className={styles.productEditRow}>
                    <label htmlFor="name" className={styles.productEditLabel}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={styles.formInput}
                      placeholder="Nom du produit"
                      required
                    />
                  </div>
                </div>

                <div className={styles.productEditGrid}>
                  <div>
                    <label htmlFor="brand" className={styles.productEditLabel}>
                      Marque
                    </label>
                    <input
                      type="text"
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className={styles.formInput}
                      placeholder="Marque"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className={styles.productEditLabel}>
                      Catégorie
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className={styles.formSelect}
                    >
                      <option value="">Sélectionnez une catégorie</option>
                      <option value="Produits alimentaires">Produits alimentaires</option>
                      <option value="Boissons">Boissons</option>
                      <option value="Produits d'hygiène">Produits d'hygiène</option>
                      <option value="Produits ménagers">Produits ménagers</option>
                      <option value="Bricolage">Bricolage</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                {effectiveItem?.openFoodFactsId && (
                  <p className={styles.productOFF}>
                    <a
                      href={`https://openfoodfacts.org/product/${effectiveItem.openFoodFactsId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.offLink}
                    >
                      Voir sur OpenFoodFacts
                    </a>
                  </p>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Message de statut */}
      <div className={styles.statusMessage}>
        {alreadyExists ? (
          <>
            <span className={styles.statusIcon}>📦</span>
            <span>Cet objet existe déjà dans votre installation (quantité actuelle: {currentQuantity})</span>
          </>
        ) : (
          <>
            <span className={styles.statusIcon}>✨</span>
            <span>Nouvel objet à ajouter</span>
          </>
        )}
        <span className={styles.barcodeInfo}>Code: <code>{barcode}</code></span>
      </div>

      {/* Message d'édition */}
      {!effectiveItem?.isReadOnly && (
        <div className={styles.editMessage}>
          ✏️ Personnalisez le nom, la marque et la catégorie ci-dessus
        </div>
      )}

      {/* Round 3 du 4:2 (11/10) : produit inconnu → lier le code-barres
          à une fiche existante de l'annuaire (« c'est ce produit-là »). */}
      {!effectiveItem && (
        <div className={styles.linkSection}>
          <p className={styles.linkTitle}>Ce produit existe déjà dans votre annuaire ?</p>
          <p className={styles.linkHint}>
            Liez ce code-barres à une fiche existante au lieu d'en créer une nouvelle.
          </p>
          <form onSubmit={handleLinkSearch} className={styles.linkSearchForm}>
            <input
              type="search"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              className={styles.linkInput}
              placeholder="Rechercher par nom…"
              aria-label="Rechercher une fiche existante"
            />
            <button
              type="submit"
              className={styles.linkSearchButton}
              disabled={isLinkSearching || !linkSearch.trim()}
            >
              <Search size={16} />
              {isLinkSearching ? "Recherche…" : "Rechercher"}
            </button>
          </form>
          {linkResults.length > 0 && (
            <ul className={styles.linkResults}>
              {linkResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => handleLinkSelect(r)}
                    className={styles.linkResultItem}
                    disabled={linkingId !== null}
                  >
                    <span className={styles.linkResultName}>{r.name}</span>
                    {(r.brand || r.description) && (
                      <span className={styles.linkResultMeta}>
                        {[r.brand, r.description].filter(Boolean).join(" — ")}
                      </span>
                    )}
                    <span className={styles.linkResultAction}>
                      {linkingId === r.id ? "Liaison…" : "C'est ce produit"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {linkSearched && linkResults.length === 0 && !isLinkSearching && (
            <p className={styles.linkEmpty}>
              Aucune fiche locale trouvée — remplissez le formulaire ci-dessous pour en créer une nouvelle.
            </p>
          )}
          {linkError && <p className={styles.linkError}>{linkError}</p>}
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {/* R2 4:2 (Q3 Alexis 06/10) : bloc informatif de la variante identifiée
          par le code-barres — marque, Nutri-Score, image et lien fiche. */}
      {effectiveItem?.variant && (
        <div className={styles.variantInfo}>
          {effectiveItem.variant.imageUrl && (
            <img
              src={effectiveItem.variant.imageUrl}
              alt=""
              className={styles.variantImage}
              loading="lazy"
            />
          )}
          <div className={styles.variantText}>
            <span className={styles.variantLabel}>Variante identifiée par le code-barres</span>
            {effectiveItem.variant.brand && (
              <span className={styles.variantBrand}>{effectiveItem.variant.brand}</span>
            )}
            {effectiveItem.variant.nutriscore && (
              <NutriscoreBadge score={effectiveItem.variant.nutriscore} size="small" />
            )}
          </div>
          <Link
            href={"/stock/" + effectiveItem.id + "/variantes/" + effectiveItem.variant.id}
            className={styles.variantLink}
          >
            Voir la fiche variante
          </Link>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <fieldset className={styles.formSection}>
          <legend className={styles.formSectionTitle}>Informations principales</legend>

          <div className={styles.formGrid}>
            {/* Quantité */}
            <div className={styles.formGroup}>
              <label htmlFor="quantity" className={styles.formLabel}>
                <Package size={16} />
                Quantité à ajouter
              </label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className={styles.formInput}
                required
              />
              {alreadyExists && (
                <p className={styles.formHint}>
                  Total après ajout: {currentQuantity + formData.quantity} <br />
                  Total après retrait: {currentQuantity - formData.quantity}
                </p>
              )}
            </div>

            {/* Emplacement */}
            <div className={styles.formGroup}>
              <label htmlFor="location" className={styles.formLabel}>
                <MapPin size={16} />
                Emplacement
              </label>
              <div className={styles.inputWithDatalist}>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className={styles.formInput}
                  placeholder="Ex: Frigo, Congélateur..."
                  list="commonLocations"
                />
                <datalist id="commonLocations">
                  <option value="Frigo" />
                  <option value="Congélateur" />
                  <option value="Placard cuisine" />
                  <option value="Garage" />
                  <option value="Cave" />
                  <option value="Armoire" />
                  <option value="Étagère" />
                  <option value="Comptoir" />
                </datalist>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Optimisation mobile (option A, Alexis 06/10) : la péremption
            reste visible (cœur du produit), les champs de détail sont
            repliés derrière le summary — un scan courant = quantité +
            valider, sans scroller. */}
        <fieldset className={styles.formSection}>
          <legend className={styles.formSectionTitle}>Dates</legend>

          <div className={styles.formGrid}>
            {/* Date de péremption */}
            <div className={styles.formGroup}>
              <label htmlFor="expiryDate" className={styles.formLabel}>
                <Clock size={16} />
                Date de péremption
                {daysUntilExpiry !== null && (
                  <span
                    className={`${styles.daysBadge} ${isExpiryInPast ? styles.daysExpiresSoon : ""}`}
                  >
                    {daysUntilExpiry > 0
                      ? `${daysUntilExpiry} jour${daysUntilExpiry > 1 ? "s" : ""}`
                      : "Périmé"}
                  </span>
                )}
              </label>
              <input
                type="date"
                id="expiryDate"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleDateChange}
                className={styles.formInput}
                min={formData.purchaseDate}
              />
            </div>
          </div>
        </fieldset>

        <details className={styles.optionalDetails}>
          <summary className={styles.optionalSummary}>
            Plus de détails (achat, lot, prix, notes)
          </summary>

          <fieldset className={styles.formSection}>
            <legend className={styles.formSectionTitle}>Informations supplémentaires</legend>

            <div className={styles.formGrid}>
            {/* Date d'achat */}
            <div className={styles.formGroup}>
              <label htmlFor="purchaseDate" className={styles.formLabel}>
                <Calendar size={16} />
                Date d'achat
              </label>
              <input
                type="date"
                id="purchaseDate"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleDateChange}
                className={styles.formInput}
                max={today}
              />
            </div>

            {/* Numéro de lot */}
            <div className={styles.formGroup}>
              <label htmlFor="lotNumber" className={styles.formLabel}>
                <Hash size={16} />
                Numéro de lot
              </label>
              <input
                type="text"
                id="lotNumber"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleChange}
                className={styles.formInput}
                placeholder="Ex: LOT2024001"
              />
            </div>

            {/* Prix */}
            <div className={styles.formGroup}>
              <label htmlFor="price" className={styles.formLabel}>
                <Euro size={16} />
                Prix d'achat (€)
              </label>
              <div className={styles.priceInputWrapper}>
                <input
                  type="text"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  inputMode="decimal"
                  className={styles.formInput}
                  placeholder="Ex: 2,99"
                />
                {displayPrice && (
                  <span className={styles.priceDisplay}>{displayPrice} €</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.formGroupFull}>
            <label htmlFor="notes" className={styles.formLabel}>
              <StickyNote size={16} />
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className={styles.formTextarea}
              rows={3}
              placeholder="Ex: Acheté en promo, ouvert déjà, à consommer rapidement..."
            />
          </div>
          </fieldset>
        </details>

        {/* Boutons d'action */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            <X size={16} />
            Annuler
          </button>
          {alreadyExists ? (
            <>
              {/* Bouton Retirer */}
              <button
                type="button"
                onClick={async () => {
                  setIsSubmitting(true);
                  setError(null);
                  try {
                    const result = await adjustObjectQuantity(installationId, barcode, -formData.quantity);
                    if (!result.success) {
                      setError(result.error || "Erreur lors du retrait");
                      setIsSubmitting(false);
                      return;
                    }
                    onSuccess();
                  } catch (err) {
                    setError("Une erreur inattendue est survenue. Veuillez réessayer.");
                    setIsSubmitting(false);
                  }
                }}
                className={`${styles.submitButton} ${styles.dangerButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    Retrait...
                  </>
                ) : (
                  <>
                    <Minus size={16} />
                    Retirer {formData.quantity} unité{formData.quantity > 1 ? "s" : ""}
                  </>
                )}
              </button>
              
              {/* Bouton Mettre à jour */}
              <button
                type="submit"
                className={`${styles.actionButton} ${styles.submitButton}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span>
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Ajouter {formData.quantity} unité{formData.quantity > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </>
          ) : (
            /* Bouton Ajouter */
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.spinner}></span>
                  Ajout...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Ajouter à l'installation
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
    </div >
  );
}
