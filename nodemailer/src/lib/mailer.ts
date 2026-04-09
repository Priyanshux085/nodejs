/**
 * mailer.ts
 *
 * Core nodemailer transporter setup and configuration.
 * Reads SMTP settings from environment variables and exports a
 * pre-configured, reusable transporter instance along with a
 * type-safe `sendMail` helper.
 *
 * Required environment variables:
 *   SMTP_HOST     - SMTP server hostname (e.g. smtp.gmail.com)
 *   SMTP_PORT     - SMTP server port    (e.g. 587 or 465)
 *   SMTP_SECURE   - "true" for TLS (port 465), "false" for STARTTLS
 *   SMTP_USER     - SMTP auth username / email address
 *   SMTP_PASS     - SMTP auth password or app-specific password
 *   SMTP_FROM     - Default "From" address shown to recipients
 */

import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";

// ---------------------------------------------------------------------------
// Config – resolved once at startup
// ---------------------------------------------------------------------------

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

/**
 * Reads and validates SMTP config from environment variables.
 * Throws early (at startup) if required vars are missing.
 */
function resolveSmtpConfig(): SmtpConfig {
  const host = process.env["SMTP_HOST"];
  const portStr = process.env["SMTP_PORT"];
  const secureStr = process.env["SMTP_SECURE"] ?? "false";
  const user = process.env["SMTP_USER"];
  const pass = process.env["SMTP_PASS"];
  const from = process.env["SMTP_FROM"];

  const missing = [
    !host && "SMTP_HOST",
    !portStr && "SMTP_PORT",
    !user && "SMTP_USER",
    !pass && "SMTP_PASS",
    !from && "SMTP_FROM",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `[mailer] Missing required environment variable(s): ${missing.join(", ")}`,
    );
  }

  const port = parseInt(portStr as string, 10);
  if (Number.isNaN(port)) {
    throw new Error(`[mailer] SMTP_PORT must be a valid integer, got: ${portStr}`);
  }

  return {
    host: host as string,
    port,
    secure: secureStr === "true",
    user: user as string,
    pass: pass as string,
    from: from as string,
  };
}

// ---------------------------------------------------------------------------
// Transporter – singleton
// ---------------------------------------------------------------------------

let _transporter: Transporter | null = null;

/**
 * Returns (or lazily creates) the singleton nodemailer Transporter.
 * Deferred creation means misconfigured env vars surface only when the
 * mailer is first used, not at import time — useful during testing.
 */
export function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const cfg = resolveSmtpConfig();

  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    // Pool connections for better throughput on bulk sends
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Reasonable timeouts
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 30_000,
  });

  return _transporter;
}

/**
 * Verifies that the SMTP connection is live.
 * Call this during application startup to fail fast if SMTP is unreachable.
 */
export async function verifyMailerConnection(): Promise<void> {
  const transporter = getTransporter();
  await transporter.verify();
}

// ---------------------------------------------------------------------------
// Default "From" address
// ---------------------------------------------------------------------------

/**
 * Returns the configured default sender address.
 * E.g. `"My App <noreply@example.com>"`
 */
export function getDefaultFrom(): string {
  const cfg = resolveSmtpConfig();
  return cfg.from;
}

// ---------------------------------------------------------------------------
// Type-safe send helper
// ---------------------------------------------------------------------------

export interface MailPayload extends Omit<SendMailOptions, "from"> {
  /** Overrides the default SMTP_FROM when provided */
  from?: string;
}

export interface MailResult {
  messageId: string;
  accepted: (string | { name: string; address: string })[];
  rejected: (string | { name: string; address: string })[];
  response: string;
}

/**
 * Sends a single email through the shared transporter.
 * Automatically injects the `from` address if not supplied.
 *
 * @param payload - Nodemailer mail options (to, subject, html, text, …)
 * @returns Structured result with messageId and delivery status
 */
export async function sendMail(payload: MailPayload): Promise<MailResult> {
  const transporter = getTransporter();
  const from = payload.from ?? getDefaultFrom();

  const info = await transporter.sendMail({ ...payload, from });

  return {
    messageId: info.messageId as string,
    accepted: info.accepted as MailResult["accepted"],
    rejected: info.rejected as MailResult["rejected"],
    response: info.response as string,
  };
}
