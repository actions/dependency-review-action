import {expect, test, describe} from '@jest/globals'
import * as spdx from '../src/spdx'

describe('isValid', () => {
  test('returns true on valid expressions', async () => {
    const license = 'MIT'
    expect(spdx.isValid(license)).toBe(true)
  })

  test('returns false on invalid expressions', async () => {
    const license = 'nope'
    expect(spdx.isValid(license)).toBe(false)
  })
})

describe('satisfies', () => {
  test('returns true if a license satisfies a constraint', async () => {
    const license = 'MIT'
    const expr = 'MIT OR GPL-2.0'
    expect(spdx.satisfies(license, expr)).toBe(true)
  })

  test('works on AND expressions', () => {
    const license = 'GPL-2.0 AND GPL-3.0'
    const expr = 'MIT OR (GPL-2.0 AND GPL-3.0)'
    expect(spdx.satisfies(license, expr)).toBe(true)
  })

  test('-only expressions are properly parsed', () => {
    const license = 'GPL-3.0'
    const expr = 'GPL-3.0-only'
    expect(spdx.satisfies(license, expr)).toBe(true)
  })

  test('-or-later expressions are properly parsed', () => {
    const license = 'GPL-3.0'
    const expr = 'GPL-2.0-or-later'
    expect(spdx.satisfies(license, expr)).toBe(true)
  })

  test('GPL expressions are supported', () => {
    const license = 'GPL-2.0'
    const expr = 'GPL-3.0-or-later'
    expect(spdx.satisfies(license, expr)).toBe(false)
  })

  test('returns false if no matches are found', async () => {
    const license = 'ISC'
    const expr = 'MIT OR GPL-2.0'

    expect(spdx.satisfies(license, expr)).toBe(false)
  })
})
