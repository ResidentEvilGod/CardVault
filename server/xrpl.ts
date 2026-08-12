import { Client, dropsToXrp, isValidAddress, xrpToDrops } from "xrpl";
import type { XrplPaymentIntent } from "../drizzle/schema";

const DEFAULT_XRPL_NETWORK_WS = "wss://s.altnet.rippletest.net:51233";
const PARTIAL_PAYMENT_FLAG = 0x00020000;

export type XrplPaymentQuote = {
  invoiceId: string;
  destinationAddress: string;
  destinationTag: number;
  amountXrp: string;
  amountDrops: string;
  paymentUri: string;
  expiresAt: Date;
};

type XrplTransactionResult = {
  validated?: boolean;
  ledger_index?: number;
  Account?: string;
  Destination?: string;
  DestinationTag?: number;
  TransactionType?: string;
  Amount?: string | { currency: string; issuer: string; value: string };
  DeliverMax?: string | { currency: string; issuer: string; value: string };
  Flags?: number;
  date?: number;
  meta?: {
    TransactionResult?: string;
    delivered_amount?: string | { currency: string; issuer: string; value: string };
  } | string;
  tx_json?: Record<string, unknown>;
};

export type VerifiedXrplPayment = {
  transactionHash: string;
  sourceAddress: string;
  destinationAddress: string;
  destinationTag: number;
  amountDrops: string;
  ledgerIndex: number | null;
  confirmedAt: Date;
};

export function getXrplSettings() {
  const destinationAddress = process.env.XRPL_DESTINATION_ADDRESS;
  const networkWs = (process.env.XRPL_NETWORK_WS || DEFAULT_XRPL_NETWORK_WS).replace(/\/$/, "");

  if (!destinationAddress || !isValidAddress(destinationAddress)) {
    throw new Error("XRPL_DESTINATION_ADDRESS is missing or invalid");
  }

  if (!networkWs.startsWith("wss://")) {
    throw new Error("XRPL_NETWORK_WS must use wss://");
  }

  return { destinationAddress, networkWs };
}

async function withXrplClient<T>(work: (client: Client) => Promise<T>) {
  const { networkWs } = getXrplSettings();
  const client = new Client(networkWs);
  await client.connect();
  try {
    return await work(client);
  } finally {
    if (client.isConnected()) await client.disconnect();
  }
}

async function getUsdPerXrp() {
  const configuredRate = Number(process.env.XRPL_USD_PER_XRP);
  if (Number.isFinite(configuredRate) && configuredRate > 0) return configuredRate;

  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd", {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Unable to obtain XRP/USD quote (${response.status})`);
  const payload = await response.json() as { ripple?: { usd?: number } };
  const rate = Number(payload.ripple?.usd);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("XRP/USD quote was invalid");
  return rate;
}

export async function buildXrplQuote(input: {
  invoiceId: string;
  packPriceCents: number;
  destinationTag: number;
  expiresAt: Date;
}): Promise<XrplPaymentQuote> {
  const { destinationAddress } = getXrplSettings();
  const usdPerXrp = await getUsdPerXrp();
  const rawXrp = (input.packPriceCents / 100) / usdPerXrp;
  const amountXrp = Math.max(0.000001, Number(rawXrp.toFixed(6))).toFixed(6);
  const amountDrops = xrpToDrops(amountXrp);
  const paymentUri = `xrpl:${destinationAddress}?amount=${encodeURIComponent(amountXrp)}&dt=${input.destinationTag}`;

  return {
    invoiceId: input.invoiceId,
    destinationAddress,
    destinationTag: input.destinationTag,
    amountXrp,
    amountDrops,
    paymentUri,
    expiresAt: input.expiresAt,
  };
}

export async function verifyXrplPayment(
  transactionHash: string,
  intent: XrplPaymentIntent,
): Promise<VerifiedXrplPayment> {
  if (!/^[A-Fa-f0-9]{64}$/.test(transactionHash)) {
    throw new Error("Invalid XRPL transaction hash");
  }

  const { destinationAddress } = getXrplSettings();
  return withXrplClient(async (client) => {
    const response = await client.request({ command: "tx", transaction: transactionHash });
    const result = response.result as unknown as XrplTransactionResult;
    const tx = result.tx_json ?? result;
    const meta = typeof result.meta === "object" && result.meta !== null ? result.meta : undefined;

    if (result.validated !== true) throw new Error("Transaction is not validated yet");
    if (tx.TransactionType !== "Payment") throw new Error("XRPL transaction is not a Payment");
    if (tx.Destination !== destinationAddress) throw new Error("Payment destination does not match CardVault");
    if (tx.DestinationTag !== intent.destinationTag) throw new Error("Payment destination tag does not match this invoice");
    if ((Number(tx.Flags) & PARTIAL_PAYMENT_FLAG) !== 0) throw new Error("Partial payments are not accepted");
    if (meta?.TransactionResult !== "tesSUCCESS") throw new Error("XRPL transaction did not succeed");
    if (typeof tx.Account !== "string") throw new Error("Payment source address is missing");

    const amount = typeof tx.Amount === "string"
      ? tx.Amount
      : typeof tx.DeliverMax === "string"
        ? tx.DeliverMax
        : typeof meta?.delivered_amount === "string"
          ? meta.delivered_amount
          : null;
    if (!amount) throw new Error("Only direct XRP payments are accepted");
    if (amount !== intent.amountDrops) {
      throw new Error(`Expected exactly ${dropsToXrp(intent.amountDrops)} XRP`);
    }

    return {
      transactionHash,
      sourceAddress: tx.Account,
      destinationAddress: tx.Destination,
      destinationTag: tx.DestinationTag,
      amountDrops: amount,
      ledgerIndex: typeof result.ledger_index === "number" ? result.ledger_index : null,
      confirmedAt: typeof result.date === "number"
        ? new Date((946684800 + result.date) * 1000)
        : new Date(),
    };
  });
}
