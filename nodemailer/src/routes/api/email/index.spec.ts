import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import emailRoute from "./index";

// ---------------------------------------------------------------------------
// Hoisted mock fixtures – safe to reference inside the vi.mock factory
// ---------------------------------------------------------------------------

const { mockSendResult, mockEmailService } = vi.hoisted(() => {
  const mockSendResult = {
    messageId: "<mock-message-id@test>",
    accepted: ["recipient@example.com"],
    rejected: [] as string[],
    smtpResponse: "250 OK",
  };

  const mockEmailService = {
    sendSimpleEmail: vi.fn().mockResolvedValue(mockSendResult),
    sendTemplateEmail: vi.fn().mockResolvedValue(mockSendResult),
    sendBulkEmail: vi.fn().mockResolvedValue(mockSendResult),
  };

  return { mockSendResult, mockEmailService };
});

// ---------------------------------------------------------------------------
// Mock the EmailService so no real SMTP connection is attempted
// ---------------------------------------------------------------------------

vi.mock("@/modules/email", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    emailService: mockEmailService,
  };
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Email API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();
    await app.register(emailRoute);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();

    // Restore the default resolved value after per-test overrides
    mockEmailService.sendSimpleEmail.mockResolvedValue(mockSendResult);
    mockEmailService.sendTemplateEmail.mockResolvedValue(mockSendResult);
    mockEmailService.sendBulkEmail.mockResolvedValue(mockSendResult);
  });

  // -------------------------------------------------------------------------
  // POST /send – Scenario 1: Simple / Transactional Email
  // -------------------------------------------------------------------------

  describe("POST /send", () => {
    it("should send a simple email and return 200 with standard envelope", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send",
        payload: {
          to: "test.priyanshu085@gmail.com",
          subject: "Test Email",
          text: "This is a test email",
          html: "<h1>This is a Test Email HTML CONTENT</h1>",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        ok: true,
        status: 200,
        message: "Email sent successfully",
      });
      expect(body).toHaveProperty("data");
      expect(body.data).toMatchObject({
        messageId: mockSendResult.messageId,
        smtpResponse: mockSendResult.smtpResponse,
      });
    });

    it("should call emailService.sendSimpleEmail with the correct payload", async () => {
      await app.inject({
        method: "POST",
        url: "/send",
        payload: {
          to: "user@example.com",
          subject: "Hello",
          text: "Hello world",
        },
      });

      expect(mockEmailService.sendSimpleEmail).toHaveBeenCalledOnce();
      expect(mockEmailService.sendSimpleEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Hello",
          text: "Hello world",
        }),
      );
    });

    it("should send to multiple recipients when `to` is an array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send",
        payload: {
          to: ["alice@example.com", "bob@example.com"],
          subject: "Multi-recipient",
          html: "<p>Hi everyone</p>",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockEmailService.sendSimpleEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ["alice@example.com", "bob@example.com"],
        }),
      );
    });

    it("should return 500 when emailService.sendSimpleEmail throws", async () => {
      mockEmailService.sendSimpleEmail.mockRejectedValueOnce(
        new Error("SMTP connection refused"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/send",
        payload: {
          to: "user@example.com",
          subject: "Hello",
          text: "Hello world",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toMatchObject({
        ok: false,
        status: 500,
        message: "Failed to send email",
        error: "SMTP connection refused",
      });
    });
  });

  // -------------------------------------------------------------------------
  // POST /send-template – Scenario 2: Template-based Email
  // -------------------------------------------------------------------------

  describe("POST /send-template", () => {
    it("should render and send a welcome template email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send-template",
        payload: {
          to: "newuser@example.com",
          subject: "Welcome aboard!",
          templateData: {
            template: "welcome",
            name: "Priyanshu",
            ctaUrl: "https://example.com/confirm?token=abc123",
            ctaLabel: "Confirm Email",
            appName: "NodeMailer Demo",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        ok: true,
        message: expect.stringContaining("welcome"),
      });
      expect(body.data).toHaveProperty("messageId");
    });

    it("should call emailService.sendTemplateEmail with the correct OTP payload", async () => {
      await app.inject({
        method: "POST",
        url: "/send-template",
        payload: {
          to: "user@example.com",
          subject: "Your OTP",
          templateData: {
            template: "otp",
            name: "Alice",
            otp: "482910",
            expiresInMinutes: 10,
          },
        },
      });

      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledOnce();
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Your OTP",
          templateData: expect.objectContaining({
            template: "otp",
            otp: "482910",
          }),
        }),
      );
    });

    it("should send an OTP template email and return 200", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send-template",
        payload: {
          to: "user@example.com",
          subject: "Your verification code",
          templateData: {
            template: "otp",
            name: "Bob",
            otp: "123456",
            expiresInMinutes: 5,
            appName: "SecureApp",
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data).toMatchObject({
        messageId: mockSendResult.messageId,
        accepted: mockSendResult.accepted,
      });
    });

    it("should send a notification template email with data table items", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send-template",
        payload: {
          to: "admin@example.com",
          subject: "Weekly Report",
          templateData: {
            template: "notification",
            name: "Admin",
            title: "Weekly Digest",
            description: "Here is your weekly activity summary.",
            items: [
              { label: "New Users", value: "42" },
              { label: "Emails Sent", value: "381" },
            ],
          },
        },
      });

      expect(response.statusCode).toBe(200);
      expect(mockEmailService.sendTemplateEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            template: "notification",
            items: expect.arrayContaining([
              { label: "New Users", value: "42" },
            ]),
          }),
        }),
      );
    });

    it("should return 500 when emailService.sendTemplateEmail throws", async () => {
      mockEmailService.sendTemplateEmail.mockRejectedValueOnce(
        new Error("Template rendering failed"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/send-template",
        payload: {
          to: "user@example.com",
          subject: "Fail case",
          templateData: {
            template: "welcome",
            name: "Dave",
            ctaUrl: "https://example.com",
          },
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toMatchObject({
        ok: false,
        message: "Failed to send template email",
        error: "Template rendering failed",
      });
    });
  });

  // -------------------------------------------------------------------------
  // POST /send-bulk – Scenario 3: Bulk Email with Attachments
  // -------------------------------------------------------------------------

  describe("POST /send-bulk", () => {
    it("should send a bulk email to multiple recipients and return 200", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send-bulk",
        payload: {
          to: ["alice@example.com", "bob@example.com", "carol@example.com"],
          cc: ["manager@example.com"],
          bcc: ["audit@example.com"],
          subject: "Monthly Report",
          html: "<h1>Monthly Sales Report</h1><p>Please find details below.</p>",
          text: "Monthly Sales Report - Please find details below.",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toMatchObject({
        ok: true,
        message: expect.stringContaining("Bulk email sent"),
      });
      expect(body.data).toHaveProperty("totalRecipients");
      expect(body.data).toHaveProperty("rejectedCount");
    });

    it("should compute totalRecipients as to + cc + bcc count", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/send-bulk",
        payload: {
          to: ["a@example.com", "b@example.com"],
          cc: ["c@example.com"],
          bcc: ["d@example.com", "e@example.com"],
          subject: "Broadcast",
          text: "Hello everyone",
        },
      });

      expect(response.statusCode).toBe(200);
      // to(2) + cc(1) + bcc(2) = 5
      expect(response.json().data.totalRecipients).toBe(5);
      expect(response.json().data.rejectedCount).toBe(0);
    });

    it("should call emailService.sendBulkEmail with attachments", async () => {
      // Base64 of "Hello, attachment!"
      const base64Content = Buffer.from("Hello, attachment!").toString("base64");

      await app.inject({
        method: "POST",
        url: "/send-bulk",
        payload: {
          to: ["recipient@example.com"],
          subject: "Report with Attachment",
          html: "<p>See attached report.</p>",
          attachments: [
            {
              filename: "report.txt",
              content: base64Content,
              contentType: "text/plain",
            },
          ],
        },
      });

      expect(mockEmailService.sendBulkEmail).toHaveBeenCalledOnce();
      expect(mockEmailService.sendBulkEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: "report.txt",
              contentType: "text/plain",
            }),
          ]),
        }),
      );
    });

    it("should indicate partial delivery in the message when some recipients are rejected", async () => {
      mockEmailService.sendBulkEmail.mockResolvedValueOnce({
        ...mockSendResult,
        accepted: ["alice@example.com"],
        rejected: ["invalid@bounced.invalid"],
      });

      const response = await app.inject({
        method: "POST",
        url: "/send-bulk",
        payload: {
          to: ["alice@example.com", "invalid@bounced.invalid"],
          subject: "Partial delivery test",
          text: "Test body",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.rejectedCount).toBe(1);
      expect(body.message).toMatch(/rejected/);
    });

    it("should return 500 when emailService.sendBulkEmail throws", async () => {
      mockEmailService.sendBulkEmail.mockRejectedValueOnce(
        new Error("SMTP rate limit exceeded"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/send-bulk",
        payload: {
          to: ["user@example.com"],
          subject: "Fail case",
          text: "Test",
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body).toMatchObject({
        ok: false,
        message: "Failed to send bulk email",
        error: "SMTP rate limit exceeded",
      });
    });
  });
});