> [ðŸ‡¬ðŸ‡§ English](README.md) | ðŸ‡©ðŸ‡ª Deutsch

<p align="center">
  <img src="icon.svg" alt="hmip-plugin-fake-switches Symbolbild" width="128" height="128"/>
</p>

# HMIP HCU Plugin: Fake-Schalter

ðŸ“¦ **[hmip-plugin-fake-switches-1.1.1.tar.gz herunterladen](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases/latest/download/hmip-plugin-fake-switches-1.1.1.tar.gz)** â€” Installation in HCUweb Ã¼ber *Entwicklermodus â†’ Plugins â†’ Aus Datei installieren*.

GitHub: <https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch>

Ein Homematic IP HCU-Plugin, das virtuelle Schalter (und optional eine dimmbare
Lampe) in der HMIP-App bereitstellt. Praktisch zum Testen von Automatisierungen,
Szenen und Gruppen ohne echte Hardware.

## Spenden

Wenn dir dieses Plugin hilft, freue ich mich über eine kleine Spende — sie
hält bei mir die Lichter an, während ich weitere HCU-Plugins baue:
[Spenden via PayPal](https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C).

## GerÃ¤te in der HMIP-App

- **Fake-Schalter 1..N** â€” `SWITCH` mit `switchState`, `onTime`, `maintenance`
- **Fake-Lampe** (optional) â€” `LIGHT` mit `switchState`, `dimming`, `onTime`, `maintenance`

Alle SchalterzustÃ¤nde werden in `/data/state.json` persistiert und Ã¼berleben
Neustarts und Plugin-Updates.

## Auf der HCU installieren

1. `hmip-plugin-fake-switches-<version>.tar.gz` aus den
   [Releases](https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch/releases) holen.
2. In HCUweb *Entwicklermodus â†’ Plugins â†’ Hochladen* Ã¶ffnen und die Datei auswÃ¤hlen.
3. Konfiguration unter *Plugins â†’ Fake-Schalter â†’ Konfigurieren*.

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
