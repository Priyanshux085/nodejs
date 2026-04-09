/**
 * handler.ts – EmailController implementation
 *
 * Each handler method:
 *  1. Extracts the validated request body (Zod validation runs in the route)
 *  2. Delegates to the EmailService
 *  3. Returns a standardised success or error response
 *
 * Error handling differentiates between validation-style errors (400)
 * and unexpected infrastructure errors (500).
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { sendSuccess, sendError } from "@/lib/response";
import { emailService } from "@/modules/email";
import type {
  SendSimpleEmailBody,
  SendTemplateEmailBody,
  SendBulkEmailBody,
} from "@/schemas/email.schema";
import type {
  IEmailController,
  TEmailSendResponse,
  TBulkEmailSendResponse,
} from "./definition";

export class EmailController implements IEmailController {
  // -------------------------------------------------------------------------
  // Scenario 1 – POST /api/email/send
  // -------------------------------------------------------------------------

  /**
   * Handles simple transactional email requests.
   *
   * Expects a `to` address (or array), `subject`, and at least one of
   * `text` or `html` in the request body (enforced by Zod schema).
   *
   * Example use-cases: account activity alerts, password-reset links,
   * ad-hoc notifications that don't need a branded template.
   */
  async sendSimpleEmailHandler(
    request: FastifyRequest<{ Body: SendSimpleEmailBody }>,
    reply: FastifyReply,
  ): Promise<TEmailSendResponse | void> {
    try {
      const result = await emailService.sendSimpleEmail(request.body);

      return sendSuccess({
        reply,
        statusCode: 200,
        message: "Email sent successfully",
        data: result,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";

      return sendError({
        reply,
        statusCode: 500,
        message: "Failed to send email",
        error,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Scenario 2 – POST /api/email/send-template
  // -------------------------------------------------------------------------

  /**
   * Handles template-based email requests.
   *
   * The `templateData` body field is a discriminated union on the `template`
   * field, selecting one of: "welcome" | "otp" | "notification".
   * The EmailService renders the appropriate HTML template server-side and
   * falls back to an auto-generated plain-text version.
   *
   * Example use-cases:
   *  – "welcome"      → on-boarding email with branded CTA button
   *  – "otp"          → two-factor auth code with digit boxes
   *  – "notification" → styled report email with optional data table
   */
  async sendTemplateEmailHandler(
    request: FastifyRequest<{ Body: SendTemplateEmailBody }>,
    reply: FastifyReply,
  ): Promise<TEmailSendResponse | void> {
    try {
      const result = await emailService.sendTemplateEmail(request.body);

      return sendSuccess({
        reply,
        statusCode: 200,
        message: `Template email ('${request.body.templateData.template}') sent successfully`,
        data: result,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";

      return sendError({
        reply,
        statusCode: 500,
        message: "Failed to send template email",
        error,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Scenario 3 – POST /api/email/send-bulk
  // -------------------------------------------------------------------------

  /**
   * Handles bulk email requests (multiple recipients + attachments).
   *
   * Attachments are expected as Base64-encoded content strings.
   * The EmailService decodes them into Buffers before handing them
   * to nodemailer, so the API surface stays JSON-native.
   *
   * The response includes enriched counters (`totalRecipients`,
   * `rejectedCount`) so callers can detect partial delivery failures.
   *
   * Example use-cases: weekly digest reports, invoice delivery,
   * broadcast announcements with supporting PDF attachments.
   */
  async sendBulkEmailHandler(
    request: FastifyRequest<{ Body: SendBulkEmailBody }>,
    reply: FastifyReply,
  ): Promise<TBulkEmailSendResponse | void> {
    try {
      const { to, cc = [], bcc = [] } = request.body;
      const result = await emailService.sendBulkEmail(request.body);

      const totalRecipients = to.length + cc.length + bcc.length;
      const rejectedCount = result.rejected.length;

      return sendSuccess({
        reply,
        statusCode: 200,
        message:
          rejectedCount > 0
            ? `Bulk email sent with ${rejectedCount} rejected address(es)`
            : "Bulk email sent successfully",
        data: {
          ...result,
          totalRecipients,
          rejectedCount,
        },
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error";

      return sendError({
        reply,
        statusCode: 500,
        message: "Failed to send bulk email",
        error,
      });
    }
  }
}

/** Singleton controller instance used by the route registration. */
export const emailController = new EmailController();
