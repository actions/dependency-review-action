import {Change, Changes, DepsDevProject, DepsDevProjectSchema} from './schemas'
import {isSPDXValid, octokitClient} from './utils'
import {PackageURL} from 'packageurl-js'
import * as core from '@actions/core'

export async function getScorecardLevels(changes: Change[]): Promise<any> {
  for (const change of changes) {
    const purl = PackageURL.fromString(change.package_url)
    const ecosystem = purl.type
    const packageName = purl.name
    const version = purl.version
    return getDepsDevData(ecosystem, packageName, String(version))
  }
}

const depsDevAPIRoot = 'https://api.deps.dev'

async function getDepsDevData(
  ecosystem: String,
  packageName: String,
  version: String
): Promise<any> {
  //Query deps.dev GetVersion API
  core.debug(`Getting deps.dev data for ${packageName} ${version}`)
  const url = `${depsDevAPIRoot}//v3alpha/systems/${ecosystem}/packages/${packageName}/versions/${version}`
  const response = await fetch(url)
  const data = await response.json()

  //Get the related projects
  const projects = data.relatedProjects
  for (const project of projects) {
    return getDepsDevProjectData(project.projectKey)
  }
}

async function getDepsDevProjectData(
  projectKey: String
): Promise<DepsDevProject> {
  //Query deps.dev GetProject API
  core.debug(`Getting deps.dev project data for ${projectKey}`)
  const url = `${depsDevAPIRoot}//v3alpha/projects/${projectKey}`
  const response = await fetch(url)
  const data = await response.json()
  return DepsDevProjectSchema.parse(data)
}
