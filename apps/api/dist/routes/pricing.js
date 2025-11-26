"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create pricing rule
router.post("/", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            name: zod_1.z.string(),
            ruleType: zod_1.z.enum(["FIXED_MARGIN", "PERCENTAGE_MARKUP", "COMPETITOR_MATCH", "DYNAMIC_REPRICING"]),
            isActive: zod_1.z.boolean().default(true),
            minMarginPercent: zod_1.z.number().optional(),
            maxMarginPercent: zod_1.z.number().optional(),
            fixedMarkupAmount: zod_1.z.number().optional(),
            competitorUrls: zod_1.z.array(zod_1.z.string()).default([]),
            priceFloor: zod_1.z.number().optional(),
            priceCeiling: zod_1.z.number().optional(),
            applyToCategories: zod_1.z.array(zod_1.z.string()).default([]),
            excludeProducts: zod_1.z.array(zod_1.z.string()).default([]),
            priority: zod_1.z.number().default(100)
        });
        const data = schema.parse(req.body);
        const rule = await prisma.pricingRule.create({
            data
        });
        res.json(rule);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Update pricing rule
router.put("/:id", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            name: zod_1.z.string().optional(),
            ruleType: zod_1.z.enum(["FIXED_MARGIN", "PERCENTAGE_MARKUP", "COMPETITOR_MATCH", "DYNAMIC_REPRICING"]).optional(),
            isActive: zod_1.z.boolean().optional(),
            minMarginPercent: zod_1.z.number().optional(),
            maxMarginPercent: zod_1.z.number().optional(),
            fixedMarkupAmount: zod_1.z.number().optional(),
            competitorUrls: zod_1.z.array(zod_1.z.string()).optional(),
            priceFloor: zod_1.z.number().optional(),
            priceCeiling: zod_1.z.number().optional(),
            priority: zod_1.z.number().optional()
        });
        const data = schema.parse(req.body);
        const rule = await prisma.pricingRule.update({
            where: { id: req.params.id },
            data
        });
        res.json(rule);
    }
    catch (error) {
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
    }
    catch (error) {
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
        let appliedRule = null;
        // Apply highest priority rule
        for (const rule of product.shop.pricingRules) {
            if (rule.ruleType === "FIXED_MARGIN" && rule.fixedMarkupAmount) {
                newPrice = (product.costPrice ? Number(product.costPrice) : 0) + Number(rule.fixedMarkupAmount);
                appliedRule = rule;
                break;
            }
            else if (rule.ruleType === "PERCENTAGE_MARKUP" && rule.minMarginPercent) {
                newPrice = (product.costPrice ? Number(product.costPrice) : 0) * (1 + Number(rule.minMarginPercent) / 100);
                appliedRule = rule;
                break;
            }
            else if (rule.ruleType === "COMPETITOR_MATCH" && competitorPrice) {
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
    }
    catch (error) {
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
            take: parseInt(limit)
        });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Bulk reprice products
router.post("/bulk-reprice", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            productIds: zod_1.z.array(zod_1.z.string()).optional(),
            competitorPrices: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional()
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
            let appliedRule = null;
            const competitorPrice = competitorPrices?.[product.id];
            for (const rule of product.shop.pricingRules) {
                if (rule.ruleType === "FIXED_MARGIN" && rule.fixedMarkupAmount) {
                    newPrice = (product.costPrice ? Number(product.costPrice) : 0) + Number(rule.fixedMarkupAmount);
                    appliedRule = rule;
                    break;
                }
                else if (rule.ruleType === "PERCENTAGE_MARKUP" && rule.minMarginPercent) {
                    newPrice = (product.costPrice ? Number(product.costPrice) : 0) * (1 + Number(rule.minMarginPercent) / 100);
                    appliedRule = rule;
                    break;
                }
                else if (rule.ruleType === "COMPETITOR_MATCH" && competitorPrice) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
