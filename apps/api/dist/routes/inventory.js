"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all inventory for a shop
router.get("/:shopId", async (req, res) => {
    try {
        const { shopId } = req.params;
        const { status, lowStock } = req.query;
        const where = { shopId };
        if (status)
            where.status = status;
        // Low stock filter - compare currentStock with lowStockThreshold
        // Note: This is a simplified version. For complex SQL, use raw queries separately
        const inventory = await prisma.productInventory.findMany({
            where,
            include: {
                stockMovements: { orderBy: { createdAt: "desc" }, take: 5 },
                priceHistory: { orderBy: { createdAt: "desc" }, take: 10 },
                lowStockAlerts: { where: { resolvedAt: null } }
            },
            orderBy: { updatedAt: "desc" }
        });
        const stats = await prisma.productInventory.aggregate({
            where: { shopId },
            _count: true,
            _sum: { currentStock: true, availableStock: true, reservedStock: true }
        });
        res.json({ inventory, stats });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get single product inventory
router.get("/product/:id", async (req, res) => {
    try {
        const product = await prisma.productInventory.findUnique({
            where: { id: req.params.id },
            include: {
                stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
                priceHistory: { orderBy: { createdAt: "desc" }, take: 20 },
                lowStockAlerts: true,
                productMappings: true
            }
        });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create/Update inventory
router.post("/", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            shopeeItemId: zod_1.z.string(),
            sku: zod_1.z.string(),
            productName: zod_1.z.string(),
            currentStock: zod_1.z.number().int(),
            lowStockThreshold: zod_1.z.number().int().optional(),
            reorderPoint: zod_1.z.number().int().optional(),
            reorderQuantity: zod_1.z.number().int().optional(),
            costPrice: zod_1.z.number().optional(),
            sellingPrice: zod_1.z.number().optional(),
            supplier: zod_1.z.string().optional(),
            location: zod_1.z.string().optional()
        });
        const data = schema.parse(req.body);
        const inventory = await prisma.productInventory.upsert({
            where: {
                shopId_shopeeItemId: {
                    shopId: data.shopId,
                    shopeeItemId: data.shopeeItemId
                }
            },
            create: {
                ...data,
                availableStock: data.currentStock,
                status: data.currentStock > (data.lowStockThreshold || 5) ? "IN_STOCK" : "LOW_STOCK"
            },
            update: data
        });
        res.json(inventory);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Adjust stock
router.post("/:id/adjust", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            quantity: zod_1.z.number().int(),
            type: zod_1.z.enum(["IN", "OUT", "ADJUSTMENT", "RETURN"]),
            reason: zod_1.z.string().optional(),
            reference: zod_1.z.string().optional(),
            performedBy: zod_1.z.string().optional()
        });
        const data = schema.parse(req.body);
        const { id } = req.params;
        const product = await prisma.productInventory.findUnique({ where: { id } });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        const newQty = data.type === "OUT"
            ? product.currentStock - data.quantity
            : product.currentStock + data.quantity;
        const [updated, movement] = await prisma.$transaction([
            prisma.productInventory.update({
                where: { id },
                data: {
                    currentStock: newQty,
                    availableStock: newQty - product.reservedStock,
                    status: newQty <= 0 ? "OUT_OF_STOCK" : newQty <= product.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK"
                }
            }),
            prisma.stockMovement.create({
                data: {
                    productId: id,
                    movementType: data.type,
                    quantity: data.quantity,
                    reference: data.reference,
                    reason: data.reason,
                    performedBy: data.performedBy,
                    previousQty: product.currentStock,
                    newQty
                }
            })
        ]);
        // Check for low stock alert
        if (updated.status === "LOW_STOCK" || updated.status === "OUT_OF_STOCK") {
            await prisma.lowStockAlert.create({
                data: {
                    productId: id,
                    currentQty: newQty,
                    threshold: product.lowStockThreshold
                }
            });
        }
        res.json({ product: updated, movement });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Bulk import inventory
router.post("/bulk-import", async (req, res) => {
    try {
        const schema = zod_1.z.array(zod_1.z.object({
            shopId: zod_1.z.string(),
            shopeeItemId: zod_1.z.string(),
            sku: zod_1.z.string(),
            productName: zod_1.z.string(),
            currentStock: zod_1.z.number().int(),
            costPrice: zod_1.z.number().optional(),
            sellingPrice: zod_1.z.number().optional()
        }));
        const items = schema.parse(req.body);
        const results = await prisma.$transaction(items.map(item => prisma.productInventory.upsert({
            where: {
                shopId_shopeeItemId: {
                    shopId: item.shopId,
                    shopeeItemId: item.shopeeItemId
                }
            },
            create: {
                ...item,
                availableStock: item.currentStock,
                status: item.currentStock > 5 ? "IN_STOCK" : "LOW_STOCK"
            },
            update: item
        })));
        res.json({ imported: results.length, items: results });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get low stock alerts
router.get("/alerts/low-stock", async (req, res) => {
    try {
        const { shopId } = req.query;
        const alerts = await prisma.lowStockAlert.findMany({
            where: {
                resolvedAt: null,
                ...(shopId && { product: { shopId: shopId } })
            },
            include: {
                product: true
            },
            orderBy: { notifiedAt: "desc" }
        });
        res.json(alerts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Acknowledge low stock alert
router.post("/alerts/:id/acknowledge", async (req, res) => {
    try {
        const alert = await prisma.lowStockAlert.update({
            where: { id: req.params.id },
            data: { acknowledged: true }
        });
        res.json(alert);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Resolve low stock alert
router.post("/alerts/:id/resolve", async (req, res) => {
    try {
        const alert = await prisma.lowStockAlert.update({
            where: { id: req.params.id },
            data: { resolvedAt: new Date() }
        });
        res.json(alert);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
