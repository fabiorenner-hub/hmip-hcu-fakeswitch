// Homematic IP HCU Plugin: Fake Switches
// Reference API: https://github.com/homematicip/connect-api
// Validated against connect-api-documentation-1.0.1.html
//
// Exposes N virtual SWITCH devices (and optionally one dimmable LIGHT) that
// can be toggled from the Homematic IP app. Great for testing automations,
// screenshots, or scenes without touching real hardware.
//
// Implemented message handling:
//   From HCU: PLUGIN_STATE_REQUEST, DISCOVER_REQUEST, STATUS_REQUEST,
//             CONTROL_REQUEST, CONFIG_TEMPLATE_REQUEST, CONFIG_UPDATE_REQUEST,
//             INCLUSION_EVENT, EXCLUSION_EVENT, USER_MESSAGE_ACK_EVENT,
//             ERROR_RESPONSE
//   From plugin: PLUGIN_STATE_RESPONSE, DISCOVER_RESPONSE, STATUS_RESPONSE,
//                STATUS_EVENT, CONTROL_RESPONSE, CONFIG_TEMPLATE_RESPONSE,
//                CONFIG_UPDATE_RESPONSE

"use strict";

const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

// --------------------------------------------------------------------------
// Persistence
// --------------------------------------------------------------------------
const DATA_DIR = process.env.FAKE_DATA_DIR || "/data";
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const DEFAULT_CONFIG = {
	switchCount: parseInt(process.env.FAKE_SWITCH_COUNT || "4", 10),
	switchNames: parseNamesEnv(process.env.FAKE_SWITCH_NAMES) || [
		"Fake-Schalter 1",
		"Fake-Schalter 2",
		"Fake-Schalter 3",
		"Fake-Schalter 4"
	],
	namePrefix: process.env.FAKE_NAME_PREFIX || "Fake-Schalter",
	lightEnabled: (process.env.FAKE_LIGHT_ENABLED || "true").toLowerCase() !== "false",
	lightName: process.env.FAKE_LIGHT_NAME || "Fake-Lampe",
	exposeMaintenance: (process.env.FAKE_MAINTENANCE || "true").toLowerCase() !== "false"
};

function parseNamesEnv(raw) {
	if (!raw) return null;
	const parts = String(raw)
		.split(/[;,]/)
		.map((s) => s.trim())
		.filter(Boolean);
	return parts.length > 0 ? parts : null;
}

let config = { ...DEFAULT_CONFIG, switchNames: [...DEFAULT_CONFIG.switchNames] };

// deviceState[deviceId] = {
//   type: "switch" | "light",
//   on: boolean,
//   dimLevel?: number,       // 0..1 (lights only)
//   onTimer?: NodeJS.Timeout  // onTime feature timer (not persisted)
// }
let deviceState = {};

// deviceId -> true once the HCU has included this device
let includedDevices = {};

function loadConfig() {
	try {
		if (fs.existsSync(CONFIG_FILE)) {
			const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
			config = {
				...DEFAULT_CONFIG,
				...parsed,
				switchNames: Array.isArray(parsed.switchNames)
					? parsed.switchNames
					: DEFAULT_CONFIG.switchNames
			};
			console.log("[config] loaded from", CONFIG_FILE);
		}
	} catch (e) {
		console.warn("[config] could not load:", e.message);
	}
}

function saveConfig() {
	try {
		fs.mkdirSync(DATA_DIR, { recursive: true });
		fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
		console.log("[config] saved");
	} catch (e) {
		console.warn("[config] could not save:", e.message);
	}
}

function loadState() {
	try {
		if (fs.existsSync(STATE_FILE)) {
			const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
			if (parsed && typeof parsed === "object") deviceState = parsed;
			console.log("[state] loaded from", STATE_FILE);
		}
	} catch (e) {
		console.warn("[state] could not load:", e.message);
	}
}

function saveState() {
	try {
		fs.mkdirSync(DATA_DIR, { recursive: true });
		// Strip non-serializable fields like timer handles
		const snapshot = {};
		for (const [id, s] of Object.entries(deviceState)) {
			snapshot[id] = {
				type: s.type,
				on: !!s.on,
				...(s.dimLevel !== undefined ? { dimLevel: clamp01(s.dimLevel) } : {})
			};
		}
		fs.writeFileSync(STATE_FILE, JSON.stringify(snapshot, null, 2), "utf8");
	} catch (e) {
		console.warn("[state] could not save:", e.message);
	}
}

// --------------------------------------------------------------------------
// Device helpers
// --------------------------------------------------------------------------
function switchId(index) {
	return "fake-switch-" + (index + 1);
}

const LIGHT_ID = "fake-light-1";

function ensureStateForConfig() {
	for (let i = 0; i < config.switchCount; i++) {
		const id = switchId(i);
		if (!deviceState[id]) deviceState[id] = { type: "switch", on: false };
	}
	if (config.lightEnabled && !deviceState[LIGHT_ID]) {
		deviceState[LIGHT_ID] = { type: "light", on: false, dimLevel: 1.0 };
	}
	// Drop state for devices no longer in config to keep the file tidy.
	for (const id of Object.keys(deviceState)) {
		if (id.startsWith("fake-switch-")) {
			const idx = parseInt(id.slice("fake-switch-".length), 10) - 1;
			if (!isFinite(idx) || idx < 0 || idx >= config.switchCount) {
				clearOnTimer(id);
				delete deviceState[id];
			}
		} else if (id === LIGHT_ID && !config.lightEnabled) {
			clearOnTimer(id);
			delete deviceState[id];
		}
	}
}

function switchName(index) {
	if (index < config.switchNames.length && config.switchNames[index]) return config.switchNames[index];
	return config.namePrefix + " " + (index + 1);
}

function clamp01(v) {
	const n = typeof v === "number" ? v : parseFloat(v);
	if (!isFinite(n)) return 1.0;
	return Math.min(1, Math.max(0, n));
}

function serializeSwitch(index) {
	const id = switchId(index);
	const s = deviceState[id] || { on: false };
	const features = [{ type: "switchState", on: !!s.on }];
	if (config.exposeMaintenance) features.push(maintenanceFeature());
	return {
		deviceType: "SWITCH",
		deviceId: id,
		firmwareVersion: PLUGIN_VERSION,
		friendlyName: switchName(index),
		modelType: "FAKE_SWITCH",
		features: features
	};
}

function serializeLight() {
	const s = deviceState[LIGHT_ID] || { on: false, dimLevel: 1.0 };
	const features = [
		{ type: "switchState", on: !!s.on },
		{ type: "dimming", dimLevel: clamp01(s.dimLevel) }
	];
	if (config.exposeMaintenance) features.push(maintenanceFeature());
	return {
		deviceType: "LIGHT",
		deviceId: LIGHT_ID,
		firmwareVersion: PLUGIN_VERSION,
		friendlyName: config.lightName,
		modelType: "FAKE_LIGHT",
		features: features
	};
}

function maintenanceFeature() {
	// Virtual devices are always reachable, never sabotaged, never low-battery.
	return { type: "maintenance", unreach: false, lowBat: false, sabotage: false };
}

function buildDevices() {
	const devices = [];
	for (let i = 0; i < config.switchCount; i++) devices.push(serializeSwitch(i));
	if (config.lightEnabled) devices.push(serializeLight());
	return devices;
}

function buildDeviceById(deviceId) {
	return buildDevices().find((d) => d.deviceId === deviceId) || null;
}

// --------------------------------------------------------------------------
// OnTime (auto-off) handling
// --------------------------------------------------------------------------
const onTimers = {}; // deviceId -> timeout handle

function clearOnTimer(deviceId) {
	if (onTimers[deviceId]) {
		clearTimeout(onTimers[deviceId]);
		delete onTimers[deviceId];
	}
}

function scheduleOnTimer(deviceId, seconds, onExpire) {
	clearOnTimer(deviceId);
	const ms = Math.max(0, Math.round(Number(seconds) * 1000));
	if (!isFinite(ms) || ms <= 0) return;
	onTimers[deviceId] = setTimeout(() => {
		delete onTimers[deviceId];
		onExpire();
	}, ms);
}

// --------------------------------------------------------------------------
// Config template (6.3.1 ConfigTemplateResponse)
// --------------------------------------------------------------------------
function configTemplate(languageCode) {
	const de = (languageCode || "").toLowerCase().startsWith("de");
	const t = (deText, enText) => (de ? deText : enText);

	// PropertyTemplate fields are strings per API spec (6.5.4). We coerce.
	const str = (v) => (v === undefined || v === null ? "" : String(v));
	const namesAsText = config.switchNames.join("\n");

	return {
		groups: {
			switches: {
				friendlyName: t("Schalter", "Switches"),
				description: t(
					"Anzahl und Namen der virtuellen Schalter.",
					"Number and names of the virtual switches."
				),
				order: 1
			},
			light: {
				friendlyName: t("Lampe", "Light"),
				description: t(
					"Optionale dimmbare Fake-Lampe.",
					"Optional dimmable fake light."
				),
				order: 2
			},
			misc: {
				friendlyName: t("Zusätzliches", "Miscellaneous"),
				description: t(
					"Feature-Optionen der virtuellen Geräte.",
					"Feature options of the virtual devices."
				),
				order: 3
			}
		},
		properties: {
			switchCount: {
				dataType: "INTEGER",
				friendlyName: t("Anzahl Schalter", "Switch count"),
				description: t(
					"Wie viele virtuelle Schalter angelegt werden sollen (1 bis 20).",
					"How many virtual switches should be created (1 to 20)."
				),
				minimum: 1,
				maximum: 20,
				defaultValue: str(DEFAULT_CONFIG.switchCount),
				currentValue: str(config.switchCount),
				required: true,
				groupId: "switches",
				order: 1
			},
			namePrefix: {
				dataType: "STRING",
				friendlyName: t("Namens-Präfix", "Name prefix"),
				description: t(
					"Wird für Schalter verwendet, für die kein Einzelname vergeben wurde.",
					"Used for switches that do not have an individual name."
				),
				minimumLength: 1,
				maximumLength: 30,
				defaultValue: str(DEFAULT_CONFIG.namePrefix),
				currentValue: str(config.namePrefix),
				required: true,
				groupId: "switches",
				order: 2
			},
			switchNames: {
				dataType: "STRING",
				friendlyName: t("Einzelnamen (optional)", "Individual names (optional)"),
				description: t(
					"Ein Name pro Zeile. Die Reihenfolge entspricht der Schalternummer. Fehlende Zeilen werden mit dem Präfix befüllt.",
					"One name per line. The order matches the switch number. Missing lines are filled from the prefix."
				),
				maximumLength: 2000,
				defaultValue: str(DEFAULT_CONFIG.switchNames.join("\n")),
				currentValue: str(namesAsText),
				required: false,
				groupId: "switches",
				order: 3
			},
			lightEnabled: {
				dataType: "BOOLEAN",
				friendlyName: t("Fake-Lampe anlegen", "Expose fake light"),
				description: t(
					"Zusätzlich ein dimmbares Licht-Gerät bereitstellen.",
					"Also expose a dimmable light device."
				),
				defaultValue: str(DEFAULT_CONFIG.lightEnabled),
				currentValue: str(config.lightEnabled),
				required: true,
				groupId: "light",
				order: 1
			},
			lightName: {
				dataType: "STRING",
				friendlyName: t("Name der Lampe", "Light name"),
				description: t(
					"Wird in der App angezeigt, wenn die Fake-Lampe aktiv ist.",
					"Shown in the app when the fake light is enabled."
				),
				minimumLength: 1,
				maximumLength: 40,
				defaultValue: str(DEFAULT_CONFIG.lightName),
				currentValue: str(config.lightName),
				required: false,
				groupId: "light",
				order: 2
			},
			exposeMaintenance: {
				dataType: "BOOLEAN",
				friendlyName: t("Maintenance-Feature anhängen", "Expose maintenance feature"),
				description: t(
					"Liefert die Wartungsinformationen (immer erreichbar, keine Störung).",
					"Advertises the maintenance feature (always reachable, no faults)."
				),
				defaultValue: str(DEFAULT_CONFIG.exposeMaintenance),
				currentValue: str(config.exposeMaintenance),
				required: true,
				groupId: "misc",
				order: 1
			}
		}
	};
}

function coerceConfigUpdate(updates) {
	const next = { ...config, switchNames: [...config.switchNames] };
	const errors = [];

	function setInt(key, value, min, max) {
		const n = parseInt(value, 10);
		if (!isFinite(n)) return errors.push(key + ": not an integer");
		if (n < min) return errors.push(key + ": below minimum " + min);
		if (n > max) return errors.push(key + ": above maximum " + max);
		next[key] = n;
	}

	function setString(key, value, minLen, maxLen) {
		if (typeof value !== "string") return errors.push(key + ": not a string");
		const v = value.trim();
		if (v.length < minLen) return errors.push(key + ": too short");
		if (v.length > maxLen) return errors.push(key + ": too long");
		next[key] = v;
	}

	function setBool(key, value) {
		if (typeof value === "boolean") next[key] = value;
		else if (value === "true") next[key] = true;
		else if (value === "false") next[key] = false;
		else errors.push(key + ": not a boolean");
	}

	if (updates.switchCount !== undefined) setInt("switchCount", updates.switchCount, 1, 20);
	if (updates.namePrefix !== undefined) setString("namePrefix", updates.namePrefix, 1, 30);
	if (updates.lightEnabled !== undefined) setBool("lightEnabled", updates.lightEnabled);
	if (updates.lightName !== undefined) setString("lightName", updates.lightName, 1, 40);
	if (updates.exposeMaintenance !== undefined) setBool("exposeMaintenance", updates.exposeMaintenance);
	if (updates.switchNames !== undefined) {
		if (typeof updates.switchNames !== "string") {
			errors.push("switchNames: not a string");
		} else {
			const list = updates.switchNames
				.split(/\r?\n/)
				.map((s) => s.trim())
				.filter(Boolean);
			next.switchNames = list;
		}
	}

	return { newConfig: next, errors: errors };
}

// --------------------------------------------------------------------------
// Plugin version (from package.json) — used for firmwareVersion on devices
// --------------------------------------------------------------------------
let PLUGIN_VERSION = "1.1.0";
try {
	PLUGIN_VERSION = require("./package.json").version || PLUGIN_VERSION;
} catch (_) {}

// --------------------------------------------------------------------------
// Plugin lifecycle
// --------------------------------------------------------------------------
async function start(pluginId, host, authtokenFile) {
	loadConfig();
	loadState();
	ensureStateForConfig();
	saveState();

	const authtoken = (await fsp.readFile(authtokenFile, "utf8")).trim();

	// The HCU always exposes the Connect API on wss://<host>:9001. The env
	// override exists only for local integration tests pointing at a mock.
	const wsUrl = process.env.FAKE_WS_URL || "wss://" + host + ":9001";
	const webSocket = new WebSocket(wsUrl, {
		rejectUnauthorized: false,
		headers: {
			authtoken: authtoken,
			"plugin-id": pluginId
		}
	});

	function send(message) {
		if (webSocket.readyState !== WebSocket.OPEN) return;
		try {
			webSocket.send(JSON.stringify(message));
			console.log("Sent:", message.type);
		} catch (e) {
			console.error("send failed:", e.message);
		}
	}

	function sendPluginReady(messageId) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "PLUGIN_STATE_RESPONSE",
			body: {
				pluginReadinessStatus: "READY",
				// Spec 6.3.9: 'de' key is required.
				friendlyName: {
					de: "Fake-Schalter",
					en: "Fake Switches"
				}
			}
		});
	}

	function sendDiscoverResponse(messageId) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "DISCOVER_RESPONSE",
			body: { success: true, devices: buildDevices() }
		});
	}

	function sendStatusResponse(messageId, deviceIds) {
		let devices = buildDevices();
		if (Array.isArray(deviceIds) && deviceIds.length > 0) {
			const wanted = new Set(deviceIds);
			devices = devices.filter((d) => wanted.has(d.deviceId));
		}
		send({
			id: messageId,
			pluginId: pluginId,
			type: "STATUS_RESPONSE",
			body: { success: true, devices: devices }
		});
	}

	function sendStatusEventForDevice(deviceId) {
		const device = buildDeviceById(deviceId);
		if (!device) return;
		send({
			id: uuidv4(),
			pluginId: pluginId,
			type: "STATUS_EVENT",
			body: { deviceId: device.deviceId, features: device.features }
		});
	}

	function sendAllStatusEvents() {
		for (const device of buildDevices()) {
			send({
				id: uuidv4(),
				pluginId: pluginId,
				type: "STATUS_EVENT",
				body: { deviceId: device.deviceId, features: device.features }
			});
		}
	}

	function sendConfigTemplateResponse(messageId, languageCode) {
		send({
			id: messageId,
			pluginId: pluginId,
			type: "CONFIG_TEMPLATE_RESPONSE",
			body: configTemplate(languageCode)
		});
	}

	function sendConfigUpdateResponse(messageId, status, message) {
		const body = { status: status };
		if (message) body.message = message;
		send({ id: messageId, pluginId: pluginId, type: "CONFIG_UPDATE_RESPONSE", body: body });
	}

	function sendControlResponse(messageId, deviceId, success, error) {
		const body = { deviceId: deviceId, success: !!success };
		if (error) body.error = error;
		send({ id: messageId, pluginId: pluginId, type: "CONTROL_RESPONSE", body: body });
	}

	// Turn the device off, persist and notify the HCU.
	function autoOff(deviceId) {
		const s = deviceState[deviceId];
		if (!s || !s.on) return;
		s.on = false;
		deviceState[deviceId] = s;
		saveState();
		sendStatusEventForDevice(deviceId);
		console.log("[onTime] auto-off", deviceId);
	}

	function handleControlRequest(message) {
		const body = message.body || {};
		const deviceId = body.deviceId;
		const incoming = Array.isArray(body.features) ? body.features : [];

		const known = deviceState[deviceId];
		if (!known) {
			sendControlResponse(message.id, deviceId, false, {
				code: "UNKNOWN_DEVICE",
				message: "Device " + deviceId + " is not managed by this plugin."
			});
			return;
		}

		let pendingOnTime = null;
		let touched = false;

		// Apply feature updates to cached state. Features not included stay.
		for (const feature of incoming) {
			if (!feature || typeof feature !== "object") continue;
			switch (feature.type) {
				case "switchState":
					if ("on" in feature) {
						known.on = !!feature.on;
						touched = true;
					}
					break;
				case "dimming":
					if ("dimLevel" in feature && known.type === "light") {
						known.dimLevel = clamp01(feature.dimLevel);
						// Dim to 0 turns off; dim > 0 implies on (mirrors real HMIP lights).
						known.on = known.dimLevel > 0;
						touched = true;
					}
					break;
				case "onTime":
					if ("onTime" in feature) {
						const n = Number(feature.onTime);
						if (isFinite(n) && n > 0) pendingOnTime = n;
						else clearOnTimer(deviceId);
						touched = true;
					}
					break;
				default:
					// Silently ignore features we don't model.
					break;
			}
		}

		if (!touched) {
			sendControlResponse(message.id, deviceId, true);
			return;
		}

		deviceState[deviceId] = known;
		saveState();

		// An onTime feature tells us to auto-off after N seconds if the device
		// is currently on (or just turned on in this same request).
		if (pendingOnTime !== null && known.on) {
			scheduleOnTimer(deviceId, pendingOnTime, () => autoOff(deviceId));
		}
		if (!known.on) clearOnTimer(deviceId);

		sendControlResponse(message.id, deviceId, true);
		// Push the new state so every app and automation stays in sync.
		sendStatusEventForDevice(deviceId);
	}

	async function handleConfigUpdate(message) {
		const body = message.body || {};
		const { newConfig, errors } = coerceConfigUpdate(body.properties || {});
		if (errors.length > 0) {
			sendConfigUpdateResponse(message.id, "FAILED", errors.join("; "));
			return;
		}

		config = newConfig;
		saveConfig();
		ensureStateForConfig();
		saveState();

		// Tell the HCU we applied the change, then re-announce devices.
		sendConfigUpdateResponse(message.id, "APPLIED");
		sendDiscoverResponse(uuidv4());
		sendAllStatusEvents();
	}

	function handleInclusionEvent(message) {
		const body = message.body || {};
		const ids = Array.isArray(body.deviceIds) ? body.deviceIds : [];
		for (const id of ids) includedDevices[id] = true;
		console.log("[inclusion] included:", ids.join(", "));
		// Spec 6.4.11: react with a status response for the included devices.
		sendStatusResponse(uuidv4(), ids);
	}

	function handleExclusionEvent(message) {
		const body = message.body || {};
		const ids = Array.isArray(body.deviceIds) ? body.deviceIds : [];
		for (const id of ids) {
			delete includedDevices[id];
			clearOnTimer(id);
		}
		console.log("[exclusion] excluded:", ids.join(", "));
		// Spec 6.4.8: stop sending status for excluded devices. We simply note
		// the exclusion; the device remains available for re-inclusion.
	}

	function handleErrorResponse(message) {
		const body = message.body || {};
		console.warn(
			"[error-response] from HCU:",
			(body.error && body.error.code) || "?",
			(body.error && body.error.message) || "",
			body.originalMessage ? "(on: " + JSON.stringify(body.originalMessage).slice(0, 200) + ")" : ""
		);
	}

	webSocket.on("open", () => {
		console.log("Connected to HCU WebSocket");
		sendPluginReady(uuidv4());
	});

	webSocket.on("message", (data) => {
		let message;
		try {
			message = JSON.parse(data);
		} catch (e) {
			console.error("Invalid message:", e.message);
			return;
		}
		console.log("Received:", message.type);

		switch (message.type) {
			case "PLUGIN_STATE_REQUEST":
				sendPluginReady(message.id);
				break;
			case "DISCOVER_REQUEST":
				sendDiscoverResponse(message.id);
				setTimeout(() => sendAllStatusEvents(), 500);
				break;
			case "STATUS_REQUEST":
				sendStatusResponse(message.id, (message.body && message.body.deviceIds) || null);
				break;
			case "CONFIG_TEMPLATE_REQUEST":
				sendConfigTemplateResponse(message.id, (message.body && message.body.languageCode) || "de");
				break;
			case "CONFIG_UPDATE_REQUEST":
				handleConfigUpdate(message).catch((err) => {
					console.error("config update error:", err);
					sendConfigUpdateResponse(message.id, "FAILED", err.message || "unknown error");
				});
				break;
			case "CONTROL_REQUEST":
				handleControlRequest(message);
				break;
			case "INCLUSION_EVENT":
				handleInclusionEvent(message);
				break;
			case "EXCLUSION_EVENT":
				handleExclusionEvent(message);
				break;
			case "USER_MESSAGE_ACK_EVENT":
				// The plugin never creates user messages, so nothing to do.
				break;
			case "ERROR_RESPONSE":
				handleErrorResponse(message);
				break;
			default:
				console.log("[unhandled]", message.type);
				break;
		}
	});

	webSocket.on("close", (code, reason) => {
		console.warn("WebSocket closed:", code, reason && reason.toString());
		// Cancel any pending auto-off timers so the process can exit cleanly.
		for (const id of Object.keys(onTimers)) clearOnTimer(id);
	});

	webSocket.on("error", (err) => {
		console.error("WebSocket error:", err.code || "", err.message || err);
	});
}

// --------------------------------------------------------------------------
// Entrypoint
// --------------------------------------------------------------------------
const args = process.argv.slice(2);
const pluginId = args[0];
const host = args[1];
const authtokenFile = args[2];

if (!pluginId || !host || !authtokenFile) {
	console.error("Usage: node plugin.js <plugin-id> <hcu-host> <authtoken-file>");
	process.exit(1);
}

start(pluginId, host, authtokenFile).catch((err) => {
	console.error("Plugin startup failed:", err);
	process.exit(1);
});
