import {expect, test} from '@jest/globals'
import {parsePURL} from '../src/purl'

test('parsePURL returns an error if the purl does not start with "pkg:"', () => {
  const purl = 'not-a-purl'
  const result = parsePURL(purl)
  expect(result.error).toEqual('purl must start with "pkg:"')
})

test('parsePURL returns an error if the purl does not contain an ecosystem', () => {
  const purl = 'pkg:/'
  const result = parsePURL(purl)
  expect(result.error).toEqual('purl must contain an ecosystem')
})

test('parsePURL returns an error if the purl does not contain a namespace or name', () => {
  const purl = 'pkg:ecosystem/'
  const result = parsePURL(purl)
  expect(result.type).toEqual('ecosystem')
  expect(result.error).toEqual('purl must contain a namespace or name')
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
