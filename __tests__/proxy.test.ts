import {expect, test, jest, beforeEach, afterEach} from '@jest/globals'
import {initializeProxySupport} from '../src/proxy'
import * as core from '@actions/core'
import {
  EnvHttpProxyAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Dispatcher
} from 'undici'

// Mock @actions/core
jest.mock('@actions/core')

describe('proxy support', () => {
  let originalEnv: NodeJS.ProcessEnv
  let mockDebug: jest.MockedFunction<typeof core.debug>
  let mockInfo: jest.MockedFunction<typeof core.info>
  let mockWarning: jest.MockedFunction<typeof core.warning>
  let originalDispatcher: Dispatcher

  beforeEach(() => {
    // Save original environment
    originalEnv = {...process.env}
    originalDispatcher = getGlobalDispatcher()

    delete process.env.HTTP_PROXY
    delete process.env.HTTPS_PROXY
    delete process.env.http_proxy
    delete process.env.https_proxy

    // Setup mocks
    mockDebug = jest.mocked(core.debug)
    mockInfo = jest.mocked(core.info)
    mockWarning = jest.mocked(core.warning)

    mockDebug.mockClear()
    mockInfo.mockClear()
    mockWarning.mockClear()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    setGlobalDispatcher(originalDispatcher)
  })

  test('does nothing when no proxy is configured', () => {
    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith('No proxy configuration detected')
    expect(mockInfo).not.toHaveBeenCalled()
    expect(mockWarning).not.toHaveBeenCalled()
  })

  test('configures proxy from HTTPS_PROXY environment variable', () => {
    process.env.HTTPS_PROXY = 'http://proxy.company.com:8080'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: proxy.company.com:8080'
    )
    expect(mockWarning).not.toHaveBeenCalled()
    expect(mockDebug).not.toHaveBeenCalledWith(
      'No proxy configuration detected'
    )

    const dispatcher = getGlobalDispatcher()
    expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent)
  })

  test('configures proxy from https_proxy environment variable (lowercase)', () => {
    process.env.https_proxy = 'http://proxy.example.com:3128'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: proxy.example.com:3128'
    )
    const dispatcher = getGlobalDispatcher()
    expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent)
  })

  test('configures proxy from HTTP_PROXY environment variable', () => {
    process.env.HTTP_PROXY = 'http://proxy.example.com:8888'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: proxy.example.com:8888'
    )
  })

  test('configures proxy from http_proxy environment variable (lowercase)', () => {
    process.env.http_proxy = 'http://proxy.test.com:9090'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: proxy.test.com:9090'
    )
  })

  test('prioritizes uppercase over lowercase', () => {
    process.env.HTTPS_PROXY = 'http://uppercase.com:8080'
    process.env.https_proxy = 'http://lowercase.com:8080'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: uppercase.com:8080'
    )
  })

  test('handles proxy with authentication credentials', () => {
    process.env.HTTPS_PROXY = 'http://user:pass@proxy.secure.com:8080'

    initializeProxySupport()

    // Should log proxy without showing credentials
    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: proxy.secure.com:8080'
    )
    expect(mockWarning).not.toHaveBeenCalled()

    const dispatcher = getGlobalDispatcher()
    expect(dispatcher).toBeInstanceOf(EnvHttpProxyAgent)
  })

  test('handles proxy with URL-encoded credentials', () => {
    process.env.HTTPS_PROXY =
      'http://user%40domain:p%40ss%3Aword@proxy.com:8080'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith('Proxy configured: proxy.com:8080')
    expect(mockWarning).not.toHaveBeenCalled()
  })

  test('handles proxy with HTTPS scheme', () => {
    process.env.HTTPS_PROXY = 'https://secure-proxy.com:443'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith(
      'Proxy configured: secure-proxy.com:443'
    )
  })

  test('uses default port 443 for https proxy without explicit port', () => {
    process.env.HTTPS_PROXY = 'https://proxy.com'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith('Proxy configured: proxy.com:443')
  })

  test('uses default port 80 for http proxy without explicit port', () => {
    process.env.HTTP_PROXY = 'http://proxy.com'

    initializeProxySupport()

    expect(mockDebug).toHaveBeenCalledWith('Proxy configured: proxy.com:80')
  })

  test('handles invalid proxy URL gracefully', () => {
    process.env.HTTPS_PROXY = 'not-a-valid-url'

    initializeProxySupport()

    expect(mockWarning).toHaveBeenCalled()
    const warningCall = mockWarning.mock.calls[0][0] as string
    expect(warningCall).toContain('Failed to configure proxy')
    expect(warningCall).toContain('not-a-valid-url')
  })

  test('handles proxy URL with only hostname (no scheme)', () => {
    process.env.HTTPS_PROXY = 'proxy.company.com:8080'

    initializeProxySupport()

    // Should fail gracefully as URL requires a scheme
    expect(mockWarning).toHaveBeenCalled()
    const warningCall = mockWarning.mock.calls[0][0] as string
    expect(warningCall).toContain('Failed to configure proxy')
  })

  test('redacts credentials in scheme-less malformed proxy URL logs', () => {
    process.env.HTTPS_PROXY = 'user:super-secret@proxy.company.com:8080'

    initializeProxySupport()

    expect(mockWarning).toHaveBeenCalled()
    const warningCall = mockWarning.mock.calls[0][0] as string
    expect(warningCall).toContain('Failed to configure proxy')
    expect(warningCall).toContain('[REDACTED]@proxy.company.com:8080')
    expect(warningCall).not.toContain('user:super-secret')
    expect(warningCall).not.toContain('super-secret')
  })

  test('handles empty proxy URL', () => {
    process.env.HTTPS_PROXY = ''

    initializeProxySupport()

    // Empty string is falsy, should detect as no proxy
    expect(mockDebug).toHaveBeenCalledWith('No proxy configuration detected')
  })
})
