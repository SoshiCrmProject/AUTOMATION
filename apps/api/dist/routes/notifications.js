"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create notification channel
router.post("/channels", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            type: zod_1.z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"]),
            isActive: zod_1.z.boolean().default(true),
            config: zod_1.z.object({
                email: zod_1.z.string().email().optional(),
                phone: zod_1.z.string().optional(),
                webhookUrl: zod_1.z.string().url().optional(),
                slackChannel: zod_1.z.string().optional(),
                discordWebhook: zod_1.z.string().url().optional()
            })
        });
        const data = schema.parse(req.body);
        const channel = await prisma.notificationChannel.create({
            data
        });
        res.json(channel);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Create notification rule
router.post("/rules", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            name: zod_1.z.string(),
            trigger: zod_1.z.string(),
            priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
            isActive: zod_1.z.boolean().default(true),
            conditions: zod_1.z.any(),
            channelTypes: zod_1.z.array(zod_1.z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"])),
            cooldownMinutes: zod_1.z.number().default(60)
        });
        const data = schema.parse(req.body);
        const rule = await prisma.notificationRule.create({
            data
        });
        res.json(rule);
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Send notification manually
router.post("/send", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            shopId: zod_1.z.string(),
            trigger: zod_1.z.string(),
            priority: zod_1.z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
            subject: zod_1.z.string(),
            message: zod_1.z.string(),
            channelTypes: zod_1.z.array(zod_1.z.enum(["EMAIL", "SMS", "SLACK", "DISCORD", "WEBHOOK"])),
            metadata: zod_1.z.any().optional()
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
                }
                else if (channel.type === "SLACK") {
                    // await sendSlackMessage(channel.config.slackChannel, data.message);
                    success = true;
                }
                else if (channel.type === "DISCORD") {
                    // await sendDiscordMessage(channel.config.discordWebhook, data.message);
                    success = true;
                }
                else if (channel.type === "WEBHOOK") {
                    // await axios.post(channel.config.webhookUrl, { subject: data.subject, message: data.message });
                    success = true;
                }
            }
            catch (err) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Get notification history
router.get("/history", async (req, res) => {
    try {
        const { shopId, trigger, priority, limit = "50" } = req.query;
        const notifications = await prisma.sentNotification.findMany({
            where: {
                ...(trigger && { trigger: trigger }),
                ...(priority && { priority: priority }),
                channel: {
                    ...(shopId && { shopId: shopId })
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
            take: parseInt(limit)
        });
        res.json(notifications);
    }
    catch (error) {
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
            }
            else if (channel.type === "WEBHOOK") {
                success = true;
            }
        }
        catch (err) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
