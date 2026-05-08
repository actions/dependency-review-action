import {EnvHttpProxyAgent, setGlobalDispatcher} from 'undici'
import * as core from '@actions/core'

function sanitizeProxyUrlForLogging(proxyUrl: string): string {
  try {
    const url = new URL(proxyUrl)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.hostname === ''
    ) {
      throw new Error('Invalid proxy URL format')
    }

    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    return `${url.hostname}:${port}`
  } catch {
    // Redact anything before the last '@' to also cover scheme-less input
    // like "user:pass@proxy:8080".
    const atIndex = proxyUrl.lastIndexOf('@')
    if (atIndex === -1) {
      return proxyUrl
    }

    const hostPart = proxyUrl.slice(atIndex + 1)
    const schemeMatch = proxyUrl.match(/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//)

    if (schemeMatch) {
      return `${schemeMatch[0]}[REDACTED]@${hostPart}`
    }

    return `[REDACTED]@${hostPart}`
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Initializes proxy support for native fetch() API in Node.js 20+.
 * Uses undici's EnvHttpProxyAgent which automatically reads proxy configuration
 * from environment variables (HTTP_PROXY, HTTPS_PROXY, NO_PROXY, etc.)
 * and handles credential extraction from proxy URLs.
 *
 * This must be called early in the application lifecycle before any fetch() calls.
 */
export function initializeProxySupport(): void {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy

  if (!proxyUrl) {
    core.debug('No proxy configuration detected')
    return
  }

  try {
    const agent = new EnvHttpProxyAgent()
    setGlobalDispatcher(agent)

    // Log proxy host without credentials
    core.debug(`Proxy configured: ${sanitizeProxyUrlForLogging(proxyUrl)}`)
  } catch (error: unknown) {
    const sanitizedProxyUrl = sanitizeProxyUrlForLogging(proxyUrl)
    core.warning(
      `Failed to configure proxy from ${sanitizedProxyUrl}: ${getErrorMessage(error)}`
    )
  }
}
