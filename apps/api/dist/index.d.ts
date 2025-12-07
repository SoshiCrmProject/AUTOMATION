import { PrismaClient, Prisma } from "@prisma/client";
declare const app: import("express-serve-static-core").Express;
export declare const prisma: PrismaClient<Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default app;
