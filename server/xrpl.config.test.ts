import { describe, expect, it } from "vitest";

function rpcUrlFromWebSocket(wsUrl: string) {
  const url = new URL(wsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.port = url.port === "51233" ? "51234" : url.port;
  return url.toString().replace(/\/$/, "");
}

describe("XRPL testnet configuration", () => {
  it("resolves the configured destination account on the configured ledger", async () => {
    const destination = process.env.XRPL_DESTINATION_ADDRESS;
    const websocketEndpoint = process.env.XRPL_NETWORK_WS;

    expect(destination).toMatch(/^r[a-zA-Z0-9]{24,34}$/);
    expect(websocketEndpoint).toMatch(/^wss:\/\//);

    const response = await fetch(rpcUrlFromWebSocket(websocketEndpoint!), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        method: "account_info",
        params: [{ account: destination, ledger_index: "validated" }],
      }),
    });

    expect(response.ok).toBe(true);
    const payload = await response.json() as {
      result?: {
        status?: string;
        validated?: boolean;
        account_data?: { Account?: string };
      };
    };

    expect(payload.result?.status).toBe("success");
    expect(payload.result?.validated).toBe(true);
    expect(payload.result?.account_data?.Account).toBe(destination);
  }, 20_000);
});
