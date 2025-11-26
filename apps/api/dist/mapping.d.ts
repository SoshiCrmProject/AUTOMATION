import { z } from "zod";
export declare const mappingSchemas: {
    create: z.ZodObject<{
        shopId: z.ZodString;
        shopeeItemId: z.ZodString;
        amazonProductUrl: z.ZodString;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    importCsv: z.ZodObject<{
        rows: z.ZodArray<z.ZodObject<{
            shopId: z.ZodString;
            shopeeItemId: z.ZodString;
            amazonProductUrl: z.ZodString;
            notes: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
};
export declare function listMappings(userId: string): Promise<{
    id: string;
    shopId: string;
    shopeeItemId: string;
    amazonProductUrl: string;
    notes: string | null;
}[]>;
export declare function upsertMapping(userId: string, data: z.infer<typeof mappingSchemas.create>): Promise<{
    shopId: string;
    shopeeItemId: string;
    amazonProductUrl: string;
    notes: string | null;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    lastCheckedAt: Date | null;
}>;
export declare function importMappings(userId: string, rows: {
    shopId: string;
    shopeeItemId: string;
    amazonProductUrl: string;
    notes?: string;
}[]): Promise<void>;
