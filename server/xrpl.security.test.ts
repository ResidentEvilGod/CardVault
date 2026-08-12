import { describe, expect, it } from "vitest";
import { getXrplSettings, verifyXrplPayment } from "./xrpl";

describe("XRPL payment security", () => {
  it("requires a valid configured testnet destination", () => {
    const settings = getXrplSettings();
    expect(settings.destinationAddress).toBe("rprykBSnUnzwaosyYwh5SXeHeV3Bw2bUVw");
    expect(settings.networkWs).toBe("wss://s.altnet.rippletest.net:51233");
  });

  it("rejects malformed transaction hashes before contacting the ledger", async () => {
    await expect(verifyXrplPayment("not-a-transaction-hash", {
      id: 1,
      invoiceId: "cv_test",
      userId: 1,
      packId: "pack_10",
      credits: 10,
      destinationAddress: "rprykBSnUnzwaosyYwh5SXeHeV3Bw2bUVw",
      destinationTag: 123,
      amountDrops: "1000000",
      amountXrp: "1.000000",
      status: "pending",
      transactionHash: null,
      expiresAt: new Date(Date.now() + 60_000),
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })).rejects.toThrow("Invalid XRPL transaction hash");
  });
});
