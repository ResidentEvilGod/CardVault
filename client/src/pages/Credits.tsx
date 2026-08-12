import { useState } from "react";
import {
  CheckCircle,
  Clock3,
  Copy,
  Crown,
  ExternalLink,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { ExpressWalletCheckout } from "@/components/ExpressWalletCheckout";
import { trpc } from "@/lib/trpc";

const CREDIT_PACKS = [
  { id: "pack_10", name: "Starter Pack", credits: 10, price: 1.99, popular: false, desc: "A quick start for curious collectors" },
  { id: "pack_25", name: "Collector Pack", credits: 25, price: 3.99, popular: true, desc: "Perfect for regular scanners" },
  { id: "pack_100", name: "Vault Pack", credits: 100, price: 9.99, popular: false, desc: "Best value for serious collectors" },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "sub_basic",
    name: "Apprentice",
    price: 4.99,
    interval: "month",
    features: ["50 scans each month", "Daily price updates", "eBay listing generator", "Graded card prices"],
    icon: Crown,
    color: "var(--gold)",
  },
  {
    id: "sub_pro",
    name: "Archmage",
    price: 9.99,
    interval: "month",
    features: ["Unlimited card scans", "Priority AI processing", "Daily price updates", "Priority support"],
    icon: Star,
    color: "oklch(0.65 0.22 280)",
    badge: "Best Value",
  },
];

type XrplInvoice = {
  invoiceId: string;
  destinationAddress: string;
  destinationTag: number;
  amountXrp: string;
  amountDrops: string;
  paymentUri: string;
  expiresAt: string | Date;
  packName: string;
  credits: number;
  network: string;
};

export default function Credits() {
  const { data: balance, refetch } = trpc.credits.balance.useQuery();
  const [xrplInvoice, setXrplInvoice] = useState<XrplInvoice | null>(null);
  const [transactionHash, setTransactionHash] = useState("");

  const packCheckoutMutation = trpc.stripe.createPackCheckout.useMutation({
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (err) => toast.error(err.message || "Failed to start checkout"),
  });

  const subCheckoutMutation = trpc.stripe.createSubscriptionCheckout.useMutation({
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (err) => toast.error(err.message || "Failed to start checkout"),
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: () => toast.error("Failed to open billing portal"),
  });

  const xrplCreateMutation = trpc.xrpl.createPackPayment.useMutation({
    onSuccess: (data) => {
      setXrplInvoice(data as XrplInvoice);
      setTransactionHash("");
      toast.success("XRPL testnet invoice created");
    },
    onError: (err) => toast.error(err.message || "Failed to create XRPL invoice"),
  });

  const xrplVerifyMutation = trpc.xrpl.verifyPackPayment.useMutation({
    onSuccess: async (data) => {
      await refetch();
      setXrplInvoice(null);
      setTransactionHash("");
      if ("transactionHash" in data && data.transactionHash) {
        toast.success(`Payment confirmed — ${data.creditsGranted ?? 0} credits added`);
      } else {
        toast.success("Payment was already processed");
      }
    },
    onError: (err) => toast.error(err.message || "Payment is not confirmed yet"),
  });

  const isSubscribed = balance?.subscriptionStatus === "active";
  const invoiceExpiresAt = xrplInvoice ? new Date(xrplInvoice.expiresAt) : null;
  const explorerUrl = transactionHash.length === 64
    ? `https://testnet.xrpscan.com/tx/${transactionHash}`
    : "https://testnet.xrpscan.com/";

  const copyValue = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display mb-2 text-3xl font-bold text-gradient-gold">Credits & Plans</h1>
        <p className="text-sm text-muted-foreground">Choose a plan or pay securely with a digital wallet or the XRPL testnet.</p>
      </div>

      <div className="fantasy-card mb-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "oklch(0.22 0.06 55 / 0.4)", border: "1px solid oklch(0.78 0.16 75 / 0.3)" }}>
              <Zap className="h-6 w-6" style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <div className="mb-1 font-heading text-xs uppercase tracking-wider text-muted-foreground">Your Current Balance</div>
              {isSubscribed ? (
                <div className="font-heading text-2xl font-bold" style={{ color: "var(--gold)" }}>∞ Unlimited Scans</div>
              ) : (
                <div className="font-heading text-2xl font-bold" style={{ color: "var(--gold)" }}>
                  {balance?.scanCredits ?? 0} <span className="text-base font-normal text-muted-foreground">scan credits</span>
                </div>
              )}
              {isSubscribed && (
                <div className="mt-1 flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
                  <span className="font-heading text-sm" style={{ color: "var(--gold)" }}>Archmage Subscriber</span>
                </div>
              )}
            </div>
          </div>
          {isSubscribed && (
            <button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending} className="btn-arcane text-sm">
              {portalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {!isSubscribed && (
        <div className="mb-10">
          <div className="ornate-divider mb-6"><span className="font-heading text-sm uppercase tracking-widest text-muted-foreground">Unlimited Plans</span></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.id} className="fantasy-card relative p-6" style={{ borderColor: plan.badge ? "oklch(0.55 0.25 290 / 0.5)" : undefined }}>
                  {plan.badge && <div className="rune-badge absolute -top-3 left-1/2 -translate-x-1/2 text-xs" style={{ color: plan.color, borderColor: `${plan.color}60` }}><Sparkles className="h-3 w-3" /> {plan.badge}</div>}
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}40` }}><Icon className="h-5 w-5" style={{ color: plan.color }} /></div>
                    <div><h3 className="font-heading text-base font-semibold text-foreground">{plan.name}</h3><div className="flex items-baseline gap-1"><span className="font-heading text-2xl font-bold" style={{ color: plan.color }}>${plan.price}</span><span className="text-xs text-muted-foreground">/{plan.interval}</span></div></div>
                  </div>
                  <ul className="mb-5 space-y-2">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: plan.color }} />{feature}</li>)}</ul>
                  <button onClick={() => subCheckoutMutation.mutate({ planId: plan.id })} disabled={subCheckoutMutation.isPending} className="btn-fantasy w-full text-sm" style={plan.badge ? { background: `linear-gradient(135deg, ${plan.color}, oklch(0.45 0.22 295))` } : {}}>
                    {subCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}Subscribe Now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="ornate-divider mb-6"><span className="font-heading text-sm uppercase tracking-widest text-muted-foreground">Credit Packs</span></div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className={`fantasy-card relative p-5 ${pack.popular ? "glow-gold" : ""}`} style={pack.popular ? { borderColor: "oklch(0.78 0.16 75 / 0.6)" } : {}}>
              {pack.popular && <div className="rune-badge absolute -top-3 left-1/2 -translate-x-1/2 text-xs"><Star className="h-3 w-3" /> Popular</div>}
              <div className="mb-4 text-center"><div className="mb-1 font-heading text-base font-semibold text-foreground">{pack.name}</div><div className="price-display">${pack.price}</div><div className="mt-1 text-xs text-muted-foreground">{pack.desc}</div></div>
              <div className="mb-4 flex items-center justify-center gap-2 rounded-lg p-3" style={{ background: "oklch(0.18 0.04 55 / 0.3)", border: "1px solid oklch(0.45 0.10 60 / 0.3)" }}><Zap className="h-4 w-4" style={{ color: "var(--gold)" }} /><span className="font-heading text-lg font-bold" style={{ color: "var(--gold)" }}>{pack.credits}</span><span className="text-sm text-muted-foreground">scans</span></div>
              <div className="mb-4 text-center text-xs text-muted-foreground">${(pack.price / pack.credits).toFixed(3)} per scan • Never expires</div>
              <button onClick={() => packCheckoutMutation.mutate({ packId: pack.id })} disabled={packCheckoutMutation.isPending} className={`w-full ${pack.popular ? "btn-fantasy" : "btn-arcane"} text-sm`}>
                {packCheckoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Buy {pack.credits} Credits
              </button>
              <ExpressWalletCheckout packId={pack.id} onComplete={refetch} />
              <button type="button" onClick={() => xrplCreateMutation.mutate({ packId: pack.id })} disabled={xrplCreateMutation.isPending} className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-950/40 disabled:opacity-50">
                {xrplCreateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />} Pay with XRP Ledger (testnet)
              </button>
            </div>
          ))}
        </div>
      </div>

      {xrplInvoice && (
        <div className="fantasy-card mt-8 p-5" style={{ borderColor: "oklch(0.64 0.16 160 / 0.55)" }}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div><div className="mb-1 flex items-center gap-2 font-heading text-lg font-semibold text-foreground"><QrCode className="h-5 w-5 text-emerald-300" /> XRPL Testnet Invoice</div><p className="text-xs text-muted-foreground">Send the exact amount, including the destination tag. The server will verify a validated ledger transaction before granting credits.</p></div>
            <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-200">{xrplInvoice.network}</span>
          </div>
          <div className="grid gap-5 md:grid-cols-[190px_1fr]">
            <div className="flex items-center justify-center rounded-lg bg-white p-2"><QRCodeCanvas value={xrplInvoice.paymentUri} size={170} includeMargin /></div>
            <div className="space-y-3 text-sm">
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Pack</div><div className="font-heading text-foreground">{xrplInvoice.packName} · {xrplInvoice.credits} credits</div></div>
              <div className="grid grid-cols-2 gap-3"><div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Exact amount</div><div className="font-heading text-emerald-200">{xrplInvoice.amountXrp} XRP</div></div><div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Destination tag</div><div className="font-heading text-foreground">{xrplInvoice.destinationTag}</div></div></div>
              <div><div className="text-[11px] uppercase tracking-widest text-muted-foreground">Receiving address</div><button type="button" onClick={() => copyValue("Address", xrplInvoice.destinationAddress)} className="flex max-w-full items-center gap-2 text-left text-xs text-emerald-200 hover:text-emerald-100"><span className="truncate">{xrplInvoice.destinationAddress}</span><Copy className="h-3.5 w-3.5 flex-shrink-0" /></button></div>
              {invoiceExpiresAt && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Expires {invoiceExpiresAt.toLocaleTimeString()}</div>}
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => copyValue("Payment URI", xrplInvoice.paymentUri)} className="btn-arcane text-xs"><Copy className="h-3.5 w-3.5" /> Copy payment URI</button><a className="btn-arcane text-xs" href="https://testnet.xrpscan.com/" target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Explorer</a></div>
            </div>
          </div>
          <div className="mt-5 border-t border-white/10 pt-4">
            <label className="mb-2 block text-xs uppercase tracking-widest text-muted-foreground" htmlFor="xrpl-hash">After sending, paste the validated transaction hash</label>
            <div className="flex flex-col gap-2 sm:flex-row"><input id="xrpl-hash" value={transactionHash} onChange={(event) => setTransactionHash(event.target.value.trim())} placeholder="64-character XRPL transaction hash" className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-foreground outline-none focus:border-emerald-400/60" /><button type="button" onClick={() => xrplVerifyMutation.mutate({ invoiceId: xrplInvoice.invoiceId, transactionHash })} disabled={transactionHash.length !== 64 || xrplVerifyMutation.isPending} className="btn-fantasy text-xs">{xrplVerifyMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Verify payment</button></div>
            <a href={explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" /> Open XRPL testnet explorer</a>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-2 rounded-lg p-4 text-center" style={{ background: "oklch(0.16 0.03 50 / 0.5)", border: "1px solid oklch(0.30 0.05 55 / 0.3)" }}>
        <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
        <p className="text-sm text-muted-foreground">New accounts receive <strong style={{ color: "var(--gold)" }}>5 free scan credits</strong>. Apple Pay and Google Pay require wallet availability and Stripe domain activation.</p>
        <RefreshCw className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
      </div>
    </div>
  );
}
