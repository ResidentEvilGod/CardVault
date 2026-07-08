import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createSaleItem,
  deleteSaleItem,
  getBinderCardById,
  getCardById,
  getListingTemplates,
  getSaleItems,
  updateSaleItem,
} from "../db";

async function generateEbayListing(card: {
  cardName: string;
  tcg: string;
  setName?: string | null;
  cardNumber?: string | null;
  rarity?: string | null;
  condition: string;
  isGraded: boolean;
  gradingCompany?: string | null;
  gradeLevel?: string | null;
  certNumber?: string | null;
  priceNm?: string | null;
  notes?: string | null;
  templateSnippet?: string | null;
}): Promise<{ title: string; description: string }> {
  const gradeInfo = card.isGraded && card.gradingCompany
    ? `${card.gradingCompany} ${card.gradeLevel ?? "Graded"}${card.certNumber ? ` Cert #${card.certNumber}` : ""}`
    : null;

  const prompt = `You are an expert eBay seller specializing in trading cards. Generate an eye-catching, professional eBay listing for this card.

Card Details:
- Name: ${card.cardName}
- Game: ${card.tcg.toUpperCase()}
- Set: ${card.setName ?? "Unknown"}
- Number: ${card.cardNumber ?? "N/A"}
- Rarity: ${card.rarity ?? "Unknown"}
- Condition: ${gradeInfo ?? card.condition}
- Market Value: ${card.priceNm ? `$${card.priceNm}` : "Unknown"}
${card.notes ? `- Seller Notes: ${card.notes}` : ""}
${card.templateSnippet ? `- Seller Template: ${card.templateSnippet}` : ""}

Return JSON with:
{
  "title": "eBay listing title (max 80 chars, include key search terms: card name, set, condition/grade, TCG name)",
  "description": "Full HTML-formatted eBay description with sections: Card Details, Condition, Shipping & Payment, About the Card. Make it professional and eye-catching with emojis. Include all relevant details."
}`;

  const res = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You are an expert eBay trading card seller. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ebay_listing",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "description"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("No response from LLM");
  const contentStr = typeof content === "string" ? content : JSON.stringify(content);
  return JSON.parse(contentStr);
}

function buildEbaySearchUrl(cardName: string, tcg: string, setName?: string | null, gradeInfo?: string | null): string {
  const parts = [cardName];
  if (setName) parts.push(setName);
  if (gradeInfo) parts.push(gradeInfo);
  const query = encodeURIComponent(parts.join(" "));
  return `https://www.ebay.com/sch/i.html?_nkw=${query}&_sacat=0&LH_Sold=1&LH_Complete=1`;
}

export const sellRouter = router({
  // Generate eBay listing for a binder card
  generateListing: protectedProcedure
    .input(z.object({
      binderCardId: z.number(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const binderEntry = await getBinderCardById(input.binderCardId, ctx.user.id);
      if (!binderEntry) throw new TRPCError({ code: "NOT_FOUND", message: "Card not in your binder" });

      const { binder, card } = binderEntry;

      // Get template if specified
      let templateSnippet: string | null = null;
      if (input.templateId) {
        const templates = await getListingTemplates(ctx.user.id);
        const template = templates.find(t => t.id === input.templateId);
        if (template) templateSnippet = template.descriptionSnippet;
      }

      const listing = await generateEbayListing({
        cardName: card.cardName,
        tcg: card.tcg,
        setName: card.setName,
        cardNumber: card.cardNumber,
        rarity: card.rarity,
        condition: binder.condition,
        isGraded: binder.isGraded,
        gradingCompany: binder.gradingCompany,
        gradeLevel: binder.gradeLevel,
        certNumber: binder.certNumber,
        priceNm: card.priceNm,
        notes: binder.notes,
        templateSnippet,
      });

      const gradeInfo = binder.isGraded && binder.gradingCompany
        ? `${binder.gradingCompany} ${binder.gradeLevel}`
        : null;

      const ebaySearchUrl = buildEbaySearchUrl(card.cardName, card.tcg, card.setName, gradeInfo);

      // Save as draft sale item
      await createSaleItem({
        userId: ctx.user.id,
        binderCardId: input.binderCardId,
        cardId: card.id,
        listingTitle: listing.title,
        listingDescription: listing.description,
        askingPrice: card.priceNm ?? undefined,
        ebaySearchUrl,
        status: "draft",
      });

      return { ...listing, ebaySearchUrl };
    }),

  // List all sale items
  list: protectedProcedure.query(async ({ ctx }) => {
    return getSaleItems(ctx.user.id);
  }),

  // Update sale item status
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "listed", "sold", "archived"]),
      soldPrice: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateSaleItem(input.id, ctx.user.id, {
        status: input.status,
        soldPrice: input.soldPrice,
        soldAt: input.status === "sold" ? new Date() : undefined,
      });
      return { success: true };
    }),

  // Delete sale item
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSaleItem(input.id, ctx.user.id);
      return { success: true };
    }),
});
