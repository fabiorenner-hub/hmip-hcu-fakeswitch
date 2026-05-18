> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

# HMIP HCU Plugin: Fake Switches

A Homematic IP Home Control Unit (HCU) plugin that exposes virtual switches
(and an optional dimmable light) in the HMIP app. Useful for testing
automations, scenes and groups without real hardware.

Built and validated against the official
[Homematic IP Connect API](https://github.com/homematicip/connect-api)
(documentation revision `1.0.1`).

## Devices in the HMIP app

- **Fake Switch 1..N** — `SWITCH` with `switchState`, `onTime`, `maintenance`
- **Fake Light** (optional) — `LIGHT` with `switchState`, `dimming`, `onTime`, `maintenance`

All switch states are persisted in `/data/state.json`, surviving restarts and
plugin updates.

## Install on your HCU

1. Download `hmip-plugin-fake-switches-<version>.tar.gz` from the
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases).
2. In HCUweb open *Developer mode → Plugins → Upload* and choose the file.
3. Configure under *Plugins → Fake Switches → Configure*.

## Configuration via the HCU UI

After installing, in *Plugins → Fake Switches → Configure*:

**Switches group**
- **Number of switches** — 1 to 20
- **Name prefix** — for switches without an individual name
- **Individual names** (optional) — one name per line; order = switch number

**Light group**
- **Create fake light** — boolean
- **Light name**

**Extras group**
- **Attach maintenance feature** — reports `unreach/lowBat/sabotage = false`

## Supported API messages

The plugin handles all messages relevant for local device plugins:

| Direction         | Message |
| ----------------- | ------- |
| HCU → plugin      | `PLUGIN_STATE_REQUEST`, `DISCOVER_REQUEST`, `STATUS_REQUEST` (with `deviceIds` filter), `CONTROL_REQUEST`, `CONFIG_TEMPLATE_REQUEST`, `CONFIG_UPDATE_REQUEST`, `INCLUSION_EVENT`, `EXCLUSION_EVENT`, `USER_MESSAGE_ACK_EVENT`, `ERROR_RESPONSE` |
| plugin → HCU      | `PLUGIN_STATE_RESPONSE` (with localized `friendlyName`), `DISCOVER_RESPONSE`, `STATUS_RESPONSE`, `STATUS_EVENT`, `CONTROL_RESPONSE`, `CONFIG_TEMPLATE_RESPONSE`, `CONFIG_UPDATE_RESPONSE` |

## Prerequisites

- HCU with developer mode enabled (firmware ≥ 1.4.7)
- Docker with `buildx` (only needed if you want to build the image yourself)

## Test locally without a container

```bash
cd hmip-plugin-fake-switches
npm install
# Save the HCU auth token to authtoken.txt, then:
node plugin.js de.example.plugin.fakeswitches hcu1-XXXX.local authtoken.txt
```

On non-Linux hosts, redirect data with `FAKE_DATA_DIR`:

```bash
FAKE_DATA_DIR=./data node plugin.js ...
```

## First-start defaults

| Variable              | Meaning                              | Default          |
| --------------------- | ------------------------------------ | ---------------- |
| `FAKE_SWITCH_COUNT`   | number of switches                   | `4`              |
| `FAKE_SWITCH_NAMES`   | comma/semicolon separated names      | —                |
| `FAKE_NAME_PREFIX`    | prefix for auto-generated names      | `Fake-Schalter`  |
| `FAKE_LIGHT_ENABLED`  | enable the fake light                | `true`           |
| `FAKE_LIGHT_NAME`     | display name of the fake light       | `Fake-Lampe`     |
| `FAKE_MAINTENANCE`    | include maintenance feature          | `true`           |

## Build and install on the HCU

```bash
# Build + export
./build.sh            # Linux/macOS
# or
.\build.ps1           # Windows

# Result: hmip-plugin-fake-switches-<version>.tar.gz
# Upload via HCUweb -> Plugins -> Upload
```

## Notes

- Switching from the web/app produces a `CONTROL_REQUEST`. The plugin
  applies the new state, persists it, acknowledges with `CONTROL_RESPONSE`
  and reports the change as a `STATUS_EVENT`.
- If the HCU also sends `onTime` in the `CONTROL_REQUEST`, the plugin
  schedules an auto-off and emits another `STATUS_EVENT` when it fires.
- For the light, `dimLevel > 0` implies `switchState.on = true`,
  `dimLevel = 0` implies `on = false` — same as real HMIP dimmers.
- After `INCLUSION_EVENT` the plugin sends a `STATUS_RESPONSE` with the
  current state of the included devices.
- The plugin reacts to the HMIP app and to HMIP automations but does not
  poll any external system. Purely virtual.

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Connect API documentation 1.0.1](https://github.com/homematicip/connect-api/blob/main/connect-api-documentation-1.0.1.html)

## License

Apache-2.0
