/*costrict change*/
/**
 * 嵌入式静态资源服务模块
 * 
 * 从编译时生成的 base64 模块中读取和提供静态资源
 */

import { getAssetBuffer, EMBEDDED_ASSETS } from "./embedded-assets.gen"

// MIME 类型映射表
const MIME_TYPES: Record<string, string> = {
  // 文本类型
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  
  // 图片类型
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  
  // 字体类型
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  
  // 视频类型
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  
  // 其他
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
  ".aac": "audio/aac",
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(path: string): string {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase()
  return MIME_TYPES[ext] || "application/octet-stream"
}

/**
 * 规范化路径,处理特殊情况
 */
function normalizePath(path: string): string {
  // 移除开头的斜杠
  let normalized = path.startsWith("/") ? path.slice(1) : path
  
  // 如果是根路径或目录路径,返回 index.html
  if (normalized === "" || normalized.endsWith("/")) {
    normalized = normalized + "index.html"
  }
  
  return normalized
}

/**
 * 嵌入式静态资源服务命名空间
 */
export namespace EmbeddedAssets {
  /**
   * 检测嵌入资源是否可用
   */
  export function isAvailable(): boolean {
    try {
      // @ts-ignore - 这个常量在构建时通过 define 注入
      const available = typeof EMBEDDED_APP_AVAILABLE !== "undefined" && EMBEDDED_APP_AVAILABLE === true
      const assetCount = Object.keys(EMBEDDED_ASSETS).length
      console.debug(`[EmbeddedAssets] Available: ${available}, count: ${assetCount}`)
      return available && assetCount > 0
    } catch (error) {
      console.error("[EmbeddedAssets] Error checking availability:", error)
      return false
    }
  }

  /**
   * 从嵌入资源获取文件
   * 
   * @param requestPath - 请求的路径(如 "/index.html" 或 "/assets/main.js")
   * @returns Response 对象,如果文件不存在则返回 null
   */
  export async function getAsset(requestPath: string): Promise<Response | null> {
    if (!isAvailable()) {
      return null
    }

    try {
      // 规范化路径
      const normalizedPath = normalizePath(requestPath)
      console.debug(`[EmbeddedAssets] Requesting: ${requestPath} -> ${normalizedPath}`)
      
      // 从嵌入的 base64 资源中获取文件内容
      const buffer = getAssetBuffer(normalizedPath)
      
      if (!buffer) {
        console.debug(`[EmbeddedAssets] Not found: ${normalizedPath}`)
        return null
      }
      
      // 获取 MIME 类型
      const mimeType = getMimeType(normalizedPath)
      
      console.debug(`[EmbeddedAssets] Serving: ${requestPath} (${buffer.byteLength} bytes, ${mimeType})`)
      
      // 创建响应
      // 将 Buffer 转换为 Uint8Array 以兼容 Response API
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Content-Length": buffer.byteLength.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      })
    } catch (error) {
      console.error(`[EmbeddedAssets] Failed to read: ${requestPath}`, error)
      return null
    }
  }

  /**
   * 获取资源元数据
   */
  export async function getAssetMetadata(
    requestPath: string,
  ): Promise<{ mime: string; size: number } | null> {
    if (!isAvailable()) {
      return null
    }

    try {
      const normalizedPath = normalizePath(requestPath)
      const buffer = getAssetBuffer(normalizedPath)
      
      if (!buffer) {
        return null
      }

      return {
        mime: getMimeType(normalizedPath),
        size: buffer.byteLength,
      }
    } catch {
      return null
    }
  }
}