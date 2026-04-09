/**
 * index.ts – Email API route registrations
 *
 * Registers three POST endpoints under the /email prefix:
 *
 *   POST /api/email/send           → Scenario 1: plain transactional email
 *   POST /api/email/send-template  → Scenario 2: HTML template email
 *   POST /api/email/send-bulk      → Scenario 3: bulk email with attachments
 *
 * The `autoLoad` plugin in server.ts automatically discovers this file
 * via the directory convention, so no manual import is needed.
 */

import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import * as schema from "@/schemas/email.schema";
import { emailController } from "./handler";

export default async function emailRoute(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // -------------------------------------------------------------------------
  // POST /api/email/send
  // Scenario 1 – Plain transactional email (text / html body)
  // -------------------------------------------------------------------------
  f.post("/send", {
    schema: schema.sendSimpleEmailSchema,
    handler: (req, reply) =>
      emailController.sendSimpleEmailHandler(
        req as Parameters<typeof emailController.sendSimpleEmailHandler>[0],
        reply,
      ),
  });

  // -------------------------------------------------------------------------
  // POST /api/email/send-template
  // Scenario 2 – Rendered HTML template email (welcome | otp | notification)
  // -------------------------------------------------------------------------
  f.post("/send-template", {
    schema: schema.sendTemplateEmailSchema,
    handler: (req, reply) =>
      emailController.sendTemplateEmailHandler(
        req as Parameters<typeof emailController.sendTemplateEmailHandler>[0],
        reply,
      ),
  });

  // -------------------------------------------------------------------------
  // POST /api/email/send-bulk
  // Scenario 3 – Bulk email with CC, BCC, and Base64 file attachments
  // -------------------------------------------------------------------------
  f.post("/send-bulk", {
    schema: schema.sendBulkEmailSchema,
    handler: (req, reply) =>
      emailController.sendBulkEmailHandler(
        req as Parameters<typeof emailController.sendBulkEmailHandler>[0],
        reply,
      ),
  });
}
