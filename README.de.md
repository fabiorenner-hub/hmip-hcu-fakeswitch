> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-fake-switches Symbolbild" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Fake-Schalter

📦 **[hmip-plugin-fake-switches-1.1.2.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.1.2.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch>

Ein Homematic IP HCU-Plugin, das virtuelle Schalter (und optional eine
dimmbare Lampe) in der HMIP-App bereitstellt. Praktisch zum Testen von
Automatisierungen, Szenen und Gruppen ohne echte Hardware.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## Geräte in der HMIP-App

- **Fake-Schalter 1..N** — `SWITCH` mit `switchState`, `onTime`, `maintenance`
- **Fake-Lampe** (optional) — `LIGHT` mit `switchState`, `dimming`, `onTime`, `maintenance`

Alle Schalterzustände werden in `/data/state.json` persistiert und überleben
Neustarts und Plugin-Updates.

## Auf der HCU installieren

1. `hmip-plugin-fake-switches-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases) holen.
2. In HCUweb *Entwicklermodus → Plugins → Hochladen* öffnen und die Datei auswählen.
3. Konfiguration unter *Plugins → Fake Switches → Configure*.

## Konfiguration

- **Anzahl Schalter** (1..20), **Name-Präfix**, **Individuelle Namen**
- **Fake-Lampe anlegen** (boolean), **Lampenname**
- **Maintenance-Feature anhängen** — meldet `unreach/lowBat/sabotage = false`

## Selbst bauen

```powershell
./build.ps1   # Windows
```

```bash
chmod +x build.sh
./build.sh    # macOS / Linux
```

## Referenzen

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)

## Herausgeber

Herausgegeben von **Fabio Renner**.

### Verwendete Drittanbieter

- Gebaut gegen die [Homematic IP Connect API 1.0.1](https://github.com/homematicip/connect-api) von eQ-3.
- Keine externen Dienste oder Hersteller-APIs — rein virtuelle Geräte.

## Lizenz

Apache-2.0
