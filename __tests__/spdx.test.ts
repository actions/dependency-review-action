import {expect, jest, test} from '@jest/globals'
import * as spdx from '../src/spdx'

test('satisfies', () => {
  expect(spdx.satisfies('MIT', 'MIT')).toBe(true)
})

test('isValid', () => {
  expect(spdx.isValid('MIT')).toBe(true)
  expect(spdx.isValid('FOOBARBAZ')).toBe(false)
})
