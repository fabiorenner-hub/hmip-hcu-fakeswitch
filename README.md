> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-fake-switches icon" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Fake Switches

📦 **[Download hmip-plugin-fake-switches-1.1.0.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.1.0.tar.gz)** — install via HCUweb → *Developer mode → Plugins → Install from file*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch>

A Homematic IP Home Control Unit (HCU) plugin that exposes virtual switches
(and an optional dimmable light) in the HMIP app. Useful for testing automations,
scenes and groups without real hardware.

Built and validated against the official
[Homematic IP Connect API](https://github.com/homematicip/connect-api)
(documentation revision `1.0.1`).

## Support this plugin

If this plugin is useful to you, please consider a small donation — it helps
me keep the lights on while building more HCU plugins.

<form action="https://www.paypal.com/donate" method="post" target="_top"><input type="hidden" name="hosted_button_id" value="JPZRATUUHRT5C" /><input type="image" src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Spenden mit dem PayPal-Button" /><img alt="" border="0" src="https://www.paypal.com/de_DE/i/scr/pixel.gif" width="1" height="1" /></form>

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

## Build and install on the HCU

```bash
./build.sh    # Linux/macOS
# or
./build.ps1   # Windows
```

Result: `hmip-plugin-fake-switches-<version>.tar.gz`. Upload via HCUweb → Plugins → Upload.

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Connect API documentation 1.0.1](https://github.com/homematicip/connect-api/blob/main/connect-api-documentation-1.0.1.html)

## Author

Issued by **Fabio Renner**.

## License

Apache-2.0
