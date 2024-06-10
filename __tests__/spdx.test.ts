import {expect, test, describe} from '@jest/globals'
import * as spdx from '../src/spdx'

describe('satisfiesAny', () => {
  const units = [
    {
      candidate: 'MIT',
      licenses: ['MIT'],
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      licenses: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: '(MIT AND ISC) OR Apache-2.0',
      licenses: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: 'MIT AND Apache-2.0',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT AND BSD-3-Clause',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },

    // missing params, case sensitivity, syntax problems,
    // or unknown licenses will return 'false'
    {
      candidate: 'MIT OR',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: '',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT OR (Apache-2.0 AND ISC)',
      licenses: [],
      expected: false
    },
    {
      candidate: 'MIT AND (ISC',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT OR ISC',
      licenses: ['MiT'],
      expected: false
    }
  ]

  for (const unit of units) {
    const got: boolean = spdx.satisfiesAny(unit.candidate, unit.licenses)
    test(`should return ${unit.expected} for ("${unit.candidate}", "${unit.licenses}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})

describe('satisfiesAll', () => {
  const units = [
    {
      candidate: 'MIT',
      licenses: ['MIT'],
      expected: true
    },
    {
      candidate: 'Apache-2.0',
      licenses: ['MIT', 'ISC', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT AND Apache-2.0',
      licenses: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: '(MIT OR ISC) AND Apache-2.0',
      licenses: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: 'MIT OR BSD-3-Clause',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'BSD-3-Clause OR ISC',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: '(MIT AND ISC) OR Apache-2.0',
      licenses: ['MIT', 'ISC'],
      expected: true
    },

    // missing params, case sensitivity, syntax problems,
    // or unknown licenses will return 'false'
    {
      candidate: 'MIT OR',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: '',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT OR (Apache-2.0 AND ISC)',
      licenses: [],
      expected: false
    },
    {
      candidate: 'MIT AND (ISC',
      licenses: ['MIT', 'Apache-2.0'],
      expected: false
    },
    {
      candidate: 'MIT OR ISC',
      licenses: ['MiT'],
      expected: false
    }
  ]

  for (const unit of units) {
    const got: boolean = spdx.satisfiesAll(unit.candidate, unit.licenses)
    test(`should return ${unit.expected} for ("${unit.candidate}", "${unit.licenses}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})

describe('satisfies', () => {
  const units = [
    {
      candidate: 'MIT',
      constraint: 'MIT',
      expected: true
    },
    {
      candidate: 'Apache-2.0',
      constraint: 'MIT',
      expected: false
    },
    {
      candidate: 'MIT OR Apache-2.0',
      constraint: 'MIT',
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      constraint: 'Apache-2.0',
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      constraint: 'BSD-3-Clause',
      expected: false
    },
    {
      candidate: 'MIT OR Apache-2.0',
      constraint: 'Apache-2.0 OR BSD-3-Clause',
      expected: true
    },
    {
      candidate: 'MIT AND Apache-2.0',
      constraint: 'MIT AND Apache-2.0',
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      constraint: 'MIT AND Apache-2.0',
      expected: false
    },
    {
      candidate: 'ISC OR (MIT AND Apache-2.0)',
      constraint: 'MIT AND Apache-2.0',
      expected: true
    },

    // missing params, case sensitivity, syntax problems,
    // or unknown licenses will return 'false'
    {
      candidate: 'MIT',
      constraint: 'MiT',
      expected: false
    },
    {
      candidate: 'MIT AND (ISC OR',
      constraint: 'MIT',
      expected: false
    },
    {
      candidate: 'MIT OR ISC OR Apache-2.0',
      constraint: '',
      expected: false
    },
    {
      candidate: '',
      constraint: '(BSD-3-Clause AND ISC) OR MIT',
      expected: false
    }
  ]

  for (const unit of units) {
    const got: boolean = spdx.satisfies(unit.candidate, unit.constraint)
    test(`should return ${unit.expected} for ("${unit.candidate}", "${unit.constraint}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})

describe('isValid', () => {
  const units = [
    {
      candidate: 'MIT',
      expected: true
    },
    {
      candidate: 'MIT AND BSD-3-Clause',
      expected: true
    },
    {
      candidate: '(MIT AND ISC) OR BSD-3-Clause',
      expected: true
    },
    {
      candidate: 'NOASSERTION',
      expected: false
    },
    {
      candidate: 'Foobar',
      expected: false
    },
    {
      candidate: '',
      expected: false
    }
  ]
  for (const unit of units) {
    const got: boolean = spdx.isValid(unit.candidate)
    test(`should return ${unit.expected} for ("${unit.candidate}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})
