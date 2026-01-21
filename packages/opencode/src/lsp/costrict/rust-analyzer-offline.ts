import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import path from "path"
import os from "os"
import { Global } from "../../global"
import { Log } from "../../util/log"
import { $ } from "bun"
import fs from "fs/promises"
import { Filesystem } from "../../util/filesystem"
import { Instance } from "../../project/instance"

const log = Log.create({ service: "lsp.rust-analyzer-offline" })
const pathExists = async (p: string) =>
  fs
    .stat(p)
    .then(() => true)
    .catch(() => false)

const NearestRoot = (includePatterns: string[], excludePatterns?: string[]) => {
  return async (file: string) => {
    if (excludePatterns) {
      const excludedFiles = Filesystem.up({
        targets: excludePatterns,
        start: path.dirname(file),
        stop: Instance.directory,
      })
      const excluded = await excludedFiles.next()
      await excludedFiles.return()
      if (excluded.value) return undefined
    }
    const files = Filesystem.up({
      targets: includePatterns,
      start: path.dirname(file),
      stop: Instance.directory,
    })
    const first = await files.next()
    await files.return()
    if (!first.value) return Instance.directory
    return path.dirname(first.value)
  }
}

export namespace RUST_ANALYZER_OFFLINE {
  export interface Handle {
    process: ChildProcessWithoutNullStreams
    initialization?: Record<string, any>
  }

  /**
   * 获取平台特定的后缀
   */
  function getPlatformSuffix(): string {
    const platform = process.platform
    const arch = os.arch()

    let platformName: string
    switch (platform) {
      case "darwin":
        platformName = "apple-darwin"
        break
      case "linux":
        platformName = "unknown-linux-gnu"
        break
      case "win32":
        platformName = "pc-windows-msvc"
        break
      default:
        log.error("Unsupported platform", { platform })
        return ""
    }

    let archName: string
    switch (arch) {
      case "x64":
        archName = "x86_64"
        break
      case "arm64":
        archName = "aarch64"
        break
      default:
        log.error("Unsupported architecture", { arch })
        return ""
    }

    return `${archName}-${platformName}`
  }

  /**
   * 从内网私服下载 rust-analyzer 离线包
   * @param internalUrl 完整的下载地址
   * @param distPath 安装目录路径
   */
  async function downloadFromInternalServer(
    internalUrl: string,
    distPath: string,
  ): Promise<boolean> {
    try {
      log.info("Downloading rust-analyzer from internal server", { internalUrl })

      const platformSuffix = getPlatformSuffix()
      if (!platformSuffix) {
        log.error("Unable to determine platform/architecture")
        return false
      }

      // 根据平台选择压缩格式
      const isWindows = process.platform === "win32"
      const archiveExt = isWindows ? ".zip" : ".tar.gz"
      const archiveFilename = `rust-analyzer-${platformSuffix}${archiveExt}`
      const archivePath = path.join(distPath, archiveFilename)

      // 组合下载地址：{internalUrl}/{archiveFilename}
      const downloadUrl = internalUrl.endsWith("/")
        ? `${internalUrl}${archiveFilename}`
        : `${internalUrl}/${archiveFilename}`

      log.info("Starting download from", { url: downloadUrl })

      await $`curl -L -o '${archivePath}' '${downloadUrl}'`.quiet().nothrow()

      const archiveExists = await pathExists(archivePath)
      if (!archiveExists) {
        log.error("Failed to download rust-analyzer from internal server")
        return false
      }

      // 解压下载的文件
      if (isWindows) {
        await $`unzip -q '${archivePath}'`.cwd(distPath).quiet().nothrow()
      } else {
        await $`tar -xzf ${archivePath}`.cwd(distPath).quiet().nothrow()
      }

      // 清理压缩包
      await fs.rm(archivePath, { force: true })

      log.info("Successfully installed rust-analyzer from internal server")
      return true
    } catch (error) {
      log.error("Error downloading rust-analyzer from internal server", { error })
      return false
    }
  }

  /**
   * 获取配置的内网 URL
   */
  function getConfiguredInternalUrl(): string | undefined {
    return process.env.COSTRICT_RUST_ANALYZER_INTERNAL_URL
  }

  /**
   * 启动 RUST_ANALYZER_OFFLINE 服务器
   * @param root 项目根目录
   * @param options 可选参数，包含离线下载配置
   */
  export async function start(
    root: string,
    options?: {
      version?: string
      internalUrl?: string
    },
  ): Promise<Handle | undefined> {
    // 获取配置参数
    const internalUrl = options?.internalUrl ?? getConfiguredInternalUrl()

    // 检查必须的配置
    if (!internalUrl) {
      log.error("RUST_ANALYZER_OFFLINE requires internal URL configuration (COSTRICT_RUST_ANALYZER_INTERNAL_URL)")
      return
    }

    const distPath = path.join(Global.Path.bin, "rust-analyzer-offline")
    const isWindows = process.platform === "win32"
    const executableName = isWindows ? "rust-analyzer.exe" : "rust-analyzer"
    const rustAnalyzerPath = path.join(distPath, "rust-analyzer", executableName)
    const installed = await pathExists(rustAnalyzerPath)

    // 如果未安装，则从内网私服下载
    if (!installed) {
      log.info("rust-analyzer not installed, downloading from internal server...")
      await fs.mkdir(distPath, { recursive: true })

      const success = await downloadFromInternalServer(internalUrl, distPath)
      if (!success) {
        log.error("Failed to install rust-analyzer from internal server")
        return
      }
    }

    if (!(await pathExists(rustAnalyzerPath))) {
      log.error(`Failed to locate rust-analyzer executable: ${rustAnalyzerPath}`)
      return
    }

    log.info("Starting RUST_ANALYZER_OFFLINE server", { distPath })

    // 启动 rust-analyzer 进程
    return {
      process: spawn(rustAnalyzerPath, [], {
        cwd: root,
      }),
    }
  }
}

// RUST_ANALYZER_OFFLINE_SERVER - LSP 服务器实现
// 符合 LSPServer.Info 接口
export const RUST_ANALYZER_OFFLINE_SERVER: {
  id: string
  extensions: string[]
  root: (file: string) => Promise<string | undefined>
  spawn(root: string): Promise<{ process: ChildProcessWithoutNullStreams; initialization?: Record<string, any> } | undefined>
} = {
  id: "rust-analyzer-offline",
  root: NearestRoot(["Cargo.toml"]),
  extensions: [".rs"],
  async spawn(root) {
    // 从环境变量获取配置
    const internalUrl = process.env.COSTRICT_RUST_ANALYZER_INTERNAL_URL

    if (!internalUrl) {
      log.error("RUST_ANALYZER_OFFLINE requires COSTRICT_RUST_ANALYZER_INTERNAL_URL environment variable")
      return
    }

    return await RUST_ANALYZER_OFFLINE.start(root, {
      internalUrl,
    })
  },
}