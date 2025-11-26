import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get all pricing rules
router.get("/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { isActive } = req.query;

    const rules = await prisma.pricingRule.findMany({
      where: {
        shopId,
        ...(isActive !== undefined && { isActive: isActive === "true" })
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }]
    });

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create pricing rule
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      name: z.string(),
      ruleType: z.enum(["FIXED_MARGIN", "PERCENTAGE_MARKUP", "COMPETITOR_MATCH", "DYNAMIC_REPRICING"]),
      isActive: z.boolean().default(true),
      minMarginPercent: z.number().optional(),
      maxMarginPercent: z.number().optional(),
      fixedMarkupAmount: z.number().optional(),
      competitorUrls: z.array(z.string()).default([]),
      priceFloor: z.number().optional(),
      priceCeiling: z.number().optional(),
      applyToCategories: z.array(z.string()).default([]),
      excludeProducts: z.array(z.string()).default([]),
      priority: z.number().default(100)
    });

    const data = schema.parse(req.body);

    const rule = await prisma.pricingRule.create({
      data
    });

    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update pricing rule
router.put("/:id", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().optional(),
      ruleType: z.enum(["FIXED_MARGIN", "PERCENTAGE_MARKUP", "COMPETITOR_MATCH", "DYNAMIC_REPRICING"]).optional(),
      isActive: z.boolean().optional(),
      minMarginPercent: z.number().optional(),
      maxMarginPercent: z.number().optional(),
      fixedMarkupAmount: z.number().optional(),
      competitorUrls: z.array(z.string()).optional(),
      priceFloor: z.number().optional(),
      priceCeiling: z.number().optional(),
      priority: z.number().optional()
    });

    const data = schema.parse(req.body);

    const rule = await prisma.pricingRule.update({
      where: { id: req.params.id },
      data
    });

    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete pricing rule
router.delete("/:id", async (req, res) => {
  try {
    await prisma.pricingRule.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Apply pricing rules to product
router.post("/apply/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { competitorPrice } = req.body;

    const product = await prisma.productInventory.findUnique({
      where: { id: productId },
      include: { shop: { include: { pricingRules: { where: { isActive: true }, orderBy: { priority: "asc" } } } } }
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let newPrice = product.sellingPrice ? Number(product.sellingPrice) : 0;
    let appliedRule: any = null;

    // Apply highest priority rule
    for (const rule of product.shop.pricingRules) {
      if (rule.ruleType === "FIXED_MARGIN" && rule.fixedMarkupAmount) {
        newPrice = (product.costPrice ? Number(product.costPrice) : 0) + Number(rule.fixedMarkupAmount);
        appliedRule = rule;
        break;
      } else if (rule.ruleType === "PERCENTAGE_MARKUP" && rule.minMarginPercent) {
        newPrice = (product.costPrice ? Number(product.costPrice) : 0) * (1 + Number(rule.minMarginPercent) / 100);
        appliedRule = rule;
        break;
      } else if (rule.ruleType === "COMPETITOR_MATCH" && competitorPrice) {
        newPrice = competitorPrice * 0.99; // Undercut by 1%
        appliedRule = rule;
        break;
      }
    }

    // Apply floor/ceiling
    if (appliedRule) {
      if (appliedRule.priceFloor && newPrice < Number(appliedRule.priceFloor)) {
        newPrice = Number(appliedRule.priceFloor);
      }
      if (appliedRule.priceCeiling && newPrice > Number(appliedRule.priceCeiling)) {
        newPrice = Number(appliedRule.priceCeiling);
      }
    }

    // Update price and record history
    const oldPrice = product.sellingPrice ? Number(product.sellingPrice) : 0;
    const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    const [updatedProduct, priceHistory] = await prisma.$transaction([
      prisma.productInventory.update({
        where: { id: productId },
        data: { sellingPrice: newPrice }
      }),
      prisma.priceHistory.create({
        data: {
          productId,
          oldPrice,
          newPrice,
          changePercent,
          reason: appliedRule ? `Rule: ${appliedRule.name}` : "Manual",
          appliedRuleId: appliedRule?.id,
          competitorPrice
        }
      })
    ]);

    res.json({ product: updatedProduct, priceHistory, appliedRule });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get price history
router.get("/history/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = "50" } = req.query;

    const history = await prisma.priceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string)
    });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk reprice products
router.post("/bulk-reprice", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      productIds: z.array(z.string()).optional(),
      competitorPrices: z.record(z.string(), z.number()).optional()
    });

    const { shopId, productIds, competitorPrices } = schema.parse(req.body);

    const products = await prisma.productInventory.findMany({
      where: {
        shopId,
        ...(productIds && { id: { in: productIds } })
      },
      include: { shop: { include: { pricingRules: { where: { isActive: true }, orderBy: { priority: "asc" } } } } }
    });

    const results = [];

    for (const product of products) {
      let newPrice = product.sellingPrice ? Number(product.sellingPrice) : 0;
      let appliedRule: any = null;
      const competitorPrice = (competitorPrices as Record<string, number> | undefined)?.[product.id];

      for (const rule of product.shop.pricingRules) {
        if (rule.ruleType === "FIXED_MARGIN" && rule.fixedMarkupAmount) {
          newPrice = (product.costPrice ? Number(product.costPrice) : 0) + Number(rule.fixedMarkupAmount);
          appliedRule = rule;
          break;
        } else if (rule.ruleType === "PERCENTAGE_MARKUP" && rule.minMarginPercent) {
          newPrice = (product.costPrice ? Number(product.costPrice) : 0) * (1 + Number(rule.minMarginPercent) / 100);
          appliedRule = rule;
          break;
        } else if (rule.ruleType === "COMPETITOR_MATCH" && competitorPrice) {
          newPrice = competitorPrice * 0.99;
          appliedRule = rule;
          break;
        }
      }

      if (appliedRule) {
        if (appliedRule.priceFloor && newPrice < Number(appliedRule.priceFloor)) {
          newPrice = Number(appliedRule.priceFloor);
        }
        if (appliedRule.priceCeiling && newPrice > Number(appliedRule.priceCeiling)) {
          newPrice = Number(appliedRule.priceCeiling);
        }

        const oldPrice = product.sellingPrice ? Number(product.sellingPrice) : 0;
        if (Math.abs(newPrice - oldPrice) > 0.01) {
          await prisma.$transaction([
            prisma.productInventory.update({
              where: { id: product.id },
              data: { sellingPrice: newPrice }
            }),
            prisma.priceHistory.create({
              data: {
                productId: product.id,
                oldPrice,
                newPrice,
                changePercent: ((newPrice - oldPrice) / oldPrice) * 100,
                reason: `Bulk repricing: ${appliedRule.name}`,
                appliedRuleId: appliedRule.id,
                competitorPrice
              }
            })
          ]);

          results.push({ productId: product.id, oldPrice, newPrice, rule: appliedRule.name });
        }
      }
    }

    res.json({ updated: results.length, results });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
