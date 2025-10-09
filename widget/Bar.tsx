import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"
import { Accessor, createState, For, With } from "ags"
import AstalHyprland from "gi://AstalHyprland?version=0.1"

export default async function Bar(gdkmonitor: Gdk.Monitor) {
  const hyprland = AstalHyprland.get_default()
  const time = createPoll("", 1000, "date")
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const [currentWorkspace, setCurrentWorkspace] = createState(hyprland.get_focused_workspace().get_id())

  const [workspaces, setWorkspaces] = createState(hyprland.get_workspaces().sort((a, b) => a.get_id() - b.get_id()))

  hyprland.connect("notify::focused-workspace", () => {
    const workspace = hyprland.get_focused_workspace().get_id()
    setCurrentWorkspace(workspace)
  })

  const refreshWorkspaces = () => {
    setWorkspaces(
      Array.from(hyprland.get_workspaces())
        .filter(ws => ws.get_id() > 0)
        .sort((a, b) => a.get_id() - b.get_id())
    )
  }

  hyprland.connect("workspace-added", refreshWorkspaces)
  hyprland.connect("workspace-removed", refreshWorkspaces)
  refreshWorkspaces()

  return (
    <window
      visible
      name="bar"
      class="Bar"
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      application={app}
    >
      <centerbox cssName="centerbox">
        <box $type="start" class="workspace-container">
          <For each={workspaces}>
            {(item) => (
              <button
                $type="start"
                cssClasses={currentWorkspace.as((cw) => [
                  "workspace-btn",
                  item.get_id() === cw ? "active" : "inactive",
                ])}
                halign={Gtk.Align.CENTER}
              >
                <label label={item.get_id().toString()} />
              </button>
            )}
          </For>
        </box>
        <box $type="center">
          <label label="Hi" />
        </box>
        <menubutton $type="end" halign={Gtk.Align.CENTER}>
          <label label={time} />
          <popover>
            <Gtk.Calendar />
          </popover>
        </menubutton>
      </centerbox>
    </window>
  )
}
