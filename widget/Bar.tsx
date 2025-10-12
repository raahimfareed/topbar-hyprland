import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { Accessor, createComputed, createState, For, With } from "ags"
import AstalHyprland from "gi://AstalHyprland?version=0.1"
import UPowerGlib from "gi://UPowerGlib?version=1.0"
import AstalNetwork from "gi://AstalNetwork?version=0.1"

export default async function Bar(gdkmonitor: Gdk.Monitor) {
  const hyprland = AstalHyprland.get_default()
  const powerClient = UPowerGlib.Client.new()
  const battery = powerClient.get_display_device();
  const network = AstalNetwork.get_default();
  const wifi = network.get_wifi();

  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  const display = Gdk.Display.get_default()!;
  const iconTheme = Gtk.IconTheme.get_for_display(display);

  const time = createPoll(
    "Loading time...",
    60000,
    "date +\"%A, %d %B %Y, %H:%M\""
  );

  const [currentWorkspace, setCurrentWorkspace] = createState(hyprland.get_focused_workspace());
  const [currentClient, setCurrentClient] = createState(hyprland.get_focused_client());
  const [windowTitle, setWindowTitle] = createState(hyprland.get_focused_client()?.get_title() ?? "");
  const [workspaces, setWorkspaces] = createState(hyprland.get_workspaces().sort((a, b) => a.get_id() - b.get_id()))
  const [batteryPercent, setBatteryPercent] = createState(battery.percentage);
  const [wifiStrength, setWifiStrength] = createState(wifi?.get_strength());
  const [wifiName, setWifiName] = createState(wifi?.get_ssid() ?? "Offline");
  const [isCharging, setIsCharging] = createState(battery.state === UPowerGlib.DeviceState.CHARGING);

  const batteryIcon = createComputed(() => {
    if (isCharging.get()) {
      if (batteryPercent.get() >= 90) return "battery-level-100-charging-symbolic";
      if (batteryPercent.get() >= 70) return "battery-level-80-charging-symbolic";
      if (batteryPercent.get() >= 50) return "battery-level-60-charging-symbolic";
      if (batteryPercent.get() >= 30) return "battery-level-40-charging-symbolic";
      if (batteryPercent.get() >= 10) return "battery-level-20-charging-symbolic";
      return "battery-level-0-charging-symbolic";
    } else {
      if (batteryPercent.get() >= 90) return "battery-level-100-symbolic";
      if (batteryPercent.get() >= 70) return "battery-level-80-symbolic";
      if (batteryPercent.get() >= 50) return "battery-level-60-symbolic";
      if (batteryPercent.get() >= 30) return "battery-level-40-symbolic";
      if (batteryPercent.get() >= 10) return "battery-level-20-symbolic";
      return "battery-level-0-symbolic";
    }
  });

  const wifiIcon = createComputed(() => {
    if (wifiStrength === undefined || wifiStrength.get() === undefined) {
      return "network-wireless-offline-symbolic";
    }

    if (wifiStrength.get()! > 75) return "network-wireless-signal-excellent-symbolic";
    if (wifiStrength.get()! > 50) return "network-wireless-signal-good-symbolic";
    if (wifiStrength.get()! > 25) return "network-wireless-signal-ok-symbolic";
    if (wifiStrength.get()! > 0) return "network-wireless-signal-weak-symbolic";

    return "network-wireless-offline-symbolic";
  });


  hyprland.connect("notify::focused-workspace", () => {
    const workspace = hyprland.get_focused_workspace()
    setCurrentWorkspace(workspace)
  });

  let lastClient: any = null;
  hyprland.connect("notify::focused-client", () => {
    const client = hyprland.get_focused_client();
    setCurrentClient(client);

    if (lastClient) {
      try {
        lastClient.disconnect(lastClient._titleHandlerId);
      } catch (_) {}
    }

    if (!client) {
      setWindowTitle("");
      lastClient = null;
      return;
    }

    setWindowTitle(client?.get_title() ?? "");

    if (client) {
      lastClient = client;
      lastClient._titleHandlerId = client.connect("notify::title", () => {
        setWindowTitle(client.get_title());
      });
    }
  });

  battery.connect("notify::percentage", () => {
    const percent = battery.percentage;
    setBatteryPercent(percent);
  });

  battery.connect("notify::state", () => {
    setIsCharging(battery.state === UPowerGlib.DeviceState.CHARGING);
  });

  wifi?.connect("notify::strength", () => setWifiStrength(wifi!.get_strength()));
  wifi?.connect("notify::ssid", () => setWifiName(wifi!.get_ssid() ?? "Offline"));

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
          class="container workspace-container"
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
                onClicked={() => item.focus()}
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

        <box
          $type="center"
          class="container title-container"
          spacing={6}
          visible={windowTitle.as((t) => t.trim() !== "")}
        >
          <image
            iconName={currentClient.as(
              (client) => client?.get_class() ?? "application-default-icon"
            )}
            pixelSize={16}
          />
          <label label={windowTitle} />
        </box>

        <box $type="end">
          <box class="util-container">
            <box class="container" spacing={6} halign={Gtk.Align.CENTER}>
              <image iconName={batteryIcon} pixelSize={16} />
              <label label={batteryPercent((v) => v.toString() + "%")} />
            </box>

            <box class="container" spacing={6} halign={Gtk.Align.CENTER}>
              <image iconName={wifiIcon} pixelSize={16} />
              <label label={wifiName} />
            </box>
          </box>

          <box class="container time-container">
            <label class="time" label={time} />
          </box>
        </box>
      </centerbox>
    </window>
  )
}
