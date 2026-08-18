/**
 * SECURITY: Zod schemas for chat validation
 * Prevents SQL injection, type confusion, and oversized payloads
 */

import { z } from "zod";

// Message part validation
export const ChatPartSchema = z.object({
  type: z.enum(["text", "file", "tool-call", "tool-result"]),
  text: z.string().optional(),
  url: z.string().url().optional(),
  filename: z.string().optional(),
});

// Chat message from database
export const ChatMessageDBSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(ChatPartSchema).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional(),
  deleted_at: z.string().datetime().optional().nullable(),
});

// Saved message (what we return to the UI)
export const MensagemSalvaSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "assistant"]),
  texto: z.string().max(50000), // Limit size to prevent DoS
});

// Message input validation
export const SendMessageInputSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(10000, "Message too long (max 10,000 characters)"),
  parts: z.array(ChatPartSchema).optional().default([]),
  profile: z.enum(["conservador", "moderado", "agressivo"]).optional(),
  citationsEnabled: z.boolean().optional().default(false),
});

// Filter schema for querying messages
export const ChatMessageFilterSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  role: z.enum(["user", "assistant"]).optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

// Clear conversation input
export const ClearConversationInputSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

// Type exports
export type ChatPart = z.infer<typeof ChatPartSchema>;
export type ChatMessageDB = z.infer<typeof ChatMessageDBSchema>;
export type MensagemSalva = z.infer<typeof MensagemSalvaSchema>;
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;
export type ChatMessageFilter = z.infer<typeof ChatMessageFilterSchema>;
export type ClearConversationInput = z.infer<typeof ClearConversationInputSchema>;
