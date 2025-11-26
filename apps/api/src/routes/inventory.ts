import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get all inventory for a shop
router.get("/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { status, lowStock } = req.query;

    const where: any = { shopId };
    if (status) where.status = status;
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
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update inventory
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      shopeeItemId: z.string(),
      sku: z.string(),
      productName: z.string(),
      currentStock: z.number().int(),
      lowStockThreshold: z.number().int().optional(),
      reorderPoint: z.number().int().optional(),
      reorderQuantity: z.number().int().optional(),
      costPrice: z.number().optional(),
      sellingPrice: z.number().optional(),
      supplier: z.string().optional(),
      location: z.string().optional()
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Adjust stock
router.post("/:id/adjust", async (req, res) => {
  try {
    const schema = z.object({
      quantity: z.number().int(),
      type: z.enum(["IN", "OUT", "ADJUSTMENT", "RETURN"]),
      reason: z.string().optional(),
      reference: z.string().optional(),
      performedBy: z.string().optional()
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk import inventory
router.post("/bulk-import", async (req, res) => {
  try {
    const schema = z.array(z.object({
      shopId: z.string(),
      shopeeItemId: z.string(),
      sku: z.string(),
      productName: z.string(),
      currentStock: z.number().int(),
      costPrice: z.number().optional(),
      sellingPrice: z.number().optional()
    }));

    const items = schema.parse(req.body);
    
    const results = await prisma.$transaction(
      items.map(item => 
        prisma.productInventory.upsert({
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
        })
      )
    );

    res.json({ imported: results.length, items: results });
  } catch (error: any) {
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
        ...(shopId && { product: { shopId: shopId as string } })
      },
      include: {
        product: true
      },
      orderBy: { notifiedAt: "desc" }
    });

    res.json(alerts);
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
