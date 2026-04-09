/**
 * email.schema.ts
 *
 * Zod validation schemas for the three email API endpoints.
 *
 * Endpoint  Route                         Schema
 * --------  ----------------------------  -----------------------------------
 * POST      /api/email/send               sendSimpleEmailSchema
 * POST      /api/email/send-template      sendTemplateEmailSchema
 * POST      /api/email/send-bulk          sendBulkEmailSchema
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** RFC-5321 email address with reasonable length limits */
const emailStr = z.string().email("Invalid email address").max(254);

/** Non-empty subject line */
const subjectStr = z.string().min(1, "Subject is required").max(200);

// ---------------------------------------------------------------------------
// Scenario 1 – Simple Email
// ---------------------------------------------------------------------------

export const sendSimpleEmailBody = z
  .object({
    /** Recipient: single address or array of addresses (max 50) */
    to: z.union([emailStr, z.array(emailStr).min(1).max(50)]),
    subject: subjectStr,
    /** Plain-text body */
    text: z.string().max(50_000).optional(),
    /** HTML body */
    html: z.string().max(200_000).optional(),
    /** Override the default From address */
    from: emailStr.optional(),
    /** Reply-To address */
    replyTo: emailStr.optional(),
  })
  .refine((v) => v.text !== undefined || v.html !== undefined, {
    message: "At least one of 'text' or 'html' must be provided",
    path: ["text"],
  });

export type SendSimpleEmailBody = z.infer<typeof sendSimpleEmailBody>;

export const sendSimpleEmailSchema = {
  body: sendSimpleEmailBody,
  response: {
    200: z.object({
      ok: z.boolean(),
      status: z.number(),
      message: z.string(),
      data: z.object({
        messageId: z.string(),
        accepted: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        rejected: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        smtpResponse: z.string(),
      }),
    }),
    400: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
    500: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
  },
};

// ---------------------------------------------------------------------------
// Scenario 2 – Template Email
// ---------------------------------------------------------------------------

/**
 * Discriminated union of template payloads.
 * Validated by the `template` field value.
 */
const templatePayload = z.discriminatedUnion("template", [
  // Welcome template
  z.object({
    template: z.literal("welcome"),
    name: z.string().min(1).max(100),
    ctaUrl: z.string().url(),
    ctaLabel: z.string().max(50).optional(),
    appName: z.string().max(100).optional(),
  }),
  // OTP template
  z.object({
    template: z.literal("otp"),
    name: z.string().min(1).max(100),
    otp: z
      .string()
      .min(4)
      .max(8)
      .regex(/^\d+$/, "OTP must contain only digits"),
    expiresInMinutes: z.number().int().min(1).max(60).optional(),
    appName: z.string().max(100).optional(),
  }),
  // Notification template
  z.object({
    template: z.literal("notification"),
    name: z.string().min(1).max(100),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    items: z
      .array(
        z.object({
          label: z.string().min(1).max(100),
          value: z.string().max(500),
        }),
      )
      .max(20)
      .optional(),
    appName: z.string().max(100).optional(),
  }),
]);

export const sendTemplateEmailBody = z.object({
  to: z.union([emailStr, z.array(emailStr).min(1).max(50)]),
  subject: subjectStr,
  templateData: templatePayload,
  from: emailStr.optional(),
  replyTo: emailStr.optional(),
});

export type SendTemplateEmailBody = z.infer<typeof sendTemplateEmailBody>;

export const sendTemplateEmailSchema = {
  body: sendTemplateEmailBody,
  response: {
    200: z.object({
      ok: z.boolean(),
      status: z.number(),
      message: z.string(),
      data: z.object({
        messageId: z.string(),
        accepted: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        rejected: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        smtpResponse: z.string(),
      }),
    }),
    400: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
    500: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
  },
};

// ---------------------------------------------------------------------------
// Scenario 3 – Bulk Email with Attachments
// ---------------------------------------------------------------------------

const attachmentSchema = z.object({
  /** Filename shown to the recipient */
  filename: z.string().min(1).max(255),
  /**
   * File contents encoded as a Base64 string.
   * Max decoded size ~10 MB (Base64 overhead ~33%: 13.6M chars ≈ 10 MB).
   */
  content: z.string().min(1).max(13_600_000),
  /** MIME content type, e.g. "application/pdf" */
  contentType: z.string().max(100).optional(),
});

export const sendBulkEmailBody = z
  .object({
    /** Primary recipients (1–200) */
    to: z.array(emailStr).min(1).max(200),
    /** CC addresses */
    cc: z.array(emailStr).max(50).optional(),
    /** BCC addresses */
    bcc: z.array(emailStr).max(50).optional(),
    subject: subjectStr,
    text: z.string().max(50_000).optional(),
    html: z.string().max(200_000).optional(),
    /** Up to 10 file attachments */
    attachments: z.array(attachmentSchema).max(10).optional(),
    from: emailStr.optional(),
    replyTo: emailStr.optional(),
  })
  .refine((v) => v.text !== undefined || v.html !== undefined, {
    message: "At least one of 'text' or 'html' must be provided",
    path: ["text"],
  });

export type SendBulkEmailBody = z.infer<typeof sendBulkEmailBody>;

export const sendBulkEmailSchema = {
  body: sendBulkEmailBody,
  response: {
    200: z.object({
      ok: z.boolean(),
      status: z.number(),
      message: z.string(),
      data: z.object({
        messageId: z.string(),
        accepted: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        rejected: z.array(z.union([z.string(), z.object({ name: z.string(), address: z.string() })])),
        smtpResponse: z.string(),
        totalRecipients: z.number(),
        rejectedCount: z.number(),
      }),
    }),
    400: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
    500: z.object({ ok: z.boolean(), status: z.number(), message: z.string(), error: z.string().optional() }),
  },
};
