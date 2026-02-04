import { z } from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Instance } from "@/project/instance"
import { TuiEvent } from "@/cli/cmd/tui/event"

export namespace YoloMode {
  const Event = {
    Toggled: BusEvent.define("yolo.toggled", z.object({ enabled: z.boolean() })),
  }

  const state = Instance.state(() => ({ enabled: false }))

  export function toggle() {
    const s = state()
    s.enabled = !s.enabled
    Bus.publish(Event.Toggled, { enabled: s.enabled })
    return s.enabled
  }

  export function isEnabled() {
    return state().enabled
  }

  export function setEnabled(enabled: boolean) {
    const s = state()
    s.enabled = enabled
    Bus.publish(Event.Toggled, { enabled })
  }

  export function init() {
    Bus.subscribe(TuiEvent.CommandExecute, (evt) => {
      if (evt.properties.command === "yolo.toggle") {
        toggle()
      }
    })
  }
}
