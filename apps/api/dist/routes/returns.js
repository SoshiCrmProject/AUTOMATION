"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all return requests
router.get("/", async (req, res) => {
    try {
        const { shopId, status, limit = "50" } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (shopId) {
            where.shopeeOrder = { shopId: shopId };
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
            take: parseInt(limit)
        });
        res.json(returns);
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create return request
router.post("/", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopeeOrderId: zod_1.z.string(),
            reason: zod_1.z.string(),
            customerMessage: zod_1.z.string().optional(),
            attachments: zod_1.z.array(zod_1.z.string()).default([])
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Approve return
router.post("/:id/approve", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            refundAmount: zod_1.z.number().optional(),
            restockQty: zod_1.z.number().int().optional(),
            internalNotes: zod_1.z.string().optional(),
            processedBy: zod_1.z.string()
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Reject return
router.post("/:id/reject", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            internalNotes: zod_1.z.string(),
            processedBy: zod_1.z.string()
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Complete return with refund and restock
router.post("/:id/complete", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            refundAmount: zod_1.z.number(),
            restockQty: zod_1.z.number().int().optional(),
            productId: zod_1.z.string().optional(),
            processedBy: zod_1.z.string()
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Mark as refunded
router.post("/:id/refund", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            refundAmount: zod_1.z.number(),
            processedBy: zod_1.z.string()
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
