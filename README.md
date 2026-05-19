> 🇬🇧 English | [🇩🇪 Deutsch](README.de.md)

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-fake-switches icon" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Fake Switches

📦 **[Download hmip-plugin-fake-switches-1.1.2.tar.gz](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.1.2.tar.gz)** — install via HCUweb → *Developer mode → Plugins → Install from file*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch>

A Homematic IP Home Control Unit (HCU) plugin that exposes virtual switches
(and an optional dimmable light) in the HMIP app. Useful for testing
automations, scenes and groups without real hardware.

## Support

If this plugin is useful to you, please consider a small donation — it helps
me keep the lights on while building more HCU plugins:
[Donate via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

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

- **Number of switches** (1..20), **Name prefix**, **Individual names**
- **Create fake light** (boolean), **Light name**
- **Attach maintenance feature** — reports `unreach/lowBat/sabotage = false`

## Build and install on the HCU

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## References

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)

## Author

Issued by **Fabio Renner**.

## License

Apache-2.0
