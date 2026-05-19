# ARM64 base image provided by eQ-3 for HCU plugins
FROM --platform=linux/arm64 ghcr.io/homematicip/alpine-node-simple:0.0.1

WORKDIR /app

COPY package*.json .
RUN npm install --omit=dev

COPY plugin.js .

ENTRYPOINT ["node", "plugin.js", "de.example.plugin.fakeswitches", "host.containers.internal", "/TOKEN"]

LABEL de.eq3.hmip.plugin.metadata="{\"pluginId\":\"de.example.plugin.fakeswitches\",\"issuer\":\"Fabio Renner\",\"version\":\"1.1.0\",\"hcuMinVersion\":\"1.4.7\",\"scope\":\"LOCAL\",\"friendlyName\":{\"de\":\"Fake-Schalter\",\"en\":\"Fake Switches\"},\"description\":{\"de\":\"Erstellt virtuelle Schalter und optional eine dimmbare Lampe, um Automatisierungen, Szenen und Gruppen ohne echte Hardware zu testen. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch - Spenden via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\",\"en\":\"Creates virtual switches and an optional dimmable light so you can test automations, scenes and groups without real hardware. GitHub: https://github.com/fabiorenner-hub/hmip-hcu-fakeswitch - Donate via PayPal: https://www.paypal.com/donate/?hosted_button_id=JPZRATUUHRT5C\"},\"settings\":[],\"changelog\":\"1.1.0 - Plugin icon, GitHub link and PayPal donation hint added to plugin metadata, README and HCU description.\\n1.0.0 - Initial public release.\",\"logsEnabled\":true}"
