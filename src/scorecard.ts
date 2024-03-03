import {
  Change,
  Changes,
  DepsDevProject,
  DepsDevProjectSchema,
  Scorecard,
  ScorecardSchema
} from './schemas'
import {isSPDXValid, octokitClient} from './utils'
import {PackageURL} from 'packageurl-js'
import * as core from '@actions/core'

export async function getScorecardLevels(
  changes: Change[]
): Promise<Scorecard> {
  const data: Scorecard = {} as Scorecard
  for (const change of changes) {
    try {
      const ecosystem = change.ecosystem
      const packageName = change.name
      const version = change.version
      const depsDevResponse: DepsDevProject = await getDepsDevData(
        ecosystem,
        packageName,
        version
      )

      data.dependencies.push({
        ecosystem,
        packageName,
        version,
        depsDevData: depsDevResponse
      })
    } catch (error: any) {
      core.debug(`Error querying for depsDevData: ${error.message}`)
    }
  }
  return data
}

const depsDevAPIRoot = 'https://api.deps.dev'

async function getDepsDevData(
  ecosystem: String,
  packageName: String,
  version: any
): Promise<DepsDevProject> {
  try {
    core.debug(`Getting deps.dev data for ${packageName} ${version}`)
    const url = `${depsDevAPIRoot}/v3alpha/systems/${ecosystem}/packages/${packageName}/versions/${version}`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      const projects = data.relatedProjects
      for (const project of projects) {
        return await getDepsDevProjectData(project.projectKey.id)
      }
    } else {
      throw new Error(
        `Failed to fetch data with status code: ${response.status}`
      )
    }
  } catch (error: any) {
    core.debug(`Error fetching data: ${error.message}`)
  }
  return DepsDevProjectSchema.parse({})
}

async function getDepsDevProjectData(
  projectKeyId: string
): Promise<DepsDevProject> {
  try {
    core.debug(`Getting deps.dev project data for ${projectKeyId}`)
    const url = `${depsDevAPIRoot}/v3alpha/projects/${encodeURIComponent(projectKeyId)}`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      core.debug(`Got deps.dev project data: ${JSON.stringify(data)}`)
      return DepsDevProjectSchema.parse(data)
    } else {
      throw new Error(
        `Failed to fetch project data with status code: ${response.status}`
      )
    }
  } catch (error: any) {
    core.debug(`Error fetching project data: ${error.message}`)
  }
  return DepsDevProjectSchema.parse({})
}
