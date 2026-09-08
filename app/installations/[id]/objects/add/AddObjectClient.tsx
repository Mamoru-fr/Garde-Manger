"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ChevronLeft, Barcode } from "lucide-react";
import styles from "./AddObject.module.css";

// Types
interface Category {
  id: string;
  name: string;
}

interface Shop {
  id: string;
  name: string;
}

interface AddObjectClientProps {
  installationId: string;
  installationName: string;
  categories: Category[];
  shops: Shop[];
}

// Donn\u001ees du formulaire
interface FormData {
  barcode: string;
  name: string;
  quantity: number;
  category_id?: string;
  brand?: string;
  expiry_date?: string;
  purchase_date: string;
  location?: string;
  lot_number?: string;
  price?: string;
  shop_id?: string;
  note?: string;
}

export default function AddObjectClient({
  installationId,
  installationName,
  categories,
  shops,
}: AddObjectClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    barcode: "",
    name: "",
    quantity: 1,
    category_id: undefined,
    brand: undefined,
    expiry_date: undefined,
    purchase_date: new Date().toISOString().split("T")[0],
    location: undefined,
    lot_number: undefined,
    price: undefined,
    shop_id: undefined,
    note: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Rechercher un produit par code-barres
  const searchByBarcode = useCallback(
    async (barcode: string) => {
      if (!barcode || barcode.length < 3) return;

      setIsSearching(true);
      try {
        const response = await fetch(`/api/directory/search?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) {
          console.error("Erreur lors de la recherche");
          return;
        }
        const data = await response.json();
        if (data.success && data.item) {
          setFormData((prev) => ({
            ...prev,
            name: data.item.name || prev.name,
            brand: data.item.brand || prev.brand,
            category_id: data.item.category_id || prev.category_id,
          }));
        }
      } catch (err) {
        console.error("Erreur lors de la recherche du code-barres:", err);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // G\u001er les changements des inputs
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? parseInt(value) || 0 : value,
      }));

      // Si le champ modifi\u001e est le code-barres, lancer une recherche
      if (name === "barcode" && value.length >= 3) {
        searchByBarcode(value);
      }
    },
    [searchByBarcode]
  );

  // Soumettre le formulaire
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!formData.name.trim()) {
        setError("Le nom de l'objet est obligatoire.");
        setIsSubmitting(false);
        return;
      }

      if (formData.quantity <= 0) {
        setError("La quantit\u0000e doit \u001atre sup\u001erieure \u0000 0.");
        setIsSubmitting(false);
        return;
      }

      try {
        const response = await fetch("/api/objects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installationId,
            ...formData,
            price: formData.price ? parseFloat(formData.price.replace(",", ".")) : undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Erreur lors de l'ajout de l'objet");
        }

        setSuccess("Objet ajout\u001e avec succ\u0000s !");
        setTimeout(() => {
          router.push(`/installations/${installationId}?add=success`);
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, installationId, router]
  );

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <ChevronLeft size={24} />
          Ajouter un objet \u0000 {installationName}
        </h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        {/* Code-barres */}
        <div className={styles.formGroup}>
          <label htmlFor="barcode" className={styles.label}>
            <Barcode size={16} />
            Code-barres
          </label>
          <input
            type="text"
            id="barcode"
            name="barcode"
            value={formData.barcode}
            onChange={handleChange}
            placeholder="Scannez ou entrez un code-barres"
            className={styles.input}
            disabled={isSearching}
            autoFocus
          />
          {isSearching && <p className={styles.hint}>Recherche en cours...</p>}
        </div>

        {/* Nom */}
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Nom *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nom de l'objet"
            className={styles.input}
            required
          />
        </div>

        {/* Quantit\u001e et Cat\u001egorie */}
        <div className={styles.formRow}>
          <div className={styles.formGroupHalf}>
            <label htmlFor="quantity" className={styles.label}>
              Quantit\u001e *
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min={1}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroupHalf}>
            <label htmlFor="category_id" className={styles.label}>
              Cat\u001egorie
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id || ""}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">-- Aucune cat\u001egorie --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Marque et Date de p\u001eremption */}
        <div className={styles.formRow}>
          <div className={styles.formGroupHalf}>
            <label htmlFor="brand" className={styles.label}>
              Marque
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand || ""}
              onChange={handleChange}
              placeholder="Marque de l'objet"
              className={styles.input}
            />
          </div>
          <div className={styles.formGroupHalf}>
            <label htmlFor="expiry_date" className={styles.label}>
              Date de p\u001eremption
            </label>
            <input
              type="date"
              id="expiry_date"
              name="expiry_date"
              value={formData.expiry_date || ""}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
        </div>

        {/* Date d'achat et Prix */}
        <div className={styles.formRow}>
          <div className={styles.formGroupHalf}>
            <label htmlFor="purchase_date" className={styles.label}>
              Date d'achat
            </label>
            <input
              type="date"
              id="purchase_date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleChange}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroupHalf}>
            <label htmlFor="price" className={styles.label}>
              Prix (\u20ac)
            </label>
            <input
              type="text"
              id="price"
              name="price"
              value={formData.price || ""}
              onChange={handleChange}
              placeholder="Ex: 2.99"
              inputMode="decimal"
              className={styles.input}
            />
          </div>
        </div>

        {/* Num\u001ero de lot et Emplacement */}
        <div className={styles.formRow}>
          <div className={styles.formGroupHalf}>
            <label htmlFor="lot_number" className={styles.label}>
              Num\u001ero de lot
            </label>
            <input
              type="text"
              id="lot_number"
              name="lot_number"
              value={formData.lot_number || ""}
              onChange={handleChange}
              placeholder="Lot N\u001b..."
              className={styles.input}
            />
          </div>
          <div className={styles.formGroupHalf}>
            <label htmlFor="location" className={styles.label}>
              Emplacement
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location || ""}
              onChange={handleChange}
              placeholder="Ex: Armoire, Frigo"
              className={styles.input}
            />
          </div>
        </div>

        {/* Magasin */}
        <div className={styles.formRow}>
          <div className={styles.formGroupHalf}>
            <label htmlFor="shop_id" className={styles.label}>
              Magasin
            </label>
            <select
              id="shop_id"
              name="shop_id"
              value={formData.shop_id || ""}
              onChange={handleChange}
              className={styles.select}
            >
              <option value="">-- Aucun magasin --</option>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroupHalf} />
        </div>

        {/* Note */}
        <div className={styles.formGroup}>
          <label htmlFor="note" className={styles.label}>
            Note
          </label>
          <textarea
            id="note"
            name="note"
            value={formData.note || ""}
            onChange={handleChange}
            placeholder="Ex: Achet\u001e en promo, \u0000 consommer rapidement..."
            className={styles.textarea}
            rows={3}
          />
        </div>

        {/* Boutons */}
        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.push(`/installations/${installationId}`)}
            className={`${styles.btn} ${styles.btnSecondary}`}
            disabled={isSubmitting}
          >
            <X size={16} />
            Annuler
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className={styles.loadingSpinner} />
            ) : (
              <>
                <Check size={16} />
                Ajouter l\'objet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
