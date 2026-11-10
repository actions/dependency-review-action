import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals'
import * as fs from 'fs'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {DefaultArtifactClient} from '@actions/artifact'
import {RequestError} from '@octokit/request-error'
import type {SpyInstance} from 'jest-mock'
import {handleLargeSummary, run} from '../src/main'
import {compare} from '../src/dependency-graph'
import {readConfig} from '../src/config'
import {ConfigurationOptionsSchema} from '../src/schemas'

jest.mock('ansi-styles', () => ({
  __esModule: true,
  default: {
    color: {
      red: {open: '', close: ''},
      yellow: {open: '', close: ''},
      grey: {open: '', close: ''},
      green: {open: '', close: ''}
    },
    bold: {open: '', close: ''}
  }
}))
jest.mock('../src/dependency-graph', () => ({
  compare: jest.fn()
}))
jest.mock('../src/config', () => ({
  readConfig: jest.fn()
}))
jest.mock('@actions/github', () => ({
  context: {
    repo: {owner: 'owner', repo: 'repo'},
    serverUrl: 'https://github.com',
    payload: {repository: {private: false}}
  }
}))
jest.mock('@actions/core', () => {
  const summary = {
    addRaw: jest.fn().mockReturnThis(),
    addHeading: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    addSeparator: jest.fn().mockReturnThis(),
    addImage: jest.fn().mockReturnThis(),
    addList: jest.fn().mockReturnThis(),
    addBreak: jest.fn().mockReturnThis(),
    addLink: jest.fn().mockReturnThis(),
    addDetails: jest.fn().mockReturnThis(),
    addSection: jest.fn().mockReturnThis(),
    addCodeBlock: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    addEol: jest.fn().mockReturnThis(),
    write: jest.fn(async () => undefined),
    emptyBuffer: jest.fn(),
    stringify: jest.fn(() => '')
  }
  return {
    __esModule: true,
    getInput: jest.fn((name: string) =>
      name === 'repo-token' ? 'gh_test_token' : ''
    ),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    startGroup: jest.fn(),
    endGroup: jest.fn(),
    group: jest.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    summary
  }
})
jest.mock('@actions/artifact', () => ({
  DefaultArtifactClient: jest.fn()
}))

const ORIGINAL_ENV = {...process.env}

type ArtifactClientInstance = {
  uploadArtifact: jest.Mock
}

const DefaultArtifactClientMock = DefaultArtifactClient as unknown as jest.Mock

const createArtifactClient = (): ArtifactClientInstance => ({
  uploadArtifact: jest.fn(async () => undefined)
})

describe('run API errors', () => {
  beforeEach(() => {
    jest.mocked(readConfig).mockResolvedValue(
      ConfigurationOptionsSchema.parse({
        fail_on_severity: 'low',
        base_ref: 'base',
        head_ref: 'head'
      })
    )
  })

  test.each([false, true])(
    'preserves API errors when repository.private is %s',
    async repoIsPrivate => {
      github.context.payload.repository = {
        name: 'repo',
        owner: {login: 'owner'},
        private: repoIsPrivate
      }
      const failures = [
        {
          status: 403,
          message: 'API rate limit exceeded for installation ID 123.'
        },
        {status: 403, message: 'You have exceeded a secondary rate limit.'},
        {
          status: 429,
          message: 'API rate limit exceeded for installation ID 123.'
        },
        {status: 429, message: 'You have exceeded a secondary rate limit.'},
        {status: 403, message: 'Resource not accessible by integration'},
        {
          status: 403,
          message: 'Dependency review is not supported for this repository.'
        }
      ]

      for (const {status, message} of failures) {
        jest.clearAllMocks()
        const writeSummary = jest.spyOn(core.summary, 'write')
        jest.mocked(compare).mockRejectedValueOnce(
          new RequestError(message, status, {
            request: {
              method: 'GET',
              url: '/repos/owner/repo/dependency-graph/compare/base...head',
              headers: {}
            }
          })
        )

        await run()

        expect(compare).toHaveBeenCalledWith({
          owner: 'owner',
          repo: 'repo',
          baseRef: 'base',
          headRef: 'head'
        })
        expect(core.setFailed).toHaveBeenCalledTimes(1)
        expect(core.setFailed).toHaveBeenCalledWith(message)
        expect(core.setOutput).not.toHaveBeenCalled()
        expect(writeSummary).toHaveBeenCalledTimes(1)
      }
    }
  )

  test('preserves the existing diagnostic for missing dependency data', async () => {
    jest.mocked(compare).mockRejectedValueOnce(
      new RequestError('Not Found', 404, {
        request: {method: 'GET', url: '/compare', headers: {}}
      })
    )

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Dependency review could not obtain dependency data for the specified owner, repository, or revision range.'
    )
  })

  test('preserves non-HTTP errors', async () => {
    jest.mocked(compare).mockRejectedValueOnce(new Error('Connection failed'))

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Connection failed')
  })

  test('reports unexpected failures', async () => {
    jest.mocked(compare).mockRejectedValueOnce('unexpected')

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Unexpected fatal error')
  })
})

describe('handleLargeSummary', () => {
  let writeFileSpy: SpyInstance<typeof fs.promises.writeFile>

  beforeEach(() => {
    process.env = {...ORIGINAL_ENV}
    writeFileSpy = jest
      .spyOn(fs.promises, 'writeFile')
      .mockImplementation(async () => undefined)
    DefaultArtifactClientMock.mockClear()
    DefaultArtifactClientMock.mockImplementation(() => createArtifactClient())
  })

  afterEach(() => {
    writeFileSpy.mockRestore()
    jest.clearAllMocks()
    process.env = {...ORIGINAL_ENV}
  })

  test('returns original summary when under size threshold', async () => {
    const summaryContent = 'short summary'

    const result = await handleLargeSummary(summaryContent)

    expect(result).toBe(summaryContent)
    expect(writeFileSpy).not.toHaveBeenCalled()
    expect(DefaultArtifactClientMock).not.toHaveBeenCalled()
  })

  test('uploads artifact and returns minimal summary when summary is too large', async () => {
    process.env.GITHUB_SERVER_URL = 'https://github.com'
    process.env.GITHUB_REPOSITORY = 'owner/repo'
    process.env.GITHUB_RUN_ID = '12345'

    const largeSummary = 'a'.repeat(1024 * 1024 + 1)

    const result = await handleLargeSummary(largeSummary)

    expect(writeFileSpy).toHaveBeenCalledTimes(1)
    expect(writeFileSpy).toHaveBeenCalledWith('summary.md', largeSummary)
    expect(DefaultArtifactClientMock).toHaveBeenCalledTimes(1)

    const artifactInstance = DefaultArtifactClientMock.mock.results[0]
      ?.value as ArtifactClientInstance

    expect(artifactInstance.uploadArtifact).toHaveBeenCalledWith(
      'dependency-review-summary',
      ['summary.md'],
      '.',
      {retentionDays: 1}
    )

    expect(result).toContain('# Dependency Review Summary')
    expect(result).toContain('dependency-review-summary')
    expect(result).toContain('actions/runs/12345')
  })

  test('returns truncated summary and replaces buffer when artifact upload fails', async () => {
    const warningMock = core.warning as jest.Mock
    const emptyBufferMock = core.summary.emptyBuffer as jest.Mock
    const addRawMock = core.summary.addRaw as jest.Mock
    warningMock.mockClear()
    emptyBufferMock.mockClear()
    addRawMock.mockClear()
    const largeSummary = 'b'.repeat(1024 * 1024 + 1)

    DefaultArtifactClientMock.mockImplementation(() => ({
      uploadArtifact: jest.fn(async () => {
        throw new Error('upload failed')
      })
    }))

    const result = await handleLargeSummary(largeSummary)

    // Should NOT return the original oversized content
    expect(result).not.toBe(largeSummary)
    // Should return a truncated summary
    expect(result).toContain('Dependency Review Summary')
    expect(result).toContain('too large to display')
    // Should replace the core.summary buffer to prevent write() from failing
    expect(emptyBufferMock).toHaveBeenCalled()
    expect(addRawMock).toHaveBeenCalledWith(result)
    expect(warningMock).toHaveBeenCalledWith(
      expect.stringContaining('Failed to upload large summary as artifact')
    )
  })
})
