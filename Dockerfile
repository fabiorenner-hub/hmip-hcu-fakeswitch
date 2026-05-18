# ARM64 base image provided by eQ-3 for HCU plugins
FROM --platform=linux/arm64 ghcr.io/homematicip/alpine-node-simple:0.0.1

WORKDIR /app

COPY package*.json .
RUN npm install --omit=dev

COPY plugin.js .

ENTRYPOINT ["node", "plugin.js", "de.example.plugin.fakeswitches", "host.containers.internal", "/TOKEN"]

LABEL de.eq3.hmip.plugin.metadata=\
'{\
    "pluginId": "de.example.plugin.fakeswitches",\
    "issuer": "Example",\
    "version": "1.0.0",\
    "hcuMinVersion": "1.4.7",\
    "scope": "LOCAL",\
    "friendlyName": {\
        "en": "Fake Switches",\
        "de": "Fake-Schalter"\
    },\
    "description": {\
        "en": "Creates virtual switches and an optional dimmable light so you can test automations, scenes and groups without real hardware.",\
        "de": "Erstellt virtuelle Schalter und optional eine dimmbare Lampe, um Automatisierungen, Szenen und Gruppen ohne echte Hardware zu testen."\
    },\
    "settings": [],\
    "changelog": "1.0.0 - Initial public release.",\
    "logsEnabled": true\
}'
