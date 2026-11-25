import {octokitClient} from './utils'
import type {Endpoints} from '@octokit/types'

type Advisory = Endpoints['GET /advisories/{ghsa_id}']['response']['data']

async function fetchAdvisory(
  client: ReturnType<typeof octokitClient>,
  id: string,
  budget?: AbortSignal
): Promise<Advisory> {
  const options = budget
    ? {
        request: {
          signal: AbortSignal.any([budget, AbortSignal.timeout(10000)]),
          retries: 0
        }
      }
    : {}
  const {data} = await client.request('GET /advisories/{ghsa_id}', {
    ghsa_id: id,
    ...options
  })
  return data
}

export function advisoryLookup(): (
  id: string,
  budget?: AbortSignal
) => Promise<Advisory> {
  let client: ReturnType<typeof octokitClient> | undefined
  const cache = new Map<string, ReturnType<typeof fetchAdvisory>>()
  return async (id, budget) => {
    let result = cache.get(id)
    if (!result) {
      client ??= octokitClient()
      result = fetchAdvisory(client, id, budget)
      cache.set(id, result)
    }
    return result
  }
}

export async function runLookupTasks(
  tasks: (() => Promise<void>)[],
  budget?: AbortSignal
): Promise<void> {
  const remaining = tasks.values()
  async function worker(): Promise<void> {
    while (!budget?.aborted) {
      const task = remaining.next()
      if (task.done) return
      await task.value()
    }
  }
  await Promise.all(Array.from({length: Math.min(10, tasks.length)}, worker))
}
