import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// Get notification channels
router.get("/channels/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    const channels = await prisma.notificationChannel.findMany({
      where: { shopId },
      include: {
        _count: { select: { notifications: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(channels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification channel
router.post("/channels", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      type: z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"]),
      isActive: z.boolean().default(true),
      config: z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        webhookUrl: z.string().url().optional(),
        slackChannel: z.string().optional(),
        discordWebhook: z.string().url().optional()
      })
    });

    const data = schema.parse(req.body);

    const channel = await prisma.notificationChannel.create({
      data
    });

    res.json(channel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update notification channel
router.put("/channels/:id", async (req, res) => {
  try {
    const channel = await prisma.notificationChannel.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(channel);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete notification channel
router.delete("/channels/:id", async (req, res) => {
  try {
    await prisma.notificationChannel.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get notification rules
router.get("/rules/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    const rules = await prisma.notificationRule.findMany({
      where: { shopId },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    });

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification rule
router.post("/rules", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      name: z.string(),
      trigger: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
      isActive: z.boolean().default(true),
      conditions: z.any(),
      channelTypes: z.array(z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"])),
      cooldownMinutes: z.number().default(60)
    });

    const data = schema.parse(req.body);

    const rule = await prisma.notificationRule.create({
      data
    });

    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update notification rule
router.put("/rules/:id", async (req, res) => {
  try {
    const rule = await prisma.notificationRule.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json(rule);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete notification rule
router.delete("/rules/:id", async (req, res) => {
  try {
    await prisma.notificationRule.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Send notification manually
router.post("/send", async (req, res) => {
  try {
    const schema = z.object({
      shopId: z.string(),
      trigger: z.string(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      subject: z.string(),
      message: z.string(),
      channelTypes: z.array(z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"])),
      metadata: z.any().optional()
    });

    const data = schema.parse(req.body);

    const channels = await prisma.notificationChannel.findMany({
      where: {
        shopId: data.shopId,
        type: { in: data.channelTypes },
        isActive: true
      }
    });

    const notifications = [];

    for (const channel of channels) {
      let success = false;
      let error = null;

      try {
        // Simulate sending notification (integrate real services here)
        if (channel.type === "EMAIL") {
          // await sendEmail(channel.config.email, data.subject, data.message);
          success = true;
        } else if (channel.type === "SLACK") {
          // await sendSlackMessage(channel.config.slackChannel, data.message);
          success = true;
        } else if (channel.type === "DISCORD") {
          // await sendDiscordMessage(channel.config.discordWebhook, data.message);
          success = true;
        } else if (channel.type === "WEBHOOK") {
          // await axios.post(channel.config.webhookUrl, { subject: data.subject, message: data.message });
          success = true;
        }
      } catch (err: any) {
        error = err.message;
      }

      const notification = await prisma.sentNotification.create({
        data: {
          channelId: channel.id,
          trigger: data.trigger,
          priority: data.priority,
          subject: data.subject,
          message: data.message,
          metadata: data.metadata,
          sentAt: new Date(),
          success,
          error
        }
      });

      notifications.push(notification);
    }

    res.json({ sent: notifications.length, notifications });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get notification history
router.get("/history", async (req, res) => {
  try {
    const { shopId, trigger, priority, limit = "50" } = req.query;

    const notifications = await prisma.sentNotification.findMany({
      where: {
        ...(trigger && { trigger: trigger as string }),
        ...(priority && { priority: priority as any }),
        channel: {
          ...(shopId && { shopId: shopId as string })
        }
      },
      include: {
        channel: {
          select: {
            type: true,
            shopId: true
          }
        }
      },
      orderBy: { sentAt: "desc" },
      take: parseInt(limit as string)
    });

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Test notification channel
router.post("/test/:channelId", async (req, res) => {
  try {
    const { channelId } = req.params;

    const channel = await prisma.notificationChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const testMessage = `Test notification from AutoShip X - ${new Date().toISOString()}`;

    let success = false;
    let error = null;

    try {
      // Simulate sending (integrate real services)
      if (channel.type === "EMAIL") {
        success = true;
      } else if (channel.type === "WEBHOOK") {
        success = true;
      }
    } catch (err: any) {
      error = err.message;
    }

    const notification = await prisma.sentNotification.create({
      data: {
        channelId: channel.id,
        trigger: "TEST",
        priority: "LOW",
        subject: "Test Notification",
        message: testMessage,
        sentAt: new Date(),
        success,
        error
      }
    });

    res.json({ success, notification });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
