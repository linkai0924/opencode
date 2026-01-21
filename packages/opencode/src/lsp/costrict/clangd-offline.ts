import { spawn, type ChildProcessWithoutNullStreams } from "child_process"
import path from "path"
import os from "os"
import { Global } from "../../global"
import { Log } from "../../util/log"
import { $ } from "bun"
import fs from "fs/promises"
import { Filesystem } from "../../util/filesystem"
import { Instance } from "../../project/instance"

const log = Log.create({ service: "lsp.clangd-offline" })
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

export namespace CLANGD_OFFLINE {
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
        platformName = "macos"
        break
      case "linux":
        platformName = "linux"
        break
      case "win32":
        platformName = "windows"
        break
      default:
        log.error("Unsupported platform", { platform })
        return ""
    }

    let archName: string
    switch (arch) {
      case "x64":
        archName = "amd64"
        break
      case "arm64":
        archName = "arm64"
        break
      default:
        log.error("Unsupported architecture", { arch })
        return ""
    }

    return `${platformName}-${archName}`
  }

  /**
   * 从内网私服下载 clangd 离线包
   * @param internalUrl 完整的下载地址
   * @param distPath 安装目录路径
   */
  async function downloadFromInternalServer(
    internalUrl: string,
    distPath: string,
  ): Promise<boolean> {
    try {
      log.info("Downloading clangd from internal server", { internalUrl })

      const platformSuffix = getPlatformSuffix()
      if (!platformSuffix) {
        log.error("Unable to determine platform/architecture")
        return false
      }

      // 根据平台选择压缩格式
      const isWindows = process.platform === "win32"
      const archiveExt = isWindows ? ".zip" : ".tar.gz"
      const archiveFilename = `clangd-${platformSuffix}${archiveExt}`
      const archivePath = path.join(distPath, archiveFilename)

      // 组合下载地址：{internalUrl}/{archiveFilename}
      const downloadUrl = internalUrl.endsWith("/")
        ? `${internalUrl}${archiveFilename}`
        : `${internalUrl}/${archiveFilename}`

      log.info("Starting download from", { url: downloadUrl })

      await $`curl -L -o '${archivePath}' '${downloadUrl}'`.quiet().nothrow()

      const archiveExists = await pathExists(archivePath)
      if (!archiveExists) {
        log.error("Failed to download clangd from internal server")
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

      log.info("Successfully installed clangd from internal server")
      return true
    } catch (error) {
      log.error("Error downloading clangd from internal server", { error })
      return false
    }
  }

  /**
   * 获取配置的内网 URL
   */
  function getConfiguredInternalUrl(): string | undefined {
    return process.env.COSTRICT_CLANGD_INTERNAL_URL
  }

  /**
   * 启动 CLANGD_OFFLINE 服务器
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
      log.error("CLANGD_OFFLINE requires internal URL configuration (COSTRICT_CLANGD_INTERNAL_URL)")
      return
    }

    const distPath = path.join(Global.Path.bin, "clangd-offline")
    const installed = await pathExists(distPath)

    // 如果未安装，则从内网私服下载
    if (!installed) {
      log.info("clangd not installed, downloading from internal server...")
      await fs.mkdir(distPath, { recursive: true })

      const success = await downloadFromInternalServer(internalUrl, distPath)
      if (!success) {
        log.error("Failed to install clangd from internal server")
        return
      }
    }

    // 查找 clangd 可执行文件
    const executableName = process.platform === "win32" ? "clangd.exe" : "clangd"
    const clangdPath = path.join(distPath, "bin", executableName)

    if (!(await pathExists(clangdPath))) {
      log.error(`Failed to locate clangd executable: ${clangdPath}`)
      return
    }

    log.info("Starting CLANGD_OFFLINE server", { distPath })

    // 启动 clangd 进程
    return {
      process: spawn(clangdPath, [], {
        cwd: root,
      }),
    }
  }
}

// CLANGD_OFFLINE_SERVER - LSP 服务器实现
// 符合 LSPServer.Info 接口
export const CLANGD_OFFLINE_SERVER: {
  id: string
  extensions: string[]
  root: (file: string) => Promise<string | undefined>
  spawn(root: string): Promise<{ process: ChildProcessWithoutNullStreams; initialization?: Record<string, any> } | undefined>
} = {
  id: "clangd-offline",
  root: NearestRoot([
    "CMakeLists.txt",
    "Makefile",
    "compile_commands.json",
    "package.json",
  ]),
  extensions: [".cpp", ".c", ".h", ".hpp", ".cc", ".cxx", ".hxx", ".c++"],
  async spawn(root) {
    // 从环境变量获取配置
    const internalUrl = process.env.COSTRICT_CLANGD_INTERNAL_URL

    if (!internalUrl) {
      log.error("CLANGD_OFFLINE requires COSTRICT_CLANGD_INTERNAL_URL environment variable")
      return
    }

    return await CLANGD_OFFLINE.start(root, {
      internalUrl,
    })
  },
}