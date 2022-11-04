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

export function octokitClient(token = 'repo-token', required = true): Octokit {
  const opts: Record<string, unknown> = {}

  // auth is only added if token is present.
  // For remote-config-files in public repos, the token is optional so it could be undefined
  const auth = core.getInput(token, {required})
  if (auth !== undefined) {
    opts['auth'] = auth
  }

  return new Octokit(opts)
}
