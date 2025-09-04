// lib/socials/schemas.ts
import { z } from "zod";

export const socialLinkCreateSchema = z.object({
  url: z.string().url().max(300),
  label: z.string().trim().max(30).optional(),
  visible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export const socialLinkUpdateSchema = z.object({
  url: z.string().url().max(300).optional(),
  label: z.string().trim().max(30).optional(),
  visible: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});