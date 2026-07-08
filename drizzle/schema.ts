import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Credits
  scanCredits: int("scanCredits").default(5).notNull(),
  totalScansUsed: int("totalScansUsed").default(0).notNull(),
  // Subscription
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["none", "active", "canceled", "past_due"]).default("none").notNull(),
  subscriptionPlan: varchar("subscriptionPlan", { length: 64 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  subscriptionEndsAt: timestamp("subscriptionEndsAt"),
  // Preferences
  notifyHighValue: boolean("notifyHighValue").default(true).notNull(),
  ebayUsername: varchar("ebayUsername", { length: 128 }),
  tcgplayerUsername: varchar("tcgplayerUsername", { length: 128 }),
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Scanned / Identified Cards ───────────────────────────────────────────────
export const cards = mysqlTable("cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // Identity
  tcg: varchar("tcg", { length: 64 }).notNull(), // "pokemon" | "mtg" | "lorcana" | etc.
  cardName: varchar("cardName", { length: 256 }).notNull(),
  setName: varchar("setName", { length: 256 }),
  setCode: varchar("setCode", { length: 32 }),
  cardNumber: varchar("cardNumber", { length: 32 }),
  rarity: varchar("rarity", { length: 64 }),
  artist: varchar("artist", { length: 128 }),
  // External IDs
  scrydexId: varchar("scrydexId", { length: 128 }),
  scryfallId: varchar("scryfallId", { length: 128 }),
  // Images
  uploadedImageKey: varchar("uploadedImageKey", { length: 512 }),
  uploadedImageUrl: varchar("uploadedImageUrl", { length: 1024 }),
  officialImageUrl: varchar("officialImageUrl", { length: 1024 }),
  // Prices (raw)
  priceNm: decimal("priceNm", { precision: 10, scale: 2 }),
  priceLp: decimal("priceLp", { precision: 10, scale: 2 }),
  priceMp: decimal("priceMp", { precision: 10, scale: 2 }),
  priceHp: decimal("priceHp", { precision: 10, scale: 2 }),
  priceDmg: decimal("priceDmg", { precision: 10, scale: 2 }),
  // Graded prices (JSON: { PSA: { "10": 500, "9": 200 }, BGS: {...}, CGC: {...} })
  gradedPrices: json("gradedPrices"),
  // AI confidence
  identificationConfidence: decimal("identificationConfidence", { precision: 5, scale: 2 }),
  // Timestamps
  pricesUpdatedAt: timestamp("pricesUpdatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Card = typeof cards.$inferSelect;
export type InsertCard = typeof cards.$inferInsert;

// ─── Binder (User's saved collection) ─────────────────────────────────────────
export const binderCards = mysqlTable("binder_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardId: int("cardId").notNull(),
  // User-specific metadata
  condition: mysqlEnum("condition", ["NM", "LP", "MP", "HP", "DMG"]).default("NM").notNull(),
  isGraded: boolean("isGraded").default(false).notNull(),
  gradingCompany: varchar("gradingCompany", { length: 32 }), // PSA, BGS, CGC
  gradeLevel: varchar("gradeLevel", { length: 16 }), // "10", "9.5", "9", etc.
  certNumber: varchar("certNumber", { length: 64 }),
  quantity: int("quantity").default(1).notNull(),
  notes: text("notes"),
  purchasePrice: decimal("purchasePrice", { precision: 10, scale: 2 }),
  // Cached current value (refreshed nightly)
  currentValue: decimal("currentValue", { precision: 10, scale: 2 }),
  valueUpdatedAt: timestamp("valueUpdatedAt"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BinderCard = typeof binderCards.$inferSelect;
export type InsertBinderCard = typeof binderCards.$inferInsert;

// ─── Credit Transactions ───────────────────────────────────────────────────────
export const creditTransactions = mysqlTable("creditTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["purchase", "subscription_grant", "scan_debit", "refund", "admin_grant", "free_tier"]).notNull(),
  amount: int("amount").notNull(), // positive = credit, negative = debit
  description: varchar("description", { length: 256 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  stripeSessionId: varchar("stripeSessionId", { length: 128 }),
  packId: varchar("packId", { length: 64 }), // which credit pack was purchased
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditTransaction = typeof creditTransactions.$inferSelect;

// ─── Sale Items ────────────────────────────────────────────────────────────────
export const saleItems = mysqlTable("saleItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  binderCardId: int("binderCardId").notNull(),
  cardId: int("cardId").notNull(),
  // Generated listing
  listingTitle: varchar("listingTitle", { length: 512 }),
  listingDescription: text("listingDescription"),
  askingPrice: decimal("askingPrice", { precision: 10, scale: 2 }),
  platform: varchar("platform", { length: 64 }).default("ebay"),
  ebaySearchUrl: varchar("ebaySearchUrl", { length: 1024 }),
  status: mysqlEnum("status", ["draft", "listed", "sold", "archived"]).default("draft").notNull(),
  soldPrice: decimal("soldPrice", { precision: 10, scale: 2 }),
  soldAt: timestamp("soldAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SaleItem = typeof saleItems.$inferSelect;

// ─── Listing Templates ─────────────────────────────────────────────────────────
export const listingTemplates = mysqlTable("listingTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  shippingDetails: text("shippingDetails"),
  descriptionSnippet: text("descriptionSnippet"),
  returnPolicy: text("returnPolicy"),
  paymentDetails: text("paymentDetails"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ListingTemplate = typeof listingTemplates.$inferSelect;

// ─── App Config (admin-configurable) ──────────────────────────────────────────
export const appConfig = mysqlTable("appConfig", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 128 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppConfig = typeof appConfig.$inferSelect;

// ─── Scan Sessions (audit log) ─────────────────────────────────────────────────
export const scanSessions = mysqlTable("scanSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardId: int("cardId"),
  imageKey: varchar("imageKey", { length: 512 }),
  status: mysqlEnum("status", ["success", "failed", "low_confidence"]).notNull(),
  creditsUsed: int("creditsUsed").default(1).notNull(),
  estimatedValue: decimal("estimatedValue", { precision: 10, scale: 2 }),
  isHighValue: boolean("isHighValue").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScanSession = typeof scanSessions.$inferSelect;

// ─── Nightly Price Update Job Config ──────────────────────────────────────────
export const priceUpdateJobs = mysqlTable("priceUpdateJobs", {
  id: int("id").autoincrement().primaryKey(),
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
  lastRunAt: timestamp("lastRunAt"),
  lastRunStatus: varchar("lastRunStatus", { length: 64 }),
  cardsUpdated: int("cardsUpdated").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PriceUpdateJob = typeof priceUpdateJobs.$inferSelect;
