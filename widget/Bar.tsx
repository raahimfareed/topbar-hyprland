import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { Accessor, createState, For, With } from "ags"
import AstalHyprland from "gi://AstalHyprland?version=0.1"

export default async function Bar(gdkmonitor: Gdk.Monitor) {
  const hyprland = AstalHyprland.get_default()
  const time = createPoll(
    "Loading time...",
    60000,
    "date +\"%A, %d %B %Y, %H:%M\""
  );
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor
  const [currentWorkspace, setCurrentWorkspace] = createState(hyprland.get_focused_workspace())
  const [windowTitle, setWindowTitle] = createState(hyprland.get_focused_client()?.get_title() ?? "");
  const [workspaces, setWorkspaces] = createState(hyprland.get_workspaces().sort((a, b) => a.get_id() - b.get_id()))

  const iconTheme = Gtk.IconTheme.new();

  console.log(iconTheme.iconNames);

  hyprland.connect("notify::focused-workspace", () => {
    const workspace = hyprland.get_focused_workspace()
    setCurrentWorkspace(workspace)
  })

  hyprland.connect("notify::focused-client", () => {
    const client = hyprland.get_focused_client();
    setWindowTitle(client?.get_title() ?? "");
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
        <box
          $type="start"
          class="workspace-container"
          valign={Gtk.Align.CENTER}
          vexpand={false}
        >
          <For each={workspaces}>
            {(item) => (
              <button
                $type="start"
                class="workspace-btn"
                valign={Gtk.Align.CENTER}
                vexpand={false}
                halign={Gtk.Align.CENTER}
                cssClasses={currentWorkspace.as((current) => [
                  'workspace-btn',
                  current.get_id() === item.get_id() ? "active" : "inactive"
                ])}
              >
                <label label={item.get_id().toString()} />
              </button>
            )}
          </For>
        </box>
        <box $type="center" class="title-container">
          <label label={windowTitle} />
        </box>
        <box $type="end">
          <label class="time" label={time} />
        </box>
        {/* <menubutton $type="end" halign={Gtk.Align.CENTER}> */}
        {/*   <label label={time} /> */}
        {/*   <popover> */}
        {/*     <Gtk.Calendar /> */}
        {/*   </popover> */}
        {/* </menubutton> */}
      </centerbox>
    </window>
  )
}
