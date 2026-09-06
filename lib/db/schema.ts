import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  index,
  jsonb,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations, Many, One } from "drizzle-orm";

// ============================================================================
// ENUMS
// ============================================================================

// Rôles globaux (Better-Auth)
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

// Rôles dans une installation (propriétaire, éditeur, lecteur)
export const installationRoleEnum = pgEnum("installation_role", [
  "owner",
  "editor",
  "viewer",
]);

// Type de code-barres
export const barcodeTypeEnum = pgEnum("barcode_type", [
  "EAN13",
  "EAN8",
  "UPC",
  "QR_CODE",
  "CODE128",
  "CODE39",
  "OTHER",
]);

// Catégories d'objets
export const categoryEnum = pgEnum("category", [
  "boisson",
  "epicerie",
  "surgelé",
  "frais",
  "conserve",
  "ménage",
  "hygiène",
  "autre",
]);

// Unités de mesure
export const unitEnum = pgEnum("unit", [
  "litre",
  "millilitre",
  "kilogramme",
  "gramme",
  "unité",
  "boîte",
  "sachet",
  "bouteille",
  "autre",
]);

// ============================================================================
// TABLES BETTER-AUTH (avec index intégrés)
// ============================================================================

// Table des utilisateurs (Better-Auth)
// Note: Better-Auth s'attend à ce que la table s'appelle "user" (singulier)
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name").notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => {
  // Index sur l'email pour les recherches rapides
  return [index("user_email_idx").on(table.email)];
});

// Alias pour la rétrocompatibilité avec le reste du code
// @deprecated Utiliser `user` à la place
export const users = user;

// Table des sessions (Better-Auth)
export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

// Alias pour la rétrocompatibilité
// @deprecated Utiliser `session` à la place
export const sessions = session;

// Table des accounts (Better-Auth - pour les connexions sociales)
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

// Alias pour la rétrocompatibilité
// @deprecated Utiliser `account` à la place
export const accounts = account;

// Table des tokens de vérification (Better-Auth)
export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Alias pour la rétrocompatibilité
// @deprecated Utiliser `verification` à la place
export const verifications = verification;

// ============================================================================
// TABLES MÉTIERS (avec index intégrés)
// ============================================================================

// Installations (garde-mangers, frigos, placards)
export const installations = pgTable("installations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  // Index sur ownerId pour les recherches par propriétaire
  return [index("installations_owner_idx").on(table.ownerId)];
});

// Lien entre utilisateurs et installations
export const userInstallations = pgTable(
  "user_installations",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    installationId: text("installation_id")
      .notNull()
      .references(() => installations.id, { onDelete: "cascade" }),
    role: installationRoleEnum("role").default("viewer"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.installationId] })]
);

// Catégories d'objets
export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  type: categoryEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Unités de mesure
export const units = pgTable("units", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  symbol: text("symbol").notNull(),
  type: unitEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================================
// NOUVEAUX TYPES POUR LA HIÉRARCHIE DES OBJETS
// ============================================================================

// Types d'objets (Fruit, Légume, Viande, etc.)
export const objectTypes = pgTable("object_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),  // Ex: "Fruit", "Légume", "Viande"
  description: text("description"),
  icon: text("icon"),  // Emoji ou nom d'icône pour l'UI (ex: "🍎", "apple")
  parentTypeId: text("parent_type_id"), // Pour hiérarchie (ex: "Fruit" → "Fruit à noyau")
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return [
    index("object_types_name_idx").on(table.name),
    index("object_types_parent_idx").on(table.parentTypeId),
  ];
});

// Magasins (Carrefour, Lidl, etc.)
export const shops = pgTable("shops", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),  // Ex: "Carrefour", "Lidl", "Marché local"
  address: text("address"),  // Adresse optionnelle
  city: text("city"),  // Ville optionnelle
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return [
    index("shops_name_idx").on(table.name),
  ];
});

// Annuaire des objets (centralisé pour toutes les installations)
export const objectDirectory = pgTable("object_directory", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  unitId: text("unit_id").references(() => units.id, {
    onDelete: "set null",
  }),
  // Nouveau: Lien vers le type d'objet (Fruit, Légume, etc.)
  objectTypeId: text("object_type_id").references(() => objectTypes.id, {
    onDelete: "set null",
  }),
  // Nouveau: Métadonnées globales (partagées entre toutes les instances)
  nutriscore: text("nutriscore"),  // Ex: "A", "B", "C", "D", "E"
  brand: text("brand"),  // Marque (ex: "Chiquita", "Carrefour")
  openFoodFactsId: text("open_food_facts_id"),  // ID pour l'API OpenFoodFacts
  defaultQuantity: integer("default_quantity").default(1),
  isReadOnly: boolean("is_read_only").default(false),  // ✅ Verrouillage pour les objets OpenFoodFacts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  // Index sur name pour les recherches
  return [
    index("object_directory_name_idx").on(table.name),
    index("object_directory_category_idx").on(table.categoryId),
    index("object_directory_type_idx").on(table.objectTypeId),
    index("object_directory_open_food_facts_idx").on(table.openFoodFactsId),
  ];
});

// Annuaire des codes-barres (lien avec l'annuaire des objets)
export const barcodeDirectory = pgTable("barcode_directory", {
  id: text("id").primaryKey(),
  objectDirectoryId: text("object_directory_id")
    .notNull()
    .references(() => objectDirectory.id, { onDelete: "cascade" }),
  barcode: text("barcode").notNull().unique(),
  barcodeType: barcodeTypeEnum("barcode_type").default("EAN13"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  // Index sur barcode pour les recherches rapides
  return [index("barcode_directory_barcode_idx").on(table.barcode)];
});

// Objets dans une installation (quantité, emplacement, etc.)
export const objectInstallation = pgTable("object_installation", {
  id: text("id").primaryKey(),
  installationId: text("installation_id")
    .notNull()
    .references(() => installations.id, { onDelete: "cascade" }),
  objectDirectoryId: text("object_directory_id")
    .notNull()
    .references(() => objectDirectory.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  location: text("location"),  // Ex: "Étagère 1", "Porte du frigo"
  // Nouveau: Champs pour le suivi détaillé de chaque achat
  purchaseDate: timestamp("purchase_date"),  // Date d'achat
  expiryDate: timestamp("expiry_date"),  // Date de péremption
  shopId: text("shop_id").references(() => shops.id, { onDelete: "set null" }),  // Magasin (ex: Carrefour, Lidl)
  lotNumber: text("lot_number"),  // Numéro de lot (optionnel)
  price: integer("price"),  // Prix payé en centimes (ex: 150 pour 1,50 €)
  note: text("note"),  // Notes personnelles (ex: "À consommer rapidement")
  addedDate: timestamp("added_date").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
}, (table) => {
  // Index pour les recherches fréquentes
  return [
    index("object_installation_installation_idx").on(table.installationId),
    index("object_installation_object_idx").on(table.objectDirectoryId),
    index("object_installation_expiry_idx").on(table.expiryDate),
    index("object_installation_purchase_idx").on(table.purchaseDate),
    index("object_installation_shop_idx").on(table.shopId),
  ];
});

// Historique des modifications des objets
export const objectHistory = pgTable("object_history", {
  id: text("id").primaryKey(),
  objectInstallationId: text("object_installation_id")
    .notNull()
    .references(() => objectInstallation.id, { onDelete: "cascade" }),
  oldQuantity: integer("old_quantity"),
  newQuantity: integer("new_quantity"),
  action: text("action").notNull(),
  userId: text("user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ============================================================================
// RELATIONS (pour Drizzle)
// ============================================================================

// Utilisateurs (avec alias pour rétrocompatibilité)
export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  installations: many(installations),
  userInstallations: many(userInstallations),
  objectInstallations: many(objectInstallation),
  objectHistory: many(objectHistory),
}));

// Alias pour rétrocompatibilité
export const usersRelations = userRelations;

// Sessions
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// Alias pour rétrocompatibilité
export const sessionsRelations = sessionRelations;

// Accounts
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Alias pour rétrocompatibilité
export const accountsRelations = accountRelations;

// Vérifications
export const verificationRelations = relations(
  verification,
  ({ one }) => ({
    user: one(user, {
      fields: [verification.identifier],
      references: [user.email],
    }),
  })
);

// Alias pour rétrocompatibilité
export const verificationsRelations = verificationRelations;

// Installations
export const installationsRelations = relations(
  installations,
  ({ one, many }) => ({
    owner: one(user, {
      fields: [installations.ownerId],
      references: [user.id],
    }),
    userInstallations: many(userInstallations),
    objectInstallations: many(objectInstallation),
  })
);

// UserInstallations
export const userInstallationsRelations = relations(
  userInstallations,
  ({ one }) => ({
    user: one(user, {
      fields: [userInstallations.userId],
      references: [user.id],
    }),
    installation: one(installations, {
      fields: [userInstallations.installationId],
      references: [installations.id],
    }),
  })
);

// Catégories
export const categoriesRelations = relations(
  categories,
  ({ many }) => ({
    objectDirectory: many(objectDirectory),
  })
);

// Unités
export const unitsRelations = relations(units, ({ many }) => ({
  objectDirectory: many(objectDirectory),
}));

// Types d'objets (relation auto-référentielle gérée manuellement)
export const objectTypesRelations = relations(
  objectTypes,
  ({ many }) => ({
    objectDirectory: many(objectDirectory),
  })
);

// Magasins
export const shopsRelations = relations(shops, ({ many }) => ({
  objectInstallations: many(objectInstallation),
}));

// Annuaire des objets
export const objectDirectoryRelations = relations(
  objectDirectory,
  ({ one, many }) => ({
    category: one(categories, {
      fields: [objectDirectory.categoryId],
      references: [categories.id],
    }),
    unit: one(units, {
      fields: [objectDirectory.unitId],
      references: [units.id],
    }),
    objectType: one(objectTypes, {
      fields: [objectDirectory.objectTypeId],
      references: [objectTypes.id],
    }),
    barcodeDirectory: many(barcodeDirectory),
    objectInstallations: many(objectInstallation),
  })
);

// Annuaire des codes-barres
export const barcodeDirectoryRelations = relations(
  barcodeDirectory,
  ({ one }) => ({
    objectDirectory: one(objectDirectory, {
      fields: [barcodeDirectory.objectDirectoryId],
      references: [objectDirectory.id],
    }),
  })
);

// Objets dans une installation
export const objectInstallationRelations = relations(
  objectInstallation,
  ({ one, many }) => ({
    installation: one(installations, {
      fields: [objectInstallation.installationId],
      references: [installations.id],
    }),
    objectDirectory: one(objectDirectory, {
      fields: [objectInstallation.objectDirectoryId],
      references: [objectDirectory.id],
    }),
    shop: one(shops, {
      fields: [objectInstallation.shopId],
      references: [shops.id],
    }),
    createdByUser: one(user, {
      fields: [objectInstallation.createdBy],
      references: [user.id],
    }),
    history: many(objectHistory),
  })
);

// Historique des objets
export const objectHistoryRelations = relations(
  objectHistory,
  ({ one }) => ({
    objectInstallation: one(objectInstallation, {
      fields: [objectHistory.objectInstallationId],
      references: [objectInstallation.id],
    }),
    user: one(user, {
      fields: [objectHistory.userId],
      references: [user.id],
    }),
  })
);
