// costrict 下载管理器
import path from "path"

export const DEFAULT_PRIVATE_REGISTRY_URL = "https://product_2826_7de8cd:bf3f3d58a8870f5d@nexus.sangfor.com/repository/cicd_virus_scan_2826/"

export interface DownloadConfig {
  version: string
  filename: string
  platform: string
  extension: string
  processPlatformKey?: string
}

export interface DownloadError {
  url: string
  status: number
}

// 根据平台构建私服 URL 路径
function buildPrivateRegistryPath(config: DownloadConfig): string {
  const { version, filename, processPlatformKey } = config
  
  /*costrict change*/
  // 特定平台的自定义路径
  if (processPlatformKey === "x64-win32") {
    return `ripgrep-win64/${version}/${filename}`
  }
  
  if (processPlatformKey === "x64-linux") {
    return `ripgrep-linux/${version}/${filename}`
  }
  /*costrict change*/
  
  // 其他平台使用默认路径
  return filename
}

export async function downloadWithFallback(
  publicUrl: string,
  config: DownloadConfig,
): Promise<ArrayBuffer> {
  // 尝试从 GitHub 下载
  try {
    const response = await fetch(publicUrl)
    if (response.ok) {
      return await response.arrayBuffer()
    }
    throw new Error(`GitHub download failed: ${publicUrl} (status: ${response.status})`)
  } catch (error) {
    // GitHub 下载失败，尝试从内网私服下载
    const privateRegistryUrl = process.env.COSTRICT_PRIVATE_REGISTRY || DEFAULT_PRIVATE_REGISTRY_URL
    /*costrict change*/
    const privatePath = buildPrivateRegistryPath(config)
    const privateUrl = `${privateRegistryUrl}${privatePath}`
    /*costrict change*/
    
    console.log(`GitHub download failed, trying private registry: ${privateUrl}`)
    
    const privateResponse = await fetch(privateUrl)
    if (!privateResponse.ok) {
      throw new Error(`Private registry download failed: ${privateUrl} (status: ${privateResponse.status})`)
    }
    
    return await privateResponse.arrayBuffer()
  }
}