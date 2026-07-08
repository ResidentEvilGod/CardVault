import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Camera,
  CheckCircle,
  ChevronRight,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type ScanResult = {
  card: {
    id: number;
    cardName: string;
    tcg: string;
    setName?: string | null;
    priceNm?: string | null;
    officialImageUrl?: string | null;
    uploadedImageUrl?: string | null;
  };
  identification: {
    tcg: string;
    cardName: string;
    confidence: number;
    isGraded?: boolean;
    gradingCompany?: string | null;
    gradeLevel?: string | null;
  };
  isHighValue: boolean;
};

export default function Scan() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanMutation = trpc.cards.scan.useMutation({
    onSuccess: (data) => {
      setResult(data as ScanResult);
      toast.success("Card identified successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to identify card. Please try a clearer photo.");
    },
  });

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64 ?? null);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleScan = () => {
    if (!imageBase64) return;
    scanMutation.mutate({ imageBase64, mimeType: "image/jpeg" });
  };

  const handleReset = () => {
    setPreview(null);
    setImageBase64(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 55 / 0.2), oklch(0.55 0.25 290 / 0.2))" }}>
          <Wand2 className="w-10 h-10" style={{ color: "var(--gold)" }} />
        </div>
        <h2 className="font-display text-2xl font-bold text-gradient-gold mb-3">Sign In to Scan Cards</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create a free account to start scanning cards and get instant valuations.
        </p>
        <button onClick={() => startLogin()} className="btn-fantasy">
          <Sparkles className="w-4 h-4" />
          Enter the Vault — Free
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Scan a Card</h1>
        <p className="text-muted-foreground">Upload a photo of your trading card for instant AI identification and live pricing.</p>
      </div>

      {!result ? (
        <div className="space-y-6">
          {/* Drop zone */}
          <div
            className={`scan-dropzone ${dragOver ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {preview ? (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img
                  src={preview}
                  alt="Card preview"
                  className="max-h-64 max-w-full object-contain rounded-lg"
                  style={{ boxShadow: "0 8px 32px oklch(0 0 0 / 0.4)" }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleReset(); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: "oklch(0.18 0.04 50)", border: "1px solid oklch(0.45 0.10 60)" }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center float-glow"
                  style={{ background: "oklch(0.22 0.06 55 / 0.4)", border: "1px solid oklch(0.78 0.16 75 / 0.3)" }}>
                  <Upload className="w-8 h-8" style={{ color: "var(--gold)" }} />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-foreground mb-1">Drop your card image here</p>
                  <p className="text-sm text-muted-foreground">or click to browse • supports JPG, PNG, WEBP</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="btn-arcane text-sm"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="fantasy-card p-4">
            <p className="font-heading text-xs text-muted-foreground uppercase tracking-wider mb-3">Tips for best results</p>
            <ul className="space-y-1.5">
              {[
                "Lay the card flat on a dark, non-reflective surface",
                "Ensure the entire card is visible with good lighting",
                "For graded cards, photograph the slab label clearly",
                "Avoid blurry or angled shots",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Scan button */}
          {preview && (
            <button
              onClick={handleScan}
              disabled={scanMutation.isPending}
              className="btn-fantasy w-full text-base py-3"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Consulting the Oracle...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Identify & Value Card
                </>
              )}
            </button>
          )}

          {scanMutation.isError && (
            <div className="flex items-start gap-3 p-4 rounded-lg"
              style={{ background: "oklch(0.18 0.04 25 / 0.5)", border: "1px solid oklch(0.55 0.22 25 / 0.4)" }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.65 0.22 25)" }} />
              <p className="text-sm" style={{ color: "oklch(0.75 0.12 25)" }}>{scanMutation.error?.message}</p>
            </div>
          )}
        </div>
      ) : (
        /* Result */
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg"
            style={{ background: "oklch(0.18 0.06 160 / 0.3)", border: "1px solid oklch(0.60 0.20 160 / 0.4)" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.60 0.20 160)" }} />
            <div>
              <p className="font-heading text-sm font-semibold" style={{ color: "oklch(0.70 0.18 160)" }}>
                Card Identified!
              </p>
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round((result.identification.confidence ?? 0) * 100)}%
              </p>
            </div>
            {result.isHighValue && (
              <div className="ml-auto rune-badge text-xs">
                <Sparkles className="w-3 h-3" /> High Value
              </div>
            )}
          </div>

          <div className="fantasy-card p-6">
            <div className="flex gap-6">
              {(result.card.officialImageUrl || result.card.uploadedImageUrl) && (
                <img
                  src={result.card.officialImageUrl ?? result.card.uploadedImageUrl ?? ""}
                  alt={result.card.cardName}
                  className="w-28 rounded-lg object-cover flex-shrink-0"
                  style={{ boxShadow: "0 4px 20px oklch(0 0 0 / 0.4)" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap mb-2">
                  <span className={`rune-badge badge-${result.card.tcg} text-xs`}>
                    {result.card.tcg.toUpperCase()}
                  </span>
                  {result.identification.isGraded && (
                    <span className="rune-badge text-xs" style={{ color: "var(--arcane-light)", borderColor: "oklch(0.55 0.25 290 / 0.4)" }}>
                      {result.identification.gradingCompany} {result.identification.gradeLevel}
                    </span>
                  )}
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground mb-1">{result.card.cardName}</h2>
                {result.card.setName && (
                  <p className="text-sm text-muted-foreground mb-3">{result.card.setName}</p>
                )}
                {result.card.priceNm && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider mb-1">Market Value (NM)</div>
                    <div className="price-display">${parseFloat(result.card.priceNm).toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href={`/card/${result.card.id}`}>
              <button className="btn-fantasy w-full text-sm">
                <Sparkles className="w-4 h-4" />
                Full Details
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            <button onClick={handleReset} className="btn-arcane w-full text-sm">
              <Camera className="w-4 h-4" />
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
