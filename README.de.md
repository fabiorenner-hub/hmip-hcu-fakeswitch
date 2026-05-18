> [🇬🇧 English](README.md) | 🇩🇪 Deutsch

# HMIP HCU Plugin: Fake-Schalter

📦 **[hmip-plugin-fake-switches-1.0.0.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.0.0.tar.gz)** — Installation in HCUweb über *Entwicklermodus → Plugins → Aus Datei installieren*.

Ein Plugin für die Homematic IP Home Control Unit (HCU), das virtuelle
Schalter (und optional eine dimmbare Lampe) in der HMIP-App bereitstellt.
Nützlich zum Testen von Automationen, Szenen und Gruppen ohne echte
Hardware.

Gebaut und validiert gegen die offizielle
[Homematic IP Connect API](https://github.com/homematicip/connect-api)
(Dokumentationsstand `1.0.1`).

## Geräte in der HMIP-App

- **Fake-Schalter 1..N** — `SWITCH` mit `switchState`, `onTime`, `maintenance`
- **Fake-Lampe** (optional) — `LIGHT` mit `switchState`, `dimming`, `onTime`, `maintenance`

Alle Schaltzustände werden in `/data/state.json` persistiert, überleben also
Neustarts und Plugin-Updates.

## Auf der HCU installieren

1. `hmip-plugin-fake-switches-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases)
   herunterladen.
2. In HCUweb *Entwicklermodus → Plugins → Upload* öffnen und die Datei
   auswählen.
3. Konfigurieren unter *Plugins → Fake-Schalter → Konfigurieren*.

## Konfiguration über die HCU-Oberfläche

Nach der Installation im HCU-Webinterface unter
*Plugins → Fake-Schalter → Konfigurieren*:

**Gruppe Schalter**
- **Anzahl Schalter** — 1 bis 20
- **Namens-Präfix** — für Schalter ohne individuellen Namen
- **Einzelnamen (optional)** — ein Name pro Zeile; Reihenfolge = Schalternummer

**Gruppe Lampe**
- **Fake-Lampe anlegen** — Boolean
- **Name der Lampe**

**Gruppe Zusätzliches**
- **Maintenance-Feature anhängen** — liefert `unreach/lowBat/sabotage=false`

## Unterstützte API-Nachrichten

Das Plugin behandelt alle für lokale Geräte-Plugins relevanten Nachrichten
aus der Connect API:

| Richtung            | Nachricht |
| ------------------- | --------- |
| HCU → Plugin        | `PLUGIN_STATE_REQUEST`, `DISCOVER_REQUEST`, `STATUS_REQUEST` (mit `deviceIds`-Filter), `CONTROL_REQUEST`, `CONFIG_TEMPLATE_REQUEST`, `CONFIG_UPDATE_REQUEST`, `INCLUSION_EVENT`, `EXCLUSION_EVENT`, `USER_MESSAGE_ACK_EVENT`, `ERROR_RESPONSE` |
| Plugin → HCU        | `PLUGIN_STATE_RESPONSE` (mit lokalisiertem `friendlyName`), `DISCOVER_RESPONSE`, `STATUS_RESPONSE`, `STATUS_EVENT`, `CONTROL_RESPONSE`, `CONFIG_TEMPLATE_RESPONSE`, `CONFIG_UPDATE_RESPONSE` |

## Voraussetzungen

- HCU mit aktiviertem Entwicklermodus (HCU-Firmware ≥ 1.4.7)
- Docker mit `buildx` (nur falls du das Image selbst bauen möchtest)

## Lokal testen (ohne Container)

```bash
cd hmip-plugin-fake-switches
npm install
# Auth-Token der HCU in authtoken.txt speichern, dann:
node plugin.js de.example.plugin.fakeswitches hcu1-XXXX.local authtoken.txt
```

Auf Nicht-Linux-Systemen ggf. mit `FAKE_DATA_DIR` auf ein schreibbares
Verzeichnis umlenken:

```bash
FAKE_DATA_DIR=./data node plugin.js ...
```

## Defaults beim ersten Start

| Variable              | Bedeutung                            | Default          |
| --------------------- | ------------------------------------ | ---------------- |
| `FAKE_SWITCH_COUNT`   | Anzahl Schalter                      | `4`              |
| `FAKE_SWITCH_NAMES`   | Komma-/Semikolon-getrennte Namen     | —                |
| `FAKE_NAME_PREFIX`    | Präfix für Auto-Namen                | `Fake-Schalter`  |
| `FAKE_LIGHT_ENABLED`  | Fake-Lampe aktivieren                | `true`           |
| `FAKE_LIGHT_NAME`     | Anzeigename der Fake-Lampe           | `Fake-Lampe`     |
| `FAKE_MAINTENANCE`    | Maintenance-Feature mitliefern       | `true`           |

## Bauen und auf der HCU installieren

```bash
# Build + Export in einem Rutsch
./build.sh            # Linux/macOS
# oder
.\build.ps1           # Windows

# Ergebnis: hmip-plugin-fake-switches-<version>.tar.gz
# Im HCU-Webinterface -> Plugins -> Upload
```

## Hinweise

- Schalten im Web/per App erzeugt einen `CONTROL_REQUEST`. Das Plugin
  übernimmt den neuen Zustand, persistiert ihn, bestätigt mit
  `CONTROL_RESPONSE` und meldet die Änderung per `STATUS_EVENT`.
- Setzt die HCU im `CONTROL_REQUEST` zusätzlich `onTime`, schaltet das
  Plugin nach Ablauf des Timers automatisch aus und sendet dafür erneut ein
  `STATUS_EVENT`.
- Bei der Lampe entspricht `dimLevel > 0` automatisch `switchState.on = true`,
  `dimLevel = 0` entspricht `on = false` — analog zu echten HMIP-Dimmern.
- Nach `INCLUSION_EVENT` meldet das Plugin einen `STATUS_RESPONSE` mit dem
  aktuellen Zustand der eingebundenen Geräte zurück.
- Das Plugin reagiert auf die HMIP-App und auf HMIP-Automationen, fragt aber
  keine externen Systeme ab. Rein virtuell.

## Quellen

- [Homematic IP Connect API](https://github.com/homematicip/connect-api)
- [Connect API Dokumentation 1.0.1](https://github.com/homematicip/connect-api/blob/main/connect-api-documentation-1.0.1.html)

## Lizenz

Apache-2.0
