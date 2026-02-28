import { Plugin } from "@/plugin"
import { NotificationMode } from "@/permission/notification"

interface InterventionData {
  type: "permission" | "question" | "idle"
  sessionID: string
  data: any
}

const mainSessions = new Set<string>()

export async function handleSessionCreated(input: { event: any }): Promise<void> {
  if (input.event.type === "session.created") {
    const sessionInfo = input.event.properties.info
    if (!sessionInfo.parentID) {
      mainSessions.add(sessionInfo.id)
    }
  }
}

export async function handleNotificationEvent(input: { event: any }): Promise<void> {
  const eventType = input.event.type

  if (eventType === "permission.asked") {
    const data: InterventionData = {
      type: "permission",
      sessionID: input.event.properties.sessionID,
      data: {
        permissionID: input.event.properties.id,
        permissionType: input.event.properties.permission,
        patterns: input.event.properties.patterns,
        always: input.event.properties.always,
        tool: input.event.properties.tool,
        metadata: input.event.properties.metadata,
      },
    }

    await triggerNotification(data)
  } else if (eventType === "question.asked") {
    const data: InterventionData = {
      type: "question",
      sessionID: input.event.properties.sessionID,
      data: {
        requestID: input.event.properties.id,
        questions: input.event.properties.questions,
        tool: input.event.properties.tool,
      },
    }

    await triggerNotification(data)
  } else if (eventType === "session.status" && input.event.properties.status.type === "idle") {
    const sessionID = input.event.properties.sessionID

    if (!mainSessions.has(sessionID)) {
      return
    }

    const data: InterventionData = {
      type: "idle",
      sessionID: sessionID,
      data: {
        timestamp: Date.now(),
      },
    }

    await triggerNotification(data)
  }
}

async function triggerNotification(data: InterventionData) {
  try {
    if (!NotificationMode.isEnabled()) {
      return
    }
  } catch {
  }

  try {
    await Plugin.trigger(
      "intervention.required",
      {
        type: data.type,
        sessionID: data.sessionID,
        data: data.data,
      },
      { handled: false },
    )
  } catch {}
}

export function cleanupSessionHistory(sessionID: string) {
  mainSessions.delete(sessionID)
}

export function _test_getMainSessions(): ReadonlySet<string> {
  return mainSessions
}

export function _test_clearMainSessions(): void {
  mainSessions.clear()
}
