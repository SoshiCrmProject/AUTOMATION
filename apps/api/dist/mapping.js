"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mappingSchemas = void 0;
exports.listMappings = listMappings;
exports.upsertMapping = upsertMapping;
exports.importMappings = importMappings;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
exports.mappingSchemas = {
    create: zod_1.z.object({
        shopId: zod_1.z.string(),
        shopeeItemId: zod_1.z.string(),
        amazonProductUrl: zod_1.z.string().url(),
        notes: zod_1.z.string().optional()
    }),
    importCsv: zod_1.z.object({
        rows: zod_1.z.array(zod_1.z.object({
            shopId: zod_1.z.string(),
            shopeeItemId: zod_1.z.string(),
            amazonProductUrl: zod_1.z.string().url(),
            notes: zod_1.z.string().optional()
        }))
    })
};
async function listMappings(userId) {
    const shops = await prisma.shop.findMany({ where: { ownerId: userId }, select: { id: true, name: true } });
    const selections = await prisma.autoShippingShopSelection.findMany({
        where: { shopId: { in: shops.map((s) => s.id) }, isActive: true },
        orderBy: [{ shopId: "asc" }, { shopeeItemId: "asc" }]
    });
    return selections.map((sel) => ({
        id: sel.id,
        shopId: sel.shopId,
        shopeeItemId: sel.shopeeItemId,
        amazonProductUrl: sel.amazonProductUrl,
        notes: sel.notes
    }));
}
async function upsertMapping(userId, data) {
    const shop = await prisma.shop.findFirst({ where: { id: data.shopId, ownerId: userId } });
    if (!shop)
        throw new Error("Shop not found");
    return prisma.autoShippingShopSelection.upsert({
        where: { shopId_shopeeItemId: { shopId: data.shopId, shopeeItemId: data.shopeeItemId } },
        update: { amazonProductUrl: data.amazonProductUrl, notes: data.notes, isActive: true },
        create: {
            shopId: data.shopId,
            shopeeItemId: data.shopeeItemId,
            amazonProductUrl: data.amazonProductUrl,
            notes: data.notes,
            isActive: true
        }
    });
}
async function importMappings(userId, rows) {
    for (const row of rows) {
        const shop = await prisma.shop.findFirst({ where: { id: row.shopId, ownerId: userId } });
        if (!shop)
            continue;
        await prisma.autoShippingShopSelection.upsert({
            where: { shopId_shopeeItemId: { shopId: row.shopId, shopeeItemId: row.shopeeItemId } },
            update: { amazonProductUrl: row.amazonProductUrl, notes: row.notes, isActive: true },
            create: {
                shopId: row.shopId,
                shopeeItemId: row.shopeeItemId,
                amazonProductUrl: row.amazonProductUrl,
                notes: row.notes,
                isActive: true
            }
        });
    }
}
