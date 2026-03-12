import {ProxyAgent, setGlobalDispatcher} from 'undici'
import * as core from '@actions/core'

/**
 * Initializes proxy support for native fetch() API in Node.js 20+.
 * Configures undici's global dispatcher to use a ProxyAgent if proxy
 * environment variables are set (HTTP_PROXY, HTTPS_PROXY, http_proxy, https_proxy).
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
    const url = new URL(proxyUrl)

    // Extract Basic Auth credentials if present in the URL
    const token =
      url.username && url.password
        ? `Basic ${Buffer.from(
            `${decodeURIComponent(url.username)}:${decodeURIComponent(
              url.password
            )}`
          ).toString('base64')}`
        : undefined

    // Create ProxyAgent and set as global dispatcher
    const agent = new ProxyAgent({uri: proxyUrl, token})
    setGlobalDispatcher(agent)

    core.info(
      `Proxy configured: ${url.hostname}:${url.port || (url.protocol === 'https:' ? '443' : '80')}`
    )
  } catch (error: unknown) {
    core.warning(
      `Failed to configure proxy from ${proxyUrl}: ${(error as Error).message}`
    )
  }
}
