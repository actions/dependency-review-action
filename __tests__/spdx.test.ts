import {expect, test} from '@jest/globals'
import * as spdx from '../src/spdx'

test('satisfiesAny', () => {
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
    let got: boolean = spdx.satisfiesAny(unit.candidate, unit.licenses)
    if (got != unit.expected) {
      console.log(
        `failing unit test inputs: candidate(${unit.candidate}) licenses(${unit.licenses})`
      )
    }
    expect(got).toBe(unit.expected)
  }
})

test('satisfiesAll', () => {
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
    let got: boolean = spdx.satisfiesAll(unit.candidate, unit.licenses)
    if (got != unit.expected) {
      console.log(
        `failing unit test inputs: candidate(${unit.candidate}) licenses(${unit.licenses})`
      )
    }
    expect(got).toBe(unit.expected)
  }
})

test('satisfies', () => {
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
    let got: boolean = spdx.satisfies(unit.candidate, unit.constraint)
    if (got != unit.expected) {
      console.log(
        `failing unit test inputs: candidateExpr(${unit.candidate}) constraintExpr(${unit.constraint})`
      )
    }
    expect(got).toBe(unit.expected)
  }
})

test('isValid', () => {
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
    let got: boolean = spdx.isValid(unit.candidate)
    if (got != unit.expected) {
      console.log(`failing unit test inputs: candidateExpr(${unit.candidate})`)
    }
    expect(got).toBe(unit.expected)
  }
})
