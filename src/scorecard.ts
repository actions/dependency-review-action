import {Change, Scorecard, ScorecardApi} from './schemas'
import * as core from '@actions/core'

export async function getScorecardLevels(
  changes: Change[]
): Promise<Scorecard> {
  const data: Scorecard = {dependencies: []} as Scorecard
  for (const change of changes) {
    const ecosystem = change.ecosystem
    const packageName = change.name
    const version = change.version

    //Get the project repository
    let repositoryUrl = change.source_repository_url
    //If the repository_url includes the protocol, remove it
    if (repositoryUrl?.startsWith('https://')) {
      repositoryUrl = repositoryUrl.replace('https://', '')
    }

    // Handle the special case for GitHub Actions, where the repository URL is null
    if (ecosystem === 'actions') {
      // The package name for GitHub Actions in the API is in the format `owner/repo/`, so we can use that to get the repository URL
      // If the package name has more than 2 slashes, it's referencing a sub-action, and we need to strip the last part out
      const parts = packageName.split('/')
      repositoryUrl = `github.com/${parts[0]}/${parts[1]}` // e.g. github.com/actions/checkout
    }

    // If GitHub API doesn't have the repository URL, query deps.dev for it.
    if (!repositoryUrl) {
      // Call the deps.dev API to get the repository URL from there
      repositoryUrl = await getProjectUrl(ecosystem, packageName, version)
    }

    // Get the scorecard API response from the scorecards API
    let scorecardApi: ScorecardApi | null = null
    if (repositoryUrl) {
      try {
        scorecardApi = await getScorecard(repositoryUrl)
      } catch (error: unknown) {
        core.debug(`Error querying for scorecard: ${(error as Error).message}`)
      }
    }
    data.dependencies.push({
      change,
      scorecard: scorecardApi
    })
  }
  return data
}

async function getScorecard(repositoryUrl: string): Promise<ScorecardApi> {
  const apiRoot = 'https://api.securityscorecards.dev'
  let scorecardResponse: ScorecardApi = {} as ScorecardApi

  const url = `${apiRoot}/projects/${repositoryUrl}`
  const response = await fetch(url)
  if (response.ok) {
    scorecardResponse = await response.json()
  } else {
    core.debug(`Couldn't get scorecard data for ${repositoryUrl}`)
  }
  return scorecardResponse
}

export async function getProjectUrl(
  ecosystem: string,
  packageName: string,
  version: string
): Promise<string> {
  core.debug(`Getting deps.dev data for ${packageName} ${version}`)
  const depsDevAPIRoot = 'https://api.deps.dev'
  const url = `${depsDevAPIRoot}/v3alpha/systems/${ecosystem}/packages/${packageName}/versions/${version}`
  const response = await fetch(url)
  if (response.ok) {
    const data = await response.json()
    if (data.relatedProjects.length > 0) {
      return data.relatedProjects[0].projectKey.id
    }
  }
  return ''
}
