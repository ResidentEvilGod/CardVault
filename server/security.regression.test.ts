import { describe, expect, it } from "vitest";
import { isRenewalInvoice } from "./stripeWebhookHandler";
import { isSensitiveConfigKey, redactConfigRows } from "./routers/admin";

describe("security regression helpers", () => {
  it("redacts API keys and secret-like configuration values", () => {
    expect(isSensitiveConfigKey("scrydex_api_key")).toBe(true);
    expect(isSensitiveConfigKey("high_value_threshold")).toBe(false);

    const [secret, publicConfig] = redactConfigRows([
      { key: "scrydex_api_key", value: "do-not-return-this" },
      { key: "high_value_threshold", value: "100" },
    ]);

    expect(secret.value).toBe("[configured]");
    expect(secret.isSensitive).toBe(true);
    expect(publicConfig.value).toBe("100");
    expect(publicConfig.isSensitive).toBe(false);
  });

  it("only treats recurring subscription-cycle invoices as renewal grants", () => {
    expect(isRenewalInvoice("subscription_cycle")).toBe(true);
    expect(isRenewalInvoice("subscription_create")).toBe(false);
    expect(isRenewalInvoice("subscription_update")).toBe(false);
    expect(isRenewalInvoice(undefined)).toBe(false);
  });
});
