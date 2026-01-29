import { Agent } from "@/agent/agent"
import { LLM } from "./llm"
import { Log } from "@/util/log"

export namespace LLMQueue {
  const log = Log.create({ service: "llm.queue" })

  export enum Priority {
    TITLE = 0,
    SUMMARY = 1,
    COMPACTION = 2,
  }

  type Task = {
    id: string
    input: LLM.StreamInput
    priority: Priority
    resolve: (result: LLM.StreamOutput) => void
    reject: (error: Error) => void
    createdAt: number
  }

  const queue: Task[] = []
  let running = 0
  let maxConcurrency = 2

  export function configure(concurrency: number) {
    maxConcurrency = concurrency
    log.info("queue configured", { maxConcurrency })
  }

  export async function enqueue(input: LLM.StreamInput, priority: Priority): Promise<LLM.StreamOutput> {
    return new Promise((resolve, reject) => {
      const task: Task = {
        id: `${Date.now()}-${Math.random()}`,
        input,
        priority,
        resolve,
        reject,
        createdAt: Date.now(),
      }

      queue.push(task)
      queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.createdAt - b.createdAt
      })

      log.info("task enqueued", {
        id: task.id,
        priority: Priority[task.priority],
        queueLength: queue.length,
        running,
      })

      process()
    })
  }

  async function process() {
    if (running >= maxConcurrency || queue.length === 0) return

    running++
    const task = queue.shift()!

    log.info("processing task", {
      id: task.id,
      priority: Priority[task.priority],
      queueLength: queue.length,
      running,
    })

    try {
      const result = await LLM.stream(task.input)
      task.resolve(result)
      log.info("task completed", { id: task.id })
    } catch (err: any) {
      log.error("task failed", { id: task.id, error: err })
      task.reject(err instanceof Error ? err : new Error(String(err)))
    } finally {
      running--
      process()
    }
  }

  export function getStats() {
    return {
      queueLength: queue.length,
      running,
      maxConcurrency,
    }
  }
}
