import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
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
  xrplPaymentIntents,
  xrplTransactions,
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

  return db.transaction(async (tx) => {
    // The conditional update is the security boundary: concurrent requests can
    // never both spend the same last credit.
    const updated = await tx.update(users).set({
      scanCredits: sql`scanCredits - 1`,
      totalScansUsed: sql`totalScansUsed + 1`,
    }).where(and(eq(users.id, userId), gt(users.scanCredits, 0)));
    const affectedRows = Number((updated as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) return false;

    await tx.insert(creditTransactions).values({
      userId,
      type: "scan_debit",
      amount: -1,
      description: "Card scan",
    });

    return true;
  });
}

export async function restoreScanCredit(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.transaction(async (tx) => {
    await tx.update(users).set({
      scanCredits: sql`scanCredits + 1`,
      totalScansUsed: sql`CASE WHEN totalScansUsed > 0 THEN totalScansUsed - 1 ELSE 0 END`,
    }).where(eq(users.id, userId));
    await tx.insert(creditTransactions).values({
      userId,
      type: "refund",
      amount: 1,
      description: "Scan credit restored after processing failure",
    });
  });
}

export async function addCredits(userId: number, amount: number, type: typeof creditTransactions.$inferInsert["type"], description: string, meta?: {
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  stripeInvoiceId?: string;
  xrplTransactionHash?: string;
  xrplPaymentIntentId?: string;
  packId?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.transaction(async (tx) => {
      // Insert the immutable ledger row first. Unique payment identifiers make
      // duplicate Stripe deliveries roll back before the balance changes.
      await tx.insert(creditTransactions).values({
        userId,
        type,
        amount,
        description,
        ...meta,
      });
      const updated = await tx.update(users).set({
        scanCredits: sql`scanCredits + ${amount}`,
      }).where(eq(users.id, userId));
      const affectedRows = Number((updated as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
      if (affectedRows !== 1) throw new Error("Credit recipient not found");
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate entry|er_dup_entry|unique constraint/i.test(message) && (meta?.stripePaymentIntentId || meta?.stripeSessionId || meta?.stripeInvoiceId)) {
      return false;
    }
    throw error;
  }
}

export async function getCreditTransactions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)).orderBy(desc(creditTransactions.createdAt)).limit(50);
}

// ─── XRPL Payments ─────────────────────────────────────────────────────────────

export async function createXrplPaymentIntent(data: typeof xrplPaymentIntents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(xrplPaymentIntents).values(data);
  const result = await db.select().from(xrplPaymentIntents).where(eq(xrplPaymentIntents.invoiceId, data.invoiceId)).limit(1);
  return result[0];
}

export async function getXrplPaymentIntent(invoiceId: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(xrplPaymentIntents).where(and(
    eq(xrplPaymentIntents.invoiceId, invoiceId),
    eq(xrplPaymentIntents.userId, userId),
  )).limit(1);
  return result[0];
}

export async function confirmXrplPaymentIntent(input: {
  invoiceId: string;
  transactionHash: string;
  sourceAddress: string;
  destinationAddress: string;
  destinationTag: number;
  amountDrops: string;
  ledgerIndex: number | null;
  confirmedAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db.transaction(async (tx) => {
    const result = await tx.select().from(xrplPaymentIntents).where(and(
      eq(xrplPaymentIntents.invoiceId, input.invoiceId),
      eq(xrplPaymentIntents.status, "pending"),
      isNull(xrplPaymentIntents.transactionHash),
    )).limit(1);
    const intent = result[0];
    if (!intent) return { status: "already_processed" as const };
    if (intent.expiresAt.getTime() <= Date.now()) {
      await tx.update(xrplPaymentIntents).set({ status: "expired" }).where(eq(xrplPaymentIntents.id, intent.id));
      throw new Error("Payment invoice has expired");
    }

    const updated = await tx.update(xrplPaymentIntents).set({
      status: "confirmed",
      transactionHash: input.transactionHash,
      paidAt: input.confirmedAt,
    }).where(and(
      eq(xrplPaymentIntents.id, intent.id),
      eq(xrplPaymentIntents.status, "pending"),
      isNull(xrplPaymentIntents.transactionHash),
    ));
    const affectedRows = Number((updated as unknown as [{ affectedRows?: number }])[0]?.affectedRows ?? 0);
    if (affectedRows !== 1) return { status: "already_processed" as const };

    await tx.update(users).set({
      scanCredits: sql`scanCredits + ${intent.credits}`,
    }).where(eq(users.id, intent.userId));

    await tx.insert(creditTransactions).values({
      userId: intent.userId,
      type: "purchase",
      amount: intent.credits,
      description: `Purchased ${intent.packId} via XRPL`,
      xrplTransactionHash: input.transactionHash,
      xrplPaymentIntentId: intent.invoiceId,
      packId: intent.packId,
    });

    await tx.insert(xrplTransactions).values({
      paymentIntentId: intent.id,
      userId: intent.userId,
      transactionHash: input.transactionHash,
      sourceAddress: input.sourceAddress,
      destinationAddress: input.destinationAddress,
      destinationTag: input.destinationTag,
      amountDrops: input.amountDrops,
      ledgerIndex: input.ledgerIndex,
      status: "confirmed",
      creditsGranted: intent.credits,
      confirmedAt: input.confirmedAt,
    });

    return { status: "confirmed" as const, creditsGranted: intent.credits };
  });
}

export async function getXrplPaymentHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(xrplTransactions)
    .where(eq(xrplTransactions.userId, userId))
    .orderBy(desc(xrplTransactions.createdAt))
    .limit(50);
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
