import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get daily metrics
router.get("/daily", async (req, res) => {
  try {
    const { shopId, startDate, endDate } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const metrics = await prisma.dailyMetrics.findMany({
      where,
      orderBy: { date: "desc" },
      take: 90 // Last 90 days by default
    });

    // Calculate aggregates
    const aggregates = await prisma.dailyMetrics.aggregate({
      where,
      _sum: {
        totalOrders: true,
        successfulOrders: true,
        failedOrders: true,
        totalRevenue: true,
        totalProfit: true,
        totalShippingCost: true
      },
      _avg: {
        avgProfit: true,
        avgShippingDays: true,
        errorRate: true,
        conversionRate: true
      }
    });

    res.json({ metrics, aggregates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard overview
router.get("/dashboard", async (req, res) => {
  try {
    const { shopId } = req.query;
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Today's metrics
    const todayMetrics = await prisma.dailyMetrics.findFirst({
      where: {
        ...(shopId && { shopId: shopId as string }),
        date: {
          gte: new Date(today.toISOString().split('T')[0]),
          lt: new Date(new Date(today.toISOString().split('T')[0]).getTime() + 86400000)
        }
      }
    });

    // Last 7 days
    const weekMetrics = await prisma.dailyMetrics.aggregate({
      where: {
        ...(shopId && { shopId: shopId as string }),
        date: { gte: sevenDaysAgo }
      },
      _sum: {
        totalOrders: true,
        successfulOrders: true,
        failedOrders: true,
        totalRevenue: true,
        totalProfit: true
      },
      _avg: {
        errorRate: true,
        conversionRate: true
      }
    });

    // Last 30 days
    const monthMetrics = await prisma.dailyMetrics.aggregate({
      where: {
        ...(shopId && { shopId: shopId as string }),
        date: { gte: thirtyDaysAgo }
      },
      _sum: {
        totalOrders: true,
        totalRevenue: true,
        totalProfit: true
      }
    });

    // Current inventory status
    const inventoryStats = await prisma.productInventory.groupBy({
      by: ["status"],
      ...(shopId && { where: { shopId: shopId as string } }),
      _count: true,
      _sum: { currentStock: true }
    });

    // Active alerts
    const activeAlerts = await prisma.lowStockAlert.count({
      where: {
        resolvedAt: null,
        ...(shopId && { product: { shopId: shopId as string } })
      }
    });

    // Recent errors
    const recentErrors = await prisma.errorItem.count({
      where: {
        ...(shopId && { shopId: shopId as string }),
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // Pending returns
    const pendingReturns = await prisma.returnRequest.count({
      where: {
        status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] }
      }
    });

    res.json({
      today: todayMetrics,
      week: weekMetrics,
      month: monthMetrics,
      inventory: inventoryStats,
      alerts: {
        lowStock: activeAlerts,
        errors: recentErrors,
        returns: pendingReturns
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get profit trends
router.get("/profit-trends", async (req, res) => {
  try {
    const { shopId, days = "30" } = req.query;
    const daysAgo = new Date(Date.now() - parseInt(days as string) * 24 * 60 * 60 * 1000);

    const trends = await prisma.dailyMetrics.findMany({
      where: {
        ...(shopId && { shopId: shopId as string }),
        date: { gte: daysAgo }
      },
      select: {
        date: true,
        totalRevenue: true,
        totalProfit: true,
        avgProfit: true,
        totalOrders: true,
        successfulOrders: true
      },
      orderBy: { date: "asc" }
    });

    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get product performance
router.get("/products/performance", async (req, res) => {
  try {
    const { shopId, limit = "20" } = req.query;

    const topProducts = await prisma.productMapping.findMany({
      where: {
        isActive: true,
        ...(shopId && { product: { shopId: shopId as string } })
      },
      orderBy: [
        { performanceScore: "desc" },
        { avgProfit: "desc" }
      ],
      take: parseInt(limit as string),
      include: {
        product: {
          select: {
            productName: true,
            currentStock: true,
            sellingPrice: true
          }
        }
      }
    });

    res.json(topProducts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get sales forecast
router.get("/forecast", async (req, res) => {
  try {
    const { shopId, days = "7" } = req.query;
    const lookbackDays = 30;
    const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    // Get historical data
    const historical = await prisma.dailyMetrics.findMany({
      where: {
        ...(shopId && { shopId: shopId as string }),
        date: { gte: lookbackDate }
      },
      select: {
        totalOrders: true,
        totalRevenue: true,
        totalProfit: true
      },
      orderBy: { date: "asc" }
    });

    if (historical.length === 0) {
      return res.json({ forecast: [], confidence: 0 });
    }

    // Simple moving average forecast
    const avgOrders = historical.reduce((sum, d) => sum + d.totalOrders, 0) / historical.length;
    const avgRevenue = historical.reduce((sum, d) => sum + Number(d.totalRevenue), 0) / historical.length;
    const avgProfit = historical.reduce((sum, d) => sum + Number(d.totalProfit), 0) / historical.length;

    const forecastDays = parseInt(days as string);
    const forecast = [];
    
    for (let i = 1; i <= forecastDays; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedOrders: Math.round(avgOrders),
        predictedRevenue: Math.round(avgRevenue),
        predictedProfit: Math.round(avgProfit),
        confidence: Math.max(0.5, 1 - (i / forecastDays) * 0.3) // Decreasing confidence
      });
    }

    res.json({ forecast, historical: historical.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Export analytics report
router.get("/export", async (req, res) => {
  try {
    const { shopId, startDate, endDate, format = "csv" } = req.query;

    const where: any = {};
    if (shopId) where.shopId = shopId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const data = await prisma.dailyMetrics.findMany({
      where,
      orderBy: { date: "asc" }
    });

    if (format === "csv") {
      const csv = [
        "Date,Total Orders,Successful,Failed,Revenue,Profit,Shipping Cost,Avg Profit,Avg Shipping Days,Error Rate,Conversion Rate",
        ...data.map(d => 
          `${d.date.toISOString().split('T')[0]},${d.totalOrders},${d.successfulOrders},${d.failedOrders},${d.totalRevenue},${d.totalProfit},${d.totalShippingCost},${d.avgProfit || 0},${d.avgShippingDays || 0},${d.errorRate || 0},${d.conversionRate || 0}`
        )
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=analytics-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
