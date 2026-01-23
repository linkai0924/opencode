import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { ErrorLog } from "../../src/plugin/tdd/utils/error-log"
import fs from "fs/promises"

describe("ErrorLog", () => {
  beforeEach(async () => {
    // Clean up all error logs before each test
    await ErrorLog.clearLogs()
    // Ensure logging is enabled by default for tests
    delete process.env.COSTRICT_ERROR_LOG_ENABLED
  })

  afterEach(async () => {
    // Clean up all error logs after each test
    await ErrorLog.clearLogs()
    // Reset env var
    delete process.env.COSTRICT_ERROR_LOG_ENABLED
  })

  describe("Environment Variable Control", () => {
    it("should be enabled by default", async () => {
      const error = new Error("Test error")
      await ErrorLog.logError(error)

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("Test error")
    })

    it("should respect COSTRICT_ERROR_LOG_ENABLED=true", async () => {
      process.env.COSTRICT_ERROR_LOG_ENABLED = "true"
      const error = new Error("Test error")
      await ErrorLog.logError(error)

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("Test error")
    })

    it("should disable logging when COSTRICT_ERROR_LOG_ENABLED=false", async () => {
      process.env.COSTRICT_ERROR_LOG_ENABLED = "false"
      const error = new Error("Test error")
      await ErrorLog.logError(error)

      // Should throw because log file doesn't exist (nothing was written)
      await expect(fs.readFile(ErrorLog.logPath(), "utf-8")).rejects.toThrow()
    })

    it("should disable logging when COSTRICT_ERROR_LOG_ENABLED=0", async () => {
      process.env.COSTRICT_ERROR_LOG_ENABLED = "0"
      const error = new Error("Test error")
      await ErrorLog.logError(error)

      // Should throw because log file doesn't exist (nothing was written)
      await expect(fs.readFile(ErrorLog.logPath(), "utf-8")).rejects.toThrow()
    })

    it("should work for logLLMError with env var disabled", async () => {
      process.env.COSTRICT_ERROR_LOG_ENABLED = "false"
      await ErrorLog.logLLMError(new Error("Test LLM error"), {
        providerID: "openai",
        modelID: "gpt-4",
      })

      // Should throw because log file doesn't exist (nothing was written)
      await expect(fs.readFile(ErrorLog.logPath(), "utf-8")).rejects.toThrow()
    })
  })

  describe("logLLMError", () => {
    it("should log LLM error with context", async () => {
      const error = new Error("Test LLM error")
      error.stack = "Error: Test LLM error\n    at test (test.ts:1)"

      await ErrorLog.logLLMError(error, {
        providerID: "openai",
        modelID: "gpt-4",
        sessionID: "test-session",
        agent: "test-agent",
        requestType: "stream",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("Test LLM error")
      expect(logContent).toContain("providerID")
      expect(logContent).toContain("openai")
      expect(logContent).toContain("modelID")
      expect(logContent).toContain("gpt-4")
      expect(logContent).toContain("sessionID")
      expect(logContent).toContain("test-session")
      expect(logContent).toContain("Stack Trace")
    })

    it("should log error with cause", async () => {
      const cause = new Error("Root cause")
      const error = new Error("Surface error")
      error.cause = cause

      await ErrorLog.logLLMError(error, {
        providerID: "anthropic",
        modelID: "claude-3",
        requestType: "chat",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("Surface error")
      expect(logContent).toContain("Root cause")
      expect(logContent).toContain("Caused By")
    })

    it("should handle non-Error objects", async () => {
      await ErrorLog.logLLMError("String error", {
        providerID: "openai",
        modelID: "gpt-4",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("String error")
    })

    it("should handle error object with stack property", async () => {
      const errorObj = {
        message: "API request failed",
        stack: "Error: API request failed\n    at apiCall (api.ts:10:5)\n    at processRequest (request.ts:25:10)",
      }

      await ErrorLog.logLLMError(errorObj, {
        providerID: "openai",
        modelID: "gpt-4",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("API request failed")
      expect(logContent).toContain("at apiCall (api.ts:10:5)")
      expect(logContent).toContain("at processRequest (request.ts:25:10)")
    })

    it("should handle plain object without message", async () => {
      const errorObj = {
        code: "RATE_LIMIT_EXCEEDED",
        status: 429,
      }

      await ErrorLog.logLLMError(errorObj, {
        providerID: "openai",
        modelID: "gpt-4",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("RATE_LIMIT_EXCEEDED")
      expect(logContent).toContain("429")
    })
  })

  describe("logError", () => {
    it("should log general error", async () => {
      const error = new Error("General test error")

      await ErrorLog.logError(error, {
        context: "test context",
      })

      const logContent = await fs.readFile(ErrorLog.logPath(), "utf-8")
      expect(logContent).toContain("General test error")
      expect(logContent).toContain("context")
      expect(logContent).toContain("test context")
    })
  })

  describe("readRecentErrors", () => {
    it("should return empty array if no logs exist", async () => {
      const recentErrors = await ErrorLog.readRecentErrors()
      expect(recentErrors).toHaveLength(0)
    })

    it("should read recent errors", async () => {
      // Log multiple errors
      for (let i = 0; i < 5; i++) {
        await ErrorLog.logError(new Error(`Error ${i}`))
      }

      const recentErrors = await ErrorLog.readRecentErrors(3)
      expect(recentErrors).toHaveLength(3)
      expect(recentErrors[0]).toContain("Error 2")
      expect(recentErrors[1]).toContain("Error 3")
      expect(recentErrors[2]).toContain("Error 4")
    })
  })

  describe("clearLogs", () => {
    it("should clear all error logs", async () => {
      // Log some errors
      await ErrorLog.logError(new Error("Error 1"))
      await ErrorLog.logError(new Error("Error 2"))

      // Clear logs
      await ErrorLog.clearLogs()

      // Verify logs are cleared
      const recentErrors = await ErrorLog.readRecentErrors()
      expect(recentErrors).toHaveLength(0)
    })
  })

  describe("logPath", () => {
    it("should return correct log file path", () => {
      const logPath = ErrorLog.logPath()
      expect(logPath).toContain("llm-errors.log")
      expect(logPath).toContain("log")
    })
  })
})
