import * as z from 'zod'

// the basic purl type, containing ecosystem, namespace, name, and version.
// other than ecosystem, all fields are nullable. this is for maximum flexibility
// at the cost of strict adherence to the package-url spec.
export const PurlSchema = z.object({
  type: z.string(),
  namespace: z.string().nullable(),
  name: z.string().nullable(), // name is nullable for deny-groups
  version: z.string().nullable(),
  original: z.string(),
  error: z.string().nullable()
})

export type PackageURL = z.infer<typeof PurlSchema>

const PURL_ECOSYSTEM = /pkg:([a-zA-Z0-9-_]+)\/.*/

export function parsePURL(purl: string): PackageURL {
  const result: PackageURL = {
    type: '',
    namespace: null,
    name: null,
    version: null,
    original: purl,
    error: null
  }
  if (!purl.startsWith('pkg:')) {
    result.error = 'purl must start with "pkg:"'
    return result
  }
  const ecosystem = purl.match(PURL_ECOSYSTEM)
  if (ecosystem === null) {
    result.error = 'purl must contain an ecosystem'
    return result
  }
  result.type = ecosystem[1]
  const parts = purl.split('/')
  // the first 'part' should be 'pkg:ecosystem'
  if (parts.length < 2 || parts[1].length === 0) {
    result.error = 'purl must contain a namespace or name'
    return result
  }
  let namePlusRest: string
  if (parts.length === 2) {
    namePlusRest = parts[1]
  } else {
    result.namespace = decodeURIComponent(parts[1])
    namePlusRest = parts[2]
  }
  const name = namePlusRest.match(/([^@#?]+)[@#?]?.*/)
  if (name === null) {
    // we're done here
    return result
  }
  result.name = decodeURIComponent(name[1])
  const version = namePlusRest.match(/@([^#?]+)[#?]?.*/)
  if (version === null) {
    return result
  }
  result.version = decodeURIComponent(version[1])

  // we don't parse subpath or attributes, so we're done here
  return result
}
