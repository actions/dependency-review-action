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
    },
    {
      candidate: 'MIT AND OTHER',
      licenses: ['MIT'],
      expected: false
    },
    {
      candidate: 'MIT OR OTHER',
      licenses: ['MIT', 'LicenseRef-clearlydefined-OTHER'],
      expected: true
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
    },
    {
      candidate: 'MIT AND OTHER',
      licenses: ['MIT'],
      expected: false
    },
    {
      candidate: 'MIT AND OTHER',
      licenses: ['MIT', 'LicenseRef-clearlydefined-OTHER'],
      expected: true
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
      allowList: ['MIT'],
      expected: true
    },
    {
      candidate: 'Apache-2.0',
      allowList: ['MIT'],
      expected: false
    },
    {
      candidate: 'MIT OR Apache-2.0',
      allowList: ['MIT'],
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      allowList: ['Apache-2.0'],
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      allowList: ['BSD-3-Clause'],
      expected: false
    },
    {
      candidate: 'MIT OR Apache-2.0',
      allowList: ['Apache-2.0', 'BSD-3-Clause'],
      expected: true
    },
    {
      candidate: 'MIT AND Apache-2.0',
      allowList: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: 'MIT OR Apache-2.0',
      allowList: ['MIT', 'Apache-2.0'],
      expected: true
    },
    {
      candidate: 'ISC OR (MIT AND Apache-2.0)',
      allowList: ['MIT', 'Apache-2.0'],
      expected: true
    },

    // missing params, case sensitivity, syntax problems,
    // or unknown licenses will return 'false'
    {
      candidate: 'MIT',
      allowList: ['MiT'],
      expected: false
    },
    {
      candidate: 'MIT AND (ISC OR',
      allowList: ['MIT'],
      expected: false
    },
    {
      candidate: 'MIT OR ISC OR Apache-2.0',
      allowList: [],
      expected: false
    },
    {
      candidate: '',
      allowList: ['BSD-3-Clause', 'ISC', 'MIT'],
      expected: false
    },
    {
      candidate: 'MIT OR OTHER',
      allowList: ['MIT', 'LicenseRef-clearlydefined-OTHER'],
      expected: true
    },
    {
      candidate: '(Apache-2.0 AND OTHER) OR (MIT AND OTHER)',
      allowList: ['Apache-2.0', 'LicenseRef-clearlydefined-OTHER'],
      expected: true
    }
  ]

  for (const unit of units) {
    const got: boolean = spdx.satisfies(unit.candidate, unit.allowList)
    test(`should return ${unit.expected} for ("${unit.candidate}", "${unit.allowList}")`, () => {
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
    },
    {
      candidate: 'MIT AND OTHER',
      expected: true
    }
  ]
  for (const unit of units) {
    const got: boolean = spdx.isValid(unit.candidate)
    test(`should return ${unit.expected} for ("${unit.candidate}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})

describe('cleanInvalidSPDX', () => {
  const units = [
    {
      candidate: 'MIT',
      expected: 'MIT'
    },
    {
      candidate: 'OTHER',
      expected: 'LicenseRef-clearlydefined-OTHER'
    },
    {
      candidate: 'LicenseRef-clearlydefined-OTHER',
      expected: 'LicenseRef-clearlydefined-OTHER'
    },
    {
      candidate: 'OTHER AND MIT',
      expected: 'LicenseRef-clearlydefined-OTHER AND MIT'
    },
    {
      candidate: 'MIT AND OTHER',
      expected: 'MIT AND LicenseRef-clearlydefined-OTHER'
    },
    {
      candidate: 'MIT AND SomethingElse-OTHER',
      expected: 'MIT AND SomethingElse-OTHER'
    }
  ]
  for (const unit of units) {
    const got: string = spdx.cleanInvalidSPDX(unit.candidate)
    test(`should return ${unit.expected} for ("${unit.candidate}")`, () => {
      expect(got).toBe(unit.expected)
    })
  }
})
