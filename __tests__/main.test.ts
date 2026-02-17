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
import {DefaultArtifactClient} from '@actions/artifact'
import type {SpyInstance} from 'jest-mock'
import {handleLargeSummary} from '../src/main'

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
jest.mock('../src/dependency-graph', () => ({}))
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
