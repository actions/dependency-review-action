import {expect, test} from '@jest/globals'
import {parsePURL, purlsMatch} from '../src/purl'

test('parsePURL returns an error if the purl does not start with "pkg:"', () => {
  const purl = 'not-a-purl'
  const result = parsePURL(purl)
  expect(result.error).toEqual('package-url must start with "pkg:"')
})

test('parsePURL returns an error if the purl does not contain a type', () => {
  const purl = 'pkg:/'
  const result = parsePURL(purl)
  expect(result.error).toEqual('package-url must contain a type')
})

test('parsePURL returns an error if the purl does not contain a namespace or name', () => {
  const purl = 'pkg:ecosystem/'
  const result = parsePURL(purl)
  expect(result.type).toEqual('ecosystem')
  expect(result.error).toEqual('package-url must contain a namespace or name')
})

test('parsePURL returns a PURL with the correct values in the happy case', () => {
  const purl = 'pkg:ecosystem/namespace/name@version'
  const result = parsePURL(purl)
  expect(result.type).toEqual('ecosystem')
  expect(result.namespace).toEqual('namespace')
  expect(result.name).toEqual('name')
  expect(result.version).toEqual('version')
  expect(result.original).toEqual(purl)
  expect(result.error).toBeNull()
})

test('parsePURL table test', () => {
  const examples = [
    {
      purl: 'pkg:npm/@n4m3SPACE/Name@^1.2.3',
      expected: {
        type: 'npm',
        namespace: '@n4m3SPACE',
        name: 'Name',
        version: '^1.2.3',
        original: 'pkg:npm/@n4m3SPACE/Name@^1.2.3',
        error: null
      }
    },
    {
      purl: 'pkg:golang/gopkg.in/DataDog/dd-trace-go.v1@1.63.1',
      // Note: this purl is technically invalid, but we can still parse it
      expected: {
        type: 'golang',
        namespace: 'gopkg.in',
        name: 'DataDog/dd-trace-go.v1',
        version: '1.63.1',
        original: 'pkg:golang/gopkg.in/DataDog/dd-trace-go.v1@1.63.1',
        error: null
      }
    },
    {
      purl: 'pkg:golang/github.com/pelletier/go-toml/v2',
      // Note: this purl is technically invalid, but we can still parse it
      expected: {
        type: 'golang',
        namespace: 'github.com',
        name: 'pelletier/go-toml/v2',
        version: null,
        original: 'pkg:golang/github.com/pelletier/go-toml/v2',
        error: null
      }
    },
    {
      purl: 'pkg:npm/%40ns%20foo/n%40me@1.%2f2.3',
      expected: {
        type: 'npm',
        namespace: '@ns foo',
        name: 'n@me',
        version: '1./2.3',
        original: 'pkg:npm/%40ns%20foo/n%40me@1.%2f2.3',
        error: null
      }
    },
    {
      purl: 'pkg:ecosystem/name@version',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: 'name',
        version: 'version',
        original: 'pkg:ecosystem/name@version',
        error: null
      }
    },
    {
      purl: 'pkg:npm/namespace/',
      expected: {
        type: 'npm',
        namespace: 'namespace',
        name: null,
        version: null,
        original: 'pkg:npm/namespace/',
        error: null
      }
    },
    {
      purl: 'pkg:ecosystem/name',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: 'name',
        version: null,
        original: 'pkg:ecosystem/name',
        error: null
      }
    },
    {
      purl: 'pkg:/?',
      expected: {
        type: '',
        namespace: null,
        name: null,
        version: null,
        original: 'pkg:/?',
        error: 'package-url must contain a type'
      }
    },
    {
      purl: 'pkg:ecosystem/#',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: null,
        version: null,
        original: 'pkg:ecosystem/#',
        error: 'package-url must contain a namespace or name'
      }
    },
    {
      purl: 'pkg:ecosystem/name@version#subpath?attributes=123',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: 'name',
        version: 'version',
        original: 'pkg:ecosystem/name@version#subpath?attributes=123',
        error: null
      }
    },
    {
      purl: 'pkg:ecosystem/name@version#subpath',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: 'name',
        version: 'version',
        original: 'pkg:ecosystem/name@version#subpath',
        error: null
      }
    },
    {
      purl: 'pkg:ecosystem/namespace/name@version?attributes',
      expected: {
        type: 'ecosystem',
        namespace: 'namespace',
        name: 'name',
        version: 'version',
        original: 'pkg:ecosystem/namespace/name@version?attributes',
        error: null
      }
    },
    {
      purl: 'pkg:ecosystem/name#subpath?attributes',
      expected: {
        type: 'ecosystem',
        namespace: null,
        name: 'name',
        version: null,
        original: 'pkg:ecosystem/name#subpath?attributes',
        error: null
      }
    }
  ]
  for (const example of examples) {
    const result = parsePURL(example.purl)
    expect(result).toEqual(example.expected)
  }
})

test('purlsMatch matches identical PURLs', () => {
  const a = parsePURL('pkg:npm/@scope/name@1.0.0')
  const b = parsePURL('pkg:npm/@scope/name@2.0.0')
  expect(purlsMatch(a, b)).toBe(true)
})

test('purlsMatch matches when namespace separator is percent-encoded', () => {
  // %2F-encoded separator puts everything in name with no namespace
  const encoded = parsePURL('pkg:npm/%40lancedb%2Flancedb')
  // literal / splits into namespace + name
  const literal = parsePURL('pkg:npm/%40lancedb/lancedb')
  expect(purlsMatch(encoded, literal)).toBe(true)
})

test('purlsMatch matches scoped npm packages regardless of encoding', () => {
  const a = parsePURL('pkg:npm/%40lancedb%2Flancedb')
  const b = parsePURL('pkg:npm/@lancedb/lancedb')
  const c = parsePURL('pkg:npm/%40lancedb/lancedb@0.14.3')
  expect(purlsMatch(a, b)).toBe(true)
  expect(purlsMatch(a, c)).toBe(true)
  expect(purlsMatch(b, c)).toBe(true)
})

test('purlsMatch does not match different packages', () => {
  const a = parsePURL('pkg:npm/@scope/foo')
  const b = parsePURL('pkg:npm/@scope/bar')
  expect(purlsMatch(a, b)).toBe(false)
})

test('purlsMatch does not match different types', () => {
  const a = parsePURL('pkg:npm/@scope/name')
  const b = parsePURL('pkg:pypi/@scope/name')
  expect(purlsMatch(a, b)).toBe(false)
})

test('purlsMatch matches packages without namespaces', () => {
  const a = parsePURL('pkg:npm/lodash@4.0.0')
  const b = parsePURL('pkg:npm/lodash@5.0.0')
  expect(purlsMatch(a, b)).toBe(true)
})

test('purlsMatch is case-insensitive for GitHub Actions', () => {
  const a = parsePURL('pkg:githubactions/MyOrg/MyAction@1.0.0')
  const b = parsePURL('pkg:githubactions/myorg/myaction@1.0.0')
  expect(purlsMatch(a, b)).toBe(true)
})

test('purlsMatch is case-insensitive for scoped npm packages', () => {
  const a = parsePURL('pkg:npm/@MyScope/MyPackage')
  const b = parsePURL('pkg:npm/@myscope/mypackage')
  expect(purlsMatch(a, b)).toBe(true)
})

test('purlsMatch is case-insensitive for GitHub Actions with file paths', () => {
  const a = parsePURL(
    'pkg:githubactions/MyOrg/MyWorkflows/.github/workflows/general.yml'
  )
  const b = parsePURL(
    'pkg:githubactions/myorg/myworkflows/.github/workflows/general.yml'
  )
  expect(purlsMatch(a, b)).toBe(true)
})
