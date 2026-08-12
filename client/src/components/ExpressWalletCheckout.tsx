import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

type ExpressWalletCheckoutProps = {
  packId: string;
  onComplete?: () => void;
};

function WalletButton({ onComplete }: { onComplete?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements) return;
    setIsConfirming(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/credits?success=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message || "The wallet payment could not be completed");
    } else if (paymentIntent?.status === "succeeded") {
      toast.success("Payment received. Your credits will appear shortly.");
      onComplete?.();
    }
    setIsConfirming(false);
  };

  return (
    <div className="space-y-3">
      <ExpressCheckoutElement
        onConfirm={handleConfirm}
        options={{
          buttonType: { applePay: "buy", googlePay: "buy" },
          buttonTheme: { applePay: "white-outline", googlePay: "white" },
          layout: { maxColumns: 1, maxRows: 1 },
        }}
      />
      {isConfirming && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirming secure wallet payment…
        </div>
      )}
    </div>
  );
}

export function ExpressWalletCheckout({ packId, onComplete }: ExpressWalletCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const createPaymentIntent = trpc.stripe.createPackPaymentIntent.useMutation({
    onSuccess: (data) => setClientSecret(data.clientSecret),
    onError: (error) => toast.error(error.message || "Unable to start wallet checkout"),
  });

  const beginCheckout = () => {
    if (!stripePromise) {
      toast.error("Apple Pay and Google Pay are not configured yet");
      return;
    }
    createPaymentIntent.mutate({ packId });
  };

  if (!publishableKey) return null;

  return (
    <div className="mt-3 rounded-lg p-3" style={{ background: "oklch(0.12 0.03 50 / 0.5)", border: "1px solid oklch(0.44 0.10 55 / 0.35)" }}>
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <WalletCards className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
        <span>Express checkout</span>
        <ShieldCheck className="ml-auto h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
      </div>
      {!clientSecret ? (
        <button
          type="button"
          onClick={beginCheckout}
          disabled={createPaymentIntent.isPending}
          className="btn-arcane w-full text-xs"
        >
          {createPaymentIntent.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="h-3.5 w-3.5" />}
          Apple Pay / Google Pay
        </button>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "night" },
          }}
        >
          <WalletButton onComplete={onComplete} />
        </Elements>
      )}
    </div>
  );
}
