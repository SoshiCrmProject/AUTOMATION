import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get all customers
router.get("/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const { tier, search, limit = "50", offset = "0" } = req.query;

    const where: any = { shopId };
    if (tier) where.tier = tier;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { interactions: true } }
        },
        orderBy: { totalSpent: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({ customers, total, limit: parseInt(limit as string), offset: parseInt(offset as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer details
router.get("/detail/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update customer
router.post("/", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      shopeeUserId: z.string().optional(),
      email: z.string().email().optional(),
      name: z.string(),
      phone: z.string().optional(),
      tags: z.array(z.string()).default([]),
      notes: z.string().optional()
    });

    const data = schema.parse(req.body);

    const customer = await prisma.customer.upsert({
      where: {
        shopId_shopeeUserId: {
          shopId: data.shopId,
          shopeeUserId: data.shopeeUserId || ""
        }
      },
      create: data,
      update: data
    });

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update customer
router.put("/:id", async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add interaction
router.post("/:id/interactions", async (req, res) => {
  try {
    const schema = z.object({
      type: z.string(),
      channel: z.string(),
      subject: z.string().optional(),
      message: z.string(),
      sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
      assignedTo: z.string().optional()
    });

    const data = schema.parse(req.body);

    const interaction = await prisma.customerInteraction.create({
      data: {
        customerId: req.params.id,
        ...data
      }
    });

    res.json(interaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Resolve interaction
router.post("/interactions/:id/resolve", async (req, res) => {
  try {
    const interaction = await prisma.customerInteraction.update({
      where: { id: req.params.id },
      data: { resolvedAt: new Date() }
    });

    res.json(interaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add loyalty points
router.post("/:id/loyalty", async (req, res) => {
  try {
    const schema = z.object({
      points: z.number().int(),
      reason: z.string().optional()
    });

    const { points } = schema.parse(req.body);

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        loyaltyPoints: { increment: points }
      }
    });

    // Update tier based on total spent
    let newTier = "BRONZE";
    const totalSpent = Number(customer.totalSpent);
    if (totalSpent >= 1000000) newTier = "PLATINUM";
    else if (totalSpent >= 500000) newTier = "GOLD";
    else if (totalSpent >= 100000) newTier = "SILVER";

    if (newTier !== customer.tier) {
      await prisma.customer.update({
        where: { id: req.params.id },
        data: { tier: newTier }
      });
    }

    res.json({ ...customer, tier: newTier });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get customer stats
router.get("/stats/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    const [tierStats, topCustomers, recentInteractions] = await Promise.all([
      prisma.customer.groupBy({
        by: ["tier"],
        where: { shopId },
        _count: true,
        _sum: { totalSpent: true }
      }),
      prisma.customer.findMany({
        where: { shopId },
        orderBy: { totalSpent: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          totalSpent: true,
          totalOrders: true,
          tier: true
        }
      }),
      prisma.customerInteraction.findMany({
        where: {
          customer: { shopId },
          resolvedAt: null
        },
        include: {
          customer: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 20
      })
    ]);

    res.json({
      tierStats,
      topCustomers,
      unresolvedInteractions: recentInteractions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Blacklist customer
router.post("/:id/blacklist", async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { isBlacklisted: true }
    });

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Remove from blacklist
router.post("/:id/unblacklist", async (req, res) => {
  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { isBlacklisted: false }
    });

    res.json(customer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
