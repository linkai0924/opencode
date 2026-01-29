import { BusEvent } from "@/bus/bus-event"
import path from "path"
import { $ } from "bun"
import z from "zod"
import { NamedError } from "@opencode-ai/util/error"
import { Log } from "../util/log"
import { iife } from "@/util/iife"
import { Flag } from "../flag/flag"
import { createHash } from "node:crypto"
import { hostname, userInfo } from "node:os"

declare global {
  const COSTRICT_VERSION: string
  const COSTRICT_CHANNEL: string
}

export namespace Installation {
  const log = Log.create({ service: "installation" })

  export type Method = Awaited<ReturnType<typeof method>>

  export const Event = {
    Updated: BusEvent.define(
      "installation.updated",
      z.object({
        version: z.string(),
      }),
    ),
    UpdateAvailable: BusEvent.define(
      "installation.update-available",
      z.object({
        version: z.string(),
      }),
    ),
  }

  export const Info = z
    .object({
      version: z.string(),
      latest: z.string(),
    })
    .meta({
      ref: "InstallationInfo",
    })
  export type Info = z.infer<typeof Info>

  export async function info() {
    return {
      version: VERSION,
      latest: await latest(),
    }
  }

  export function isPreview() {
    return CHANNEL !== "latest"
  }

  export function isLocal() {
    return CHANNEL === "local"
  }

  export async function method() {
    if (process.execPath.includes(path.join(".costrict", "bin"))) return "curl"
    if (process.execPath.includes(path.join(".local", "bin"))) return "curl"
    const exec = process.execPath.toLowerCase()

    const checks = [
      {
        name: "npm" as const,
        command: () => $`npm list -g --depth=0`.throws(false).quiet().text(),
      },
      {
        name: "yarn" as const,
        command: () => $`yarn global list`.throws(false).quiet().text(),
      },
      {
        name: "pnpm" as const,
        command: () => $`pnpm list -g --depth=0`.throws(false).quiet().text(),
      },
      {
        name: "bun" as const,
        command: () => $`bun pm ls -g`.throws(false).quiet().text(),
      },
      {
        name: "brew" as const,
        command: () => $`brew list --formula opencode`.throws(false).quiet().text(),
      },
      {
        name: "scoop" as const,
        command: () => $`scoop list opencode`.throws(false).quiet().text(),
      },
      {
        name: "choco" as const,
        command: () => $`choco list --limit-output opencode`.throws(false).quiet().text(),
      },
    ]

    checks.sort((a, b) => {
      const aMatches = exec.includes(a.name)
      const bMatches = exec.includes(b.name)
      if (aMatches && !bMatches) return -1
      if (!aMatches && bMatches) return 1
      return 0
    })

    for (const check of checks) {
      const output = await check.command()
      const installedName =
        check.name === "brew" || check.name === "choco" || check.name === "scoop" ? "opencode" : "opencode-ai"
      if (output.includes(installedName)) {
        return check.name
      }
    }

    return "unknown"
  }

  export const UpgradeFailedError = NamedError.create(
    "UpgradeFailedError",
    z.object({
      stderr: z.string(),
    }),
  )

  async function getBrewFormula() {
    const tapFormula = await $`brew list --formula anomalyco/tap/opencode`.throws(false).quiet().text()
    if (tapFormula.includes("opencode")) return "anomalyco/tap/opencode"
    const coreFormula = await $`brew list --formula opencode`.throws(false).quiet().text()
    if (coreFormula.includes("opencode")) return "opencode"
    return "opencode"
  }

  export async function upgrade(method: Method | undefined, targetVersion: string) {
    // Always default to curl for upgrade unless explicitly specified
    const upgradeMethod = method || "curl"
    
    let cmd
    switch (upgradeMethod) {
      case "curl": {
        const baseUrl = Flag.COSTRICT_BASE_URL || "https://zgsm.sangfor.com"
        const version = targetVersion.startsWith("v") ? targetVersion : `v${targetVersion}`
        cmd = $`curl -fsSL ${baseUrl}/costrict/install.sh | bash`.env({
          ...process.env,
          VERSION: version,
          COSTRICT_BASE_URL: baseUrl,
        })
        break
      }
      case "npm":
        const version = targetVersion.startsWith("v") ? `@${targetVersion}` : `@${targetVersion}`
        cmd = $`npm install -g costrict-ai${version}`
        break
      case "pnpm":
        cmd = $`pnpm install -g costrict-ai@${target}`
        break
      case "bun":
        const bunVersion = targetVersion.startsWith("v") ? `@${targetVersion}` : `@${targetVersion}`
        cmd = $`bun install -g opencode-ai${bunVersion}`
        break
      case "brew": {
        const formula = await getBrewFormula()
        cmd = $`brew upgrade ${formula}`.env({
          HOMEBREW_NO_AUTO_UPDATE: "1",
          ...process.env,
        })
        break
      }
      case "choco":
        const chocoVersion = targetVersion.startsWith("v") ? targetVersion.replace(/^v/, "") : targetVersion
        cmd = $`echo Y | choco upgrade costrict-cli --version=${chocoVersion}`
        break
      case "scoop":
        const scoopVersion = targetVersion.startsWith("v") ? `@${targetVersion}` : `@${targetVersion}`
        cmd = $`scoop install opencode${scoopVersion}`
        break
      default:
        throw new Error(`Unknown upgrade method: ${method}`)
    }
    const result = await cmd.quiet().throws(false)
    if (result.exitCode !== 0) {
      const stderr = method === "choco" ? "not running from an elevated command shell" : result.stderr.toString("utf8")
      throw new UpgradeFailedError({
        stderr: stderr,
      })
    }
    log.info("upgraded", {
      method: upgradeMethod,
      version: targetVersion,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    })
    await $`${process.execPath} --version`.nothrow().quiet().text()
  }

  export const VERSION = typeof COSTRICT_VERSION === "string" ? COSTRICT_VERSION : "local"
  export const CHANNEL = typeof COSTRICT_CHANNEL === "string" ? COSTRICT_CHANNEL : "local"
  export const CLIENT = process.env["COSTRICT_CLIENT"] ?? "cli"
  export const USER_AGENT = `opencode/${CHANNEL}/${VERSION}/${CLIENT}`

  /**
   * Generate stable installation ID based on machine information
   * Compatible with costrict-cli InstallationManager
   */
  let cachedInstallationId: string | null = null
  export function getInstallationId(): string {
    // Try environment variable first (always check, not cached)
    const envId = process.env["COSTRICT_CLIENT_ID"]
    if (envId) {
      // If env ID changed, update cache
      if (cachedInstallationId !== envId) {
        cachedInstallationId = envId
      }
      return envId
    }

    // If we have a cached ID and no env var, return it
    if (cachedInstallationId) {
      return cachedInstallationId
    }

    // Generate stable ID based on hostname and username
    const host = hostname()
    const user = userInfo().username
    const machineInfo = `${host}-${user}`
    const hash = createHash("sha256").update(machineInfo).digest("hex")

    // Use first 32 characters for compatibility
    cachedInstallationId = hash.substring(0, 32)
    return cachedInstallationId
  }

  /**
   * Clear the installation ID cache (for testing)
   */
  export function clearInstallationIdCache(): void {
    cachedInstallationId = null
  }

  export async function latest(installMethod?: Method) {
    const baseUrl = Flag.COSTRICT_BASE_URL || "https://zgsm.sangfor.com"
    return fetch(`${baseUrl}/costrict/pkg/latest.json`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText)
        return res.json()
      })
      .then((data: any) => data.tag_name)
  }
}
