import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get all return requests
router.get("/", async (req, res) => {
  try {
    const { shopId, status, limit = "50" } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (shopId) {
      where.shopeeOrder = { shopId: shopId as string };
    }

    const returns = await prisma.returnRequest.findMany({
      where,
      include: {
        shopeeOrder: {
          select: {
            shopeeOrderSn: true,
            orderTotal: true,
            shopId: true
          }
        }
      },
      orderBy: { requestedAt: "desc" },
      take: parseInt(limit as string)
    });

    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get return request details
router.get("/:id", async (req, res) => {
  try {
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: req.params.id },
      include: {
        shopeeOrder: {
          include: {
            amazonOrder: true
          }
        }
      }
    });

    if (!returnRequest) {
      return res.status(404).json({ error: "Return request not found" });
    }

    res.json(returnRequest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create return request
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      shopeeOrderId: z.string(),
      reason: z.string(),
      customerMessage: z.string().optional(),
      attachments: z.array(z.string()).default([])
    });

    const data = schema.parse(req.body);

    // Generate RMA number
    const rmaNumber = `RMA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const returnRequest = await prisma.returnRequest.create({
      data: {
        ...data,
        rmaNumber,
        status: "REQUESTED"
      }
    });

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Approve return
router.post("/:id/approve", async (req, res) => {
  try {
    const schema = z.object({
      refundAmount: z.number().optional(),
      restockQty: z.number().int().optional(),
      internalNotes: z.string().optional(),
      processedBy: z.string()
    });

    const data = schema.parse(req.body);

    const returnRequest = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        refundAmount: data.refundAmount,
        restockQty: data.restockQty,
        internalNotes: data.internalNotes,
        processedBy: data.processedBy
      }
    });

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Reject return
router.post("/:id/reject", async (req, res) => {
  try {
    const schema = z.object({
      internalNotes: z.string(),
      processedBy: z.string()
    });

    const data = schema.parse(req.body);

    const returnRequest = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status: "REJECTED",
        internalNotes: data.internalNotes,
        processedBy: data.processedBy
      }
    });

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Process return (mark as processing)
router.post("/:id/process", async (req, res) => {
  try {
    const returnRequest = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: { status: "PROCESSING" }
    });

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Complete return with refund and restock
router.post("/:id/complete", async (req, res) => {
  try {
    const schema = z.object({
      refundAmount: z.number(),
      restockQty: z.number().int().optional(),
      productId: z.string().optional(),
      processedBy: z.string()
    });

    const data = schema.parse(req.body);

    const returnRequest = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        refundAmount: data.refundAmount,
        restockQty: data.restockQty,
        processedBy: data.processedBy
      }
    });

    // Restock inventory if productId provided
    if (data.productId && data.restockQty) {
      const product = await prisma.productInventory.findUnique({
        where: { id: data.productId }
      });

      if (product) {
        const newQty = product.currentStock + data.restockQty;

        await prisma.$transaction([
          prisma.productInventory.update({
            where: { id: data.productId },
            data: {
              currentStock: newQty,
              availableStock: newQty - product.reservedStock,
              status: newQty > product.lowStockThreshold ? "IN_STOCK" : "LOW_STOCK"
            }
          }),
          prisma.stockMovement.create({
            data: {
              productId: data.productId,
              movementType: "RETURN",
              quantity: data.restockQty,
              reference: returnRequest.rmaNumber || undefined,
              reason: "Customer return",
              performedBy: data.processedBy,
              previousQty: product.currentStock,
              newQty
            }
          })
        ]);
      }
    }

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Mark as refunded
router.post("/:id/refund", async (req, res) => {
  try {
    const schema = z.object({
      refundAmount: z.number(),
      processedBy: z.string()
    });

    const data = schema.parse(req.body);

    const returnRequest = await prisma.returnRequest.update({
      where: { id: req.params.id },
      data: {
        status: "REFUNDED",
        refundAmount: data.refundAmount,
        completedAt: new Date(),
        processedBy: data.processedBy
      }
    });

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get return statistics
router.get("/stats/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusStats, recentReturns, totalRefunded] = await Promise.all([
      prisma.returnRequest.groupBy({
        by: ["status"],
        where: {
          shopeeOrder: { shopId }
        },
        _count: true
      }),
      prisma.returnRequest.count({
        where: {
          shopeeOrder: { shopId },
          requestedAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.returnRequest.aggregate({
        where: {
          shopeeOrder: { shopId },
          status: "REFUNDED"
        },
        _sum: { refundAmount: true }
      })
    ]);

    res.json({
      statusStats,
      last30Days: recentReturns,
      totalRefunded: totalRefunded._sum.refundAmount || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
