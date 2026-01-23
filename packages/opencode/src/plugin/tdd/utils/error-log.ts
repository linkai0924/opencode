import fs from "fs/promises"
import path from "path"
import { Global } from "@/global"

export namespace ErrorLog {
  const ERROR_LOG_FILE = "llm-errors.log"
  const MAX_LOG_SIZE = 10 * 1024 * 1024 // 10MB
  const MAX_LOG_FILES = 5

  /**
   * Check if error logging is enabled via environment variable
   * Default: enabled (true)
   */
  function isEnabled(): boolean {
    const envValue = process.env.COSTRICT_ERROR_LOG_ENABLED
    if (envValue === undefined || envValue === "") return true
    return envValue !== "false" && envValue !== "0"
  }

  /**
   * Format error with full stack trace and context
   */
  function formatErrorEntry(error: Error | unknown, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString()
    let errorObj: Error
    let originalError = error

    if (error instanceof Error) {
      errorObj = error
    } else if (error && typeof error === "object") {
      const errorPlain = error as Record<string, any>
      const message = errorPlain.message ? String(errorPlain.message) : JSON.stringify(errorPlain)
      const constructedError = new Error(message)

      if (errorPlain.stack) {
        constructedError.stack = String(errorPlain.stack)
      }
      if (errorPlain.cause) {
        constructedError.cause = errorPlain.cause
      }

      errorObj = constructedError
    } else {
      errorObj = new Error(String(error))
    }

    const parts: string[] = [`\n${"=".repeat(80)}`, `Timestamp: ${timestamp}`, `Error: ${errorObj.message}`]

    if (errorObj.stack) {
      parts.push(`\nStack Trace:\n${errorObj.stack}`)
    }

    if (errorObj.cause) {
      const cause = errorObj.cause instanceof Error ? errorObj.cause : new Error(String(errorObj.cause))
      parts.push(`\nCaused By:\n  ${cause.message}`)
      if (cause.stack) {
        parts.push(
          `  Stack:\n${cause.stack
            .split("\n")
            .map((line) => "    " + line)
            .join("\n")}`,
        )
      }
    }

    if (context && Object.keys(context).length > 0) {
      parts.push(`\nContext:\n${JSON.stringify(context, null, 2)}`)
    }

    parts.push(`${"=".repeat(80)}`)

    return parts.join("\n")
  }

  /**
   * Get the log file path
   */
  function getLogFilePath(): string {
    return path.join(Global.Path.log, ERROR_LOG_FILE)
  }

  /**
   * Rotate log files if they exceed max size
   */
  async function rotateLogs(): Promise<void> {
    const logPath = getLogFilePath()

    try {
      const stats = await fs.stat(logPath)
      if (stats.size < MAX_LOG_SIZE) {
        return
      }

      // Rotate existing logs
      for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
        const oldFile = path.join(Global.Path.log, `llm-errors.${i}.log`)
        const newFile = path.join(Global.Path.log, `llm-errors.${i + 1}.log`)

        try {
          await fs.rename(oldFile, newFile)
        } catch {
          // Ignore if file doesn't exist
        }
      }

      // Move current log to .1
      await fs.rename(logPath, path.join(Global.Path.log, `llm-errors.1.log`))
    } catch (error) {
      // Ignore if file doesn't exist yet
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("Failed to rotate error logs:", error)
      }
    }
  }

  /**
   * Write error entry to log file
   */
  async function writeLogEntry(entry: string): Promise<void> {
    await rotateLogs()

    const logPath = getLogFilePath()
    // Ensure log directory exists
    await fs.mkdir(Global.Path.log, { recursive: true })
    await fs.appendFile(logPath, entry + "\n", { encoding: "utf-8" })
  }

  /**
   * Log an LLM request error with full stack trace
   *
   * @param error - The error object
   * @param context - Additional context information (provider, model, session, etc.)
   */
  export async function logLLMError(
    error: Error | unknown,
    context?: {
      providerID?: string
      modelID?: string
      sessionID?: string
      agent?: string
      requestType?: "stream" | "chat" | "completion"
      [key: string]: any
    },
  ): Promise<void> {
    if (!isEnabled()) return
    const entry = formatErrorEntry(error, context)
    await writeLogEntry(entry)
  }

  /**
   * Log a general application error with full stack trace
   *
   * @param error - The error object
   * @param context - Additional context information
   */
  export async function logError(error: Error | unknown, context?: Record<string, any>): Promise<void> {
    if (!isEnabled()) return
    const entry = formatErrorEntry(error, context)
    await writeLogEntry(entry)
  }

  /**
   * Get the path to the error log file
   */
  export function logPath(): string {
    return getLogFilePath()
  }

  /**
   * Read recent error log entries
   *
   * @param limit - Maximum number of entries to return (default: 10)
   */
  export async function readRecentErrors(limit: number = 10): Promise<string[]> {
    const logPath = getLogFilePath()

    try {
      const content = await fs.readFile(logPath, { encoding: "utf-8" })
      if (!content || content.trim().length === 0) {
        return []
      }

      const separator = "\n" + "=".repeat(80)
      const entries = content
        .split(separator)
        .filter((entry) => {
          const trimmed = entry.trim()
          return trimmed.length > 0 && trimmed.startsWith("Timestamp:")
        })
        .slice(-limit)

      return entries.map((entry) => "=".repeat(80) + entry)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return []
      }
      throw error
    }
  }

  /**
   * Clear all error logs
   */
  export async function clearLogs(): Promise<void> {
    const logDir = Global.Path.log

    try {
      const files = await fs.readdir(logDir)
      await Promise.all(
        files.filter((file) => file.startsWith("llm-errors")).map((file) => fs.unlink(path.join(logDir, file))),
      )
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
  }
}
