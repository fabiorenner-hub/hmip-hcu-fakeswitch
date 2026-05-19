> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-fake-switches Symbolbild" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Fake-Schalter

📦 **[hmip-plugin-fake-switches-1.1.0.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.1.0.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch>

Ein Homematic IP HCU-Plugin, das virtuelle Schalter (und optional eine dimmbare
Lampe) in der HMIP-App bereitstellt. Praktisch zum Testen von Automatisierungen,
Szenen und Gruppen ohne echte Hardware.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie hilft
mir, weitere HCU-Plugins zu bauen und zu pflegen.

<form action="https://www.paypal.com/donate" method="post" target="_top"><input type="hidden" name="hosted_button_id" value="JPZRATUUHRT5C" /><input type="image" src="https://www.paypalobjects.com/de_DE/DE/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Spenden mit dem PayPal-Button" /><img alt="" border="0" src="https://www.paypal.com/de_DE/i/scr/pixel.gif" width="1" height="1" /></form>

## Geräte in der HMIP-App

- **Fake-Schalter 1..N** — `SWITCH` mit `switchState`, `onTime`, `maintenance`
- **Fake-Lampe** (optional) — `LIGHT` mit `switchState`, `dimming`, `onTime`, `maintenance`

Alle Schalterzustände werden in `/data/state.json` persistiert und überleben
Neustarts und Plugin-Updates.

## Auf der HCU installieren

1. `hmip-plugin-fake-switches-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases) holen.
2. In HCUweb *Entwicklermodus → Plugins → Hochladen* öffnen und die Datei auswählen.
3. Konfiguration unter *Plugins → Fake-Schalter → Konfigurieren*.

## Selbst bauen

```bash
./build.sh    # Linux/macOS
# oder
./build.ps1   # Windows
```

Heraus kommt `hmip-plugin-fake-switches-<version>.tar.gz`.

## Herausgeber

Herausgegeben von **Fabio Renner**.

## Lizenz

Apache-2.0
