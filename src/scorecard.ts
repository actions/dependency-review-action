import {Change, Changes, DepsDevProject, DepsDevProjectSchema} from './schemas'
import {isSPDXValid, octokitClient} from './utils'
import {PackageURL} from 'packageurl-js'

/**
 * Loops through a list of changes, filtering and returning the
 * ones that don't conform to the licenses allow/deny lists.
 * It will also filter out the changes which are defined in the licenseExclusions list.
 *
 * Keep in mind that we don't let users specify both an allow and a deny
 * list in their config files, so this code works under the assumption that
 * one of the two list parameters will be empty. If both lists are provided,
 * we will ignore the deny list.
 * @param {Change[]} changes The list of changes to filter.
 * @param { { allow?: string[], deny?: string[], licenseExclusions?: string[]}} licenses An object with `allow`/`deny`/`licenseExclusions` keys, each containing a list of licenses.
 * @returns {Promise<{Object.<string, Array.<Change>>}} A promise to a Record Object. The keys are strings, unlicensed, unresolved and forbidden. The values are a list of changes
 */

export async function getScorecardLevels(changes: Change[]): Promise<any> {
  changes.forEach((change) => {
    const purl = PackageURL.fromString(change.package_url)
    const ecosystem = purl.type
    const packageName = purl.name
    const version = purl.version
    return getDepsDevData(ecosystem, packageName, String(version));
  });
}

const depsDevAPIRoot = 'https://api.deps.dev'

async function getDepsDevData(ecosystem: String, packageName: String, version: String): Promise<any> {
    //Query deps.dev GetVersion API
    const url = `${depsDevAPIRoot}//v3alpha/systems/${ecosystem}/packages/${packageName}/versions/${version}`;
    const response = await fetch(url);
    const data = await response.json();
    
    //Get the related projects
    const projects = data.relatedProjects;
    projects.forEach((project: any) => {
        return getDepsDevProjectData(project.projectKey);
    })
}

async function getDepsDevProjectData(projectKey: String): Promise<DepsDevProject> {
    //Query deps.dev GetProject API
    const url = `${depsDevAPIRoot}//v3alpha/projects/${projectKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return DepsDevProjectSchema.parse(data);
}

