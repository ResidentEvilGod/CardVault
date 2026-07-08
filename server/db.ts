import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  type InsertUser,
  appConfig,
  binderCards,
  cards,
  creditTransactions,
  listingTemplates,
  priceUpdateJobs,
  saleItems,
  scanSessions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }

  if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUser(id: number, data: Partial<typeof users.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return result[0]?.count ?? 0;
}

// ─── Credits ──────────────────────────────────────────────────────────────────

export async function deductScanCredit(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const user = await getUserById(userId);
  if (!user || user.scanCredits <= 0) return false;

  await db.update(users).set({
    scanCredits: user.scanCredits - 1,
    totalScansUsed: user.totalScansUsed + 1,
  }).where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    type: "scan_debit",
    amount: -1,
    description: "Card scan",
  });

  return true;
}

export async function addCredits(userId: number, amount: number, type: typeof creditTransactions.$inferInsert["type"], description: string, meta?: { stripePaymentIntentId?: string; stripeSessionId?: string; packId?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    scanCredits: sql`scanCredits + ${amount}`,
  }).where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    type,
    amount,
    description,
    ...meta,
  });
}

export async function getCreditTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt)).limit(50);
}

// ─── Cards ────────────────────────────────────────────────────────────────────

export async function createCard(data: typeof cards.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(cards).values(data);
  return result[0];
}

export async function getCardById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cards).where(eq(cards.id, id)).limit(1);
  return result[0];
}

export async function updateCardPrices(id: number, prices: {
  priceNm?: string | null;
  priceLp?: string | null;
  priceMp?: string | null;
  priceHp?: string | null;
  priceDmg?: string | null;
  gradedPrices?: unknown;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(cards).set({ ...prices, pricesUpdatedAt: new Date() }).where(eq(cards.id, id));
}

export async function getRecentScans(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cards).where(eq(cards.userId, userId)).orderBy(desc(cards.createdAt)).limit(limit);
}

export async function getTotalScanCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(scanSessions);
  return result[0]?.count ?? 0;
}

// ─── Scan Sessions ─────────────────────────────────────────────────────────────

export async function createScanSession(data: typeof scanSessions.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(scanSessions).values(data);
}

export async function getRecentScanSessions(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scanSessions).orderBy(desc(scanSessions.createdAt)).limit(limit);
}

export async function getHighValueScans(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scanSessions).where(eq(scanSessions.isHighValue, true)).orderBy(desc(scanSessions.createdAt)).limit(limit);
}

// ─── Binder ───────────────────────────────────────────────────────────────────

export async function addToBinder(data: typeof binderCards.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(binderCards).values(data);
  return result[0];
}

export async function getBinderCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    binder: binderCards,
    card: cards,
  }).from(binderCards)
    .innerJoin(cards, eq(binderCards.cardId, cards.id))
    .where(eq(binderCards.userId, userId))
    .orderBy(desc(binderCards.addedAt));
}

export async function getBinderCardById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    binder: binderCards,
    card: cards,
  }).from(binderCards)
    .innerJoin(cards, eq(binderCards.cardId, cards.id))
    .where(and(eq(binderCards.id, id), eq(binderCards.userId, userId)))
    .limit(1);
  return result[0];
}

export async function updateBinderCard(id: number, userId: number, data: Partial<typeof binderCards.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(binderCards).set(data).where(and(eq(binderCards.id, id), eq(binderCards.userId, userId)));
}

export async function removeFromBinder(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(binderCards).where(and(eq(binderCards.id, id), eq(binderCards.userId, userId)));
}

export async function getAllBinderCardsForPriceUpdate() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    binder: binderCards,
    card: cards,
  }).from(binderCards)
    .innerJoin(cards, eq(binderCards.cardId, cards.id));
}

export async function updateBinderCardValue(id: number, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(binderCards).set({ currentValue: value, valueUpdatedAt: new Date() }).where(eq(binderCards.id, id));
}

// ─── Sale Items ────────────────────────────────────────────────────────────────

export async function createSaleItem(data: typeof saleItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(saleItems).values(data);
  return result[0];
}

export async function getSaleItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    sale: saleItems,
    card: cards,
  }).from(saleItems)
    .innerJoin(cards, eq(saleItems.cardId, cards.id))
    .where(eq(saleItems.userId, userId))
    .orderBy(desc(saleItems.createdAt));
}

export async function updateSaleItem(id: number, userId: number, data: Partial<typeof saleItems.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(saleItems).set(data).where(and(eq(saleItems.id, id), eq(saleItems.userId, userId)));
}

export async function deleteSaleItem(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(saleItems).where(and(eq(saleItems.id, id), eq(saleItems.userId, userId)));
}

// ─── Listing Templates ─────────────────────────────────────────────────────────

export async function getListingTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(listingTemplates).where(eq(listingTemplates.userId, userId)).orderBy(desc(listingTemplates.createdAt));
}

export async function createListingTemplate(data: typeof listingTemplates.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(listingTemplates).values(data);
  return result[0];
}

export async function updateListingTemplate(id: number, userId: number, data: Partial<typeof listingTemplates.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(listingTemplates).set(data).where(and(eq(listingTemplates.id, id), eq(listingTemplates.userId, userId)));
}

export async function deleteListingTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(listingTemplates).where(and(eq(listingTemplates.id, id), eq(listingTemplates.userId, userId)));
}

// ─── App Config ────────────────────────────────────────────────────────────────

export async function getConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(appConfig).where(eq(appConfig.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(appConfig).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

export async function getAllConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appConfig).orderBy(appConfig.key);
}

// ─── Price Update Jobs ─────────────────────────────────────────────────────────

export async function getPriceUpdateJob() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(priceUpdateJobs).limit(1);
  return result[0];
}

export async function upsertPriceUpdateJob(data: Partial<typeof priceUpdateJobs.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getPriceUpdateJob();
  if (existing) {
    await db.update(priceUpdateJobs).set(data).where(eq(priceUpdateJobs.id, existing.id));
  } else {
    await db.insert(priceUpdateJobs).values(data as typeof priceUpdateJobs.$inferInsert);
  }
}
