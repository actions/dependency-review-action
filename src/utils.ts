import * as core from '@actions/core'
import {Octokit} from 'octokit'
import spdxParse from 'spdx-expression-parse'
import {Changes} from './schemas'

export function groupDependenciesByManifest(
  changes: Changes
): Map<string, Changes> {
  const dependencies: Map<string, Changes> = new Map()
  for (const change of changes) {
    const manifestName = change.manifest

    if (dependencies.get(manifestName) === undefined) {
      dependencies.set(manifestName, [])
    }

    dependencies.get(manifestName)?.push(change)
  }

  return dependencies
}

export function getManifestsSet(changes: Changes): Set<string> {
  return new Set(changes.flatMap(c => c.manifest))
}

export function renderUrl(url: string | null, text: string): string {
  if (url) {
    return `<a href="${url}">${text}</a>`
  } else {
    return text
  }
}

export function isSPDXValid(license: string): boolean {
  try {
    spdxParse(license)
    return true
  } catch (_) {
    return false
  }
}

// function to check if a value is not null or undefined
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function isEnterprise(): boolean {
  const serverUrl = new URL(
    process.env['GITHUB_SERVER_URL'] ?? 'https://github.com'
  )
  return serverUrl.hostname.toLowerCase() !== 'github.com'
}

export function octokitClient(token = 'repo-token', required = true): Octokit {
  const opts: Record<string, unknown> = {}

  // auth is only added if token is present. For remote config files in public
  // repos the token is optional, so it could be undefined.
  const auth = core.getInput(token, {required})
  if (auth !== undefined) {
    opts['auth'] = auth
  }

  //baseUrl is required for GitHub Enterprise Server
  //https://github.com/octokit/octokit.js/blob/9c8fa89d5b0bc4ddbd6dec638db00a2f6c94c298/README.md?plain=1#L196
  if (isEnterprise()) {
    opts['baseUrl'] = new URL('api/v3', process.env['GITHUB_SERVER_URL'])
  }

  return new Octokit(opts)
}
