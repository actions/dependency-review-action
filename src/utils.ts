import * as core from '@actions/core'
import {Octokit} from 'octokit'
import {Changes} from './schemas'

export function groupDependenciesByManifest(
  changes: Changes
): Map<string, Changes> {
  const dependencies: Map<string, Changes> = new Map()
  for (const change of changes) {
    // If the manifest is null or empty, give it a name now to avoid
    // breaking the HTML rendering later
    const manifestName = change.manifest || 'Unnamed Manifest'

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

export function isEnterprise(): boolean {
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
