# CardVault Security Audit Report

**Date:** July 2026  
**Scope:** Full-stack trading card valuation app with Stripe payment processing  
**Sensitive Data Handled:** User emails, Stripe payment information, credit card data (via Stripe), user binder data

---

## Executive Summary

CardVault has a **solid security foundation** with several best practices already implemented. However, there are **critical security gaps** that must be addressed before handling customer payment data and personal information in production.

**Risk Level:** 🟡 **MEDIUM** (with recommended fixes, can be reduced to LOW)

---

## ✅ What's Already Secure

### 1. **Password Management**
- ✅ **No passwords stored locally** — Authentication delegated entirely to Manus OAuth
- ✅ **No password fields in database** — Users authenticate via OAuth, not username/password
- ✅ **Benefit:** Eliminates password breach risk, phishing attacks, and password reset complexity

### 2. **Credit Card Data**
- ✅ **No credit card storage** — All payment processing delegated to Stripe
- ✅ **PCI-DSS Compliant by design** — Stripe handles PCI compliance, not your app
- ✅ **Stripe webhook validation** — Webhook signature verification implemented
- ✅ **Test event handling** — Proper test event detection to prevent accidental processing

### 3. **Session Management**
- ✅ **HttpOnly cookies** — Session cookies cannot be accessed via JavaScript (prevents XSS theft)
- ✅ **SameSite=None with Secure flag** — CSRF protection enabled
- ✅ **HTTPS detection** — Secure flag only set on HTTPS connections
- ✅ **X-Forwarded-Proto support** — Correctly detects HTTPS behind reverse proxies

### 4. **Authentication & Authorization**
- ✅ **Protected procedures** — tRPC routes require authentication where needed
- ✅ **Role-based access control** — Admin procedures check `ctx.user.role`
- ✅ **User context injection** — All requests have user context available

### 5. **API Security**
- ✅ **tRPC type safety** — End-to-end type checking prevents injection attacks
- ✅ **Zod input validation** — All user inputs validated with schema
- ✅ **Error handling** — Generic error messages (no sensitive data leakage)

---

## 🔴 Critical Security Issues

### 1. **Missing Security Headers**
**Severity:** 🔴 CRITICAL  
**Issue:** No security headers configured (CSP, HSTS, X-Frame-Options, etc.)

**Current State:**
```typescript
// server/_core/index.ts - NO security headers middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

**Risk:**
- Clickjacking attacks (X-Frame-Options missing)
- MIME-type sniffing (X-Content-Type-Options missing)
- XSS attacks not mitigated (Content-Security-Policy missing)
- Man-in-the-middle attacks (HSTS missing)

**Fix:** Add helmet.js middleware for security headers

---

### 2. **No Rate Limiting**
**Severity:** 🔴 CRITICAL  
**Issue:** No rate limiting on payment endpoints or API routes

**Current State:**
```typescript
// No rate limiting on stripe checkout or any endpoints
app.post("/api/stripe/webhook", stripeWebhookHandler);
app.use("/api/trpc", createExpressMiddleware({...}));
```

**Risk:**
- Brute force attacks on admin endpoints
- Denial of service (DoS) attacks
- Spam credit pack purchases
- Webhook replay attacks

**Fix:** Implement rate limiting middleware

---

### 3. **Insufficient Input Validation**
**Severity:** 🟡 HIGH  
**Issue:** Some endpoints accept large file uploads without proper validation

**Current State:**
```typescript
// server/_core/index.ts
app.use(express.json({ limit: "50mb" }));  // ⚠️ 50MB limit is too high
app.use(express.urlencoded({ limit: "50mb", extended: true }));
```

**Risk:**
- Large file upload DoS attacks
- Memory exhaustion
- Slow-loris attacks

**Fix:** Reduce upload limits and add file type validation

---

### 4. **No CORS Configuration**
**Severity:** 🟡 HIGH  
**Issue:** CORS not explicitly configured; defaults to allow all origins

**Current State:**
```typescript
// No CORS middleware configured
// Express defaults to allowing all origins for non-preflight requests
```

**Risk:**
- Cross-site request forgery (CSRF) from malicious sites
- Unauthorized API access from third-party domains
- Sensitive data leakage to unintended origins

**Fix:** Add explicit CORS configuration

---

### 5. **Insufficient Logging & Monitoring**
**Severity:** 🟡 HIGH  
**Issue:** No structured logging for security events

**Current State:**
```typescript
// Minimal logging
console.error("[Stripe Webhook] Error:", err);
console.log('[Webhook] Test event detected');
```

**Risk:**
- Cannot detect security breaches
- No audit trail for compliance
- Cannot investigate payment fraud
- No alerting on suspicious activity

**Fix:** Implement structured logging and monitoring

---

### 6. **No HTTPS Enforcement**
**Severity:** 🟡 HIGH  
**Issue:** App doesn't enforce HTTPS in production

**Current State:**
```typescript
// Detects HTTPS but doesn't enforce it
function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  // Allows HTTP connections
}
```

**Risk:**
- Man-in-the-middle attacks on HTTP connections
- Session cookie interception
- Payment data exposure
- OAuth token theft

**Fix:** Enforce HTTPS with HSTS header

---

### 7. **No SQL Injection Protection Verification**
**Severity:** 🟡 MEDIUM  
**Issue:** While Drizzle ORM provides protection, no additional validation layer

**Current State:**
```typescript
// Relies entirely on Drizzle ORM parameterization
const userResult = await db.select().from(users).where(eq(users.id, userId));
```

**Risk:**
- If ORM is misconfigured, SQL injection possible
- No defense-in-depth

**Fix:** Add input validation layer + ORM parameterization

---

### 8. **Sensitive Data in Error Messages**
**Severity:** 🟡 MEDIUM  
**Issue:** Error messages might leak sensitive information

**Current State:**
```typescript
// Generic errors are good, but some endpoints might leak data
catch (err) {
  console.error("[Stripe Webhook] Processing error:", err);  // Logs full error
  return res.status(500).json({ error: "Processing error" });
}
```

**Risk:**
- Stack traces might contain API keys or user data
- Database errors might reveal schema

**Fix:** Implement error sanitization

---

### 9. **No API Key Rotation**
**Severity:** 🟡 MEDIUM  
**Issue:** Stripe and Scrydex API keys not rotated regularly

**Current State:**
```typescript
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;  // Static key
const scrydexKey = process.env.SCRYDEX_API_KEY;  // Static key
```

**Risk:**
- Compromised keys can't be quickly invalidated
- No audit trail of key usage
- Long-lived credentials increase breach impact

**Fix:** Implement key rotation policy

---

### 10. **No Two-Factor Authentication (2FA)**
**Severity:** 🟡 MEDIUM  
**Issue:** No 2FA for admin accounts

**Current State:**
```typescript
// Only OAuth authentication, no 2FA
const user = await sdk.authenticateRequest(opts.req);
```

**Risk:**
- Admin account compromise leads to full system access
- No protection against credential theft
- High-value target for attackers

**Fix:** Add 2FA for admin accounts

---

## 🟡 Medium-Priority Issues

### 11. **No Encryption at Rest**
**Severity:** 🟡 MEDIUM  
**Issue:** Sensitive user data not encrypted in database

**Current State:**
```typescript
// Database stores plaintext data
email: varchar("email", { length: 320 }),
ebayUsername: varchar("ebayUsername", { length: 128 }),
```

**Risk:**
- Database breach exposes all user data
- No protection for PII
- Regulatory compliance issues (GDPR, CCPA)

**Fix:** Encrypt sensitive fields at rest

---

### 12. **No Data Retention Policy**
**Severity:** 🟡 MEDIUM  
**Issue:** No automatic deletion of old data

**Current State:**
```typescript
// Data stored indefinitely
createdAt: timestamp("createdAt").defaultNow().notNull(),
// No TTL or deletion policy
```

**Risk:**
- Regulatory violations (GDPR right to be forgotten)
- Increased breach surface area
- Compliance audit failures

**Fix:** Implement data retention and deletion policies

---

### 13. **No Webhook Replay Protection**
**Severity:** 🟡 MEDIUM  
**Issue:** Stripe webhooks processed without idempotency checks

**Current State:**
```typescript
// Processes every webhook event
case "checkout.session.completed": {
  await addCredits(userId, pack.credits, ...);  // No idempotency
}
```

**Risk:**
- Duplicate webhook processing credits user twice
- Financial inconsistencies
- Abuse potential

**Fix:** Add idempotency keys to webhook processing

---

### 14. **No Content Security Policy (CSP)**
**Severity:** 🟡 MEDIUM  
**Issue:** No CSP header to prevent inline script execution

**Risk:**
- XSS attacks can execute arbitrary JavaScript
- Third-party script injection
- Data exfiltration

**Fix:** Implement strict CSP header

---

### 15. **Insufficient Admin Audit Logging**
**Severity:** 🟡 MEDIUM  
**Issue:** Admin actions not logged for audit purposes

**Current State:**
```typescript
// Admin grant credits with no audit trail
adminGrant: protectedProcedure.mutation(async ({ ctx, input }) => {
  if (ctx.user.role !== "admin") throw new Error("Forbidden");
  await addCredits(input.userId, input.amount, ...);
  // No log of who granted credits and when
})
```

**Risk:**
- Cannot detect unauthorized admin actions
- No compliance audit trail
- Fraud detection impossible

**Fix:** Log all admin actions with timestamp and actor

---

## 🟢 Low-Priority Issues

### 16. **No Security.txt File**
**Severity:** 🟢 LOW  
**Issue:** No security vulnerability disclosure policy

**Fix:** Add `.well-known/security.txt` file

---

### 17. **No Dependency Vulnerability Scanning**
**Severity:** 🟢 LOW  
**Issue:** No automated scanning for vulnerable dependencies

**Fix:** Add GitHub Dependabot or npm audit CI/CD checks

---

### 18. **No Subresource Integrity (SRI)**
**Severity:** 🟢 LOW  
**Issue:** No SRI hashes for external scripts

**Fix:** Add SRI hashes to CDN-loaded resources

---

---

## 📋 Recommended Fixes (Priority Order)

### **Phase 1: Critical (Must do before production)**

#### Fix 1: Add Security Headers Middleware
```typescript
// server/_core/index.ts
import helmet from "helmet";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Tighten for production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://api.scrydex.com"],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
```

**Installation:**
```bash
pnpm add helmet
```

---

#### Fix 2: Add Rate Limiting
```typescript
// server/_core/index.ts
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

const stripeWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 50,  // 50 webhook events per minute
  skip: (req) => req.path === "/api/stripe/webhook",  // Custom for webhooks
});

app.use(limiter);
app.post("/api/stripe/webhook", stripeWebhookLimiter, stripeWebhookHandler);
```

**Installation:**
```bash
pnpm add express-rate-limit
```

---

#### Fix 3: Reduce File Upload Limits
```typescript
// server/_core/index.ts
app.use(express.json({ limit: "10mb" }));  // Reduced from 50mb
app.use(express.urlencoded({ limit: "10mb", extended: true }));
```

---

#### Fix 4: Add CORS Configuration
```typescript
// server/_core/index.ts
import cors from "cors";

const allowedOrigins = [
  "https://cardvault.manus.space",
  "https://cardvaulttcg-3jzqkoyh.manus.space",
  process.env.VITE_APP_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

**Installation:**
```bash
pnpm add cors
```

---

#### Fix 5: Enforce HTTPS
```typescript
// server/_core/index.ts
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.protocol !== "https") {
    return res.redirect(301, `https://${req.get("host")}${req.originalUrl}`);
  }
  next();
});
```

---

#### Fix 6: Add Webhook Idempotency
```typescript
// server/stripeWebhookHandler.ts
import { getDb } from "./db";
import { creditTransactions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export async function stripeWebhookHandler(req: Request, res: Response) {
  // ... existing code ...

  const db = await getDb();
  if (!db) return res.status(500).json({ error: "DB not available" });

  // Check for duplicate webhook processing
  const existingTransaction = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.stripeSessionId, session.id))
    .limit(1);

  if (existingTransaction.length > 0) {
    console.log("[Webhook] Duplicate event, skipping");
    return res.json({ received: true });  // Idempotent response
  }

  // ... rest of webhook processing ...
}
```

---

### **Phase 2: High Priority (Before first customers)**

#### Fix 7: Implement Structured Logging
```typescript
// server/_core/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message,
      data,
    }));
  },
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "ERROR",
      message,
      error: error?.message || String(error),
      stack: error?.stack,
    }));
  },
  warn: (message: string, data?: any) => {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "WARN",
      message,
      data,
    }));
  },
  audit: (action: string, userId: number, details?: any) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "AUDIT",
      action,
      userId,
      details,
    }));
  },
};
```

---

#### Fix 8: Add Admin Audit Logging
```typescript
// server/routers/credits.ts
import { logger } from "../_core/logger";

adminGrant: protectedProcedure
  .input(z.object({
    userId: z.number(),
    amount: z.number().min(1),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new Error("Forbidden");
    
    await addCredits(input.userId, input.amount, "admin_grant", input.description ?? "Admin credit grant");
    
    // Log admin action
    logger.audit("ADMIN_GRANT_CREDITS", ctx.user.id, {
      targetUserId: input.userId,
      amount: input.amount,
      description: input.description,
    });
    
    return { success: true };
  }),
```

---

#### Fix 9: Encrypt Sensitive Fields
```typescript
// server/_core/encryption.ts
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

export function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decryptField(encrypted: string): string {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

---

#### Fix 10: Add Data Retention Policy
```typescript
// server/routers/admin.ts
export const adminRouter = router({
  // ... existing routes ...

  // Delete old scan sessions (older than 90 days)
  deleteOldScans: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const deleted = await db
      .delete(scanSessions)
      .where(sql`${scanSessions.createdAt} < ${ninetyDaysAgo}`);

    logger.audit("DELETE_OLD_SCANS", ctx.user.id, { deletedCount: deleted });
    return { success: true, deletedCount: deleted };
  }),
});
```

---

### **Phase 3: Medium Priority (Before scaling)**

#### Fix 11: Add 2FA for Admin
```typescript
// server/routers/admin.ts
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export const adminRouter = router({
  // Generate 2FA secret
  generate2FASecret: adminProcedure.mutation(async ({ ctx }) => {
    const secret = speakeasy.generateSecret({
      name: `CardVault (${ctx.user.email})`,
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      qrCode,
    };
  }),

  // Verify and enable 2FA
  enable2FA: adminProcedure
    .input(z.object({ secret: z.string(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const verified = speakeasy.totp.verify({
        secret: input.secret,
        encoding: "base32",
        token: input.token,
      });

      if (!verified) throw new Error("Invalid 2FA token");

      // Store secret in database
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      await db.update(users).set({
        twoFactorSecret: input.secret,
      }).where(eq(users.id, ctx.user.id));

      logger.audit("ENABLE_2FA", ctx.user.id);
      return { success: true };
    }),
});
```

---

#### Fix 12: Add Key Rotation Policy
```typescript
// Create a scheduled job for key rotation
// server/keyRotationHandler.ts

export async function keyRotationHandler() {
  const lastRotation = await getAppConfig("last_key_rotation");
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  if (!lastRotation || new Date(lastRotation).getTime() < thirtyDaysAgo) {
    logger.warn("API keys should be rotated", {
      lastRotation,
      daysOld: Math.floor((Date.now() - new Date(lastRotation).getTime()) / (24 * 60 * 60 * 1000)),
    });

    // Send alert to admin
    await sendNotification({
      to: process.env.ADMIN_EMAIL,
      subject: "CardVault: API Key Rotation Due",
      message: "Please rotate your Stripe and Scrydex API keys",
    });
  }
}
```

---

## 🔐 Compliance Checklist

- [ ] **GDPR** — Data retention policy, right to be forgotten, encryption
- [ ] **CCPA** — User data access, deletion, opt-out mechanisms
- [ ] **PCI-DSS** — No credit card storage (delegated to Stripe), HTTPS, logging
- [ ] **SOC 2** — Access controls, audit logging, incident response
- [ ] **OWASP Top 10** — All major vulnerabilities addressed

---

## 📊 Security Maturity Timeline

| Phase | Timeline | Focus |
|-------|----------|-------|
| **Phase 1** | Before MVP | Security headers, rate limiting, HTTPS enforcement |
| **Phase 2** | Before launch | Logging, audit trails, encryption, webhooks |
| **Phase 3** | First 3 months | 2FA, key rotation, compliance certifications |
| **Phase 4** | 6+ months | Penetration testing, security audit, bug bounty |

---

## 🚨 Immediate Action Items

**Before accepting any customer payments:**

1. ✅ Add helmet.js security headers
2. ✅ Implement rate limiting
3. ✅ Reduce upload limits
4. ✅ Add CORS configuration
5. ✅ Enforce HTTPS in production
6. ✅ Add webhook idempotency
7. ✅ Implement structured logging
8. ✅ Add admin audit logging

**Estimated effort:** 8-12 hours of development

---

## 📞 Questions?

If you need clarification on any recommendations or want to discuss implementation details, please reach out. Security is a continuous process, not a one-time fix.

**Key Takeaway:** Your app has a good foundation. With these fixes, you'll be production-ready and compliant with industry standards.
