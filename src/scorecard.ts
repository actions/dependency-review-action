import {Change, Changes, DepsDevProject, DepsDevProjectSchema} from './schemas'
import {isSPDXValid, octokitClient} from './utils'
import {PackageURL} from 'packageurl-js'
import * as core from '@actions/core'

export async function getScorecardLevels(changes: Change[]): Promise<object> {
  const data: any = {dependencies: []}
  for (const change of changes) {
    try {
      const purl = PackageURL.fromString(change.package_url)
      const ecosystem = purl.type
      const packageName = purl.name
      const version = purl.version

      data.dependencies.push({
        purl: purl,
        ecosystem: ecosystem,
        packageName: packageName,
        version: version,
        depsDevData: await getDepsDevData(ecosystem, packageName, version)
      })
    } catch (error: any) {
      core.debug(`Error parsing package url: ${error.message}`)
    }
  }
  return data
}

const depsDevAPIRoot = 'https://api.deps.dev'

async function getDepsDevData(
  ecosystem: String,
  packageName: String,
  version: any
): Promise<object> {
  try {
    core.debug(`Getting deps.dev data for ${packageName} ${version}`)
    const url = `${depsDevAPIRoot}//v3alpha/systems/${ecosystem}/packages/${packageName}/versions/${version}`
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
  return {}
}

async function getDepsDevProjectData(projectKeyId: string): Promise<object> {
  try {
    core.debug(`Getting deps.dev project data for ${projectKeyId}`)
    const url = `${depsDevAPIRoot}/v3alpha/projects/${encodeURIComponent(projectKeyId)}`
    const response = await fetch(url)
    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      throw new Error(
        `Failed to fetch project data with status code: ${response.status}`
      )
    }
  } catch (error: any) {
    core.debug(`Error fetching project data: ${error.message}`)
  }
  return {}
}
