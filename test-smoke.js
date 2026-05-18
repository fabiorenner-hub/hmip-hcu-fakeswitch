// Smoke test: run the plugin against a fake HCU WebSocket server and exercise
// every supported message type. Validates that the plugin's replies conform to
// the Connect API 1.0.1 schema in the aspects we care about.

"use strict";

const { spawn } = require("child_process");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const https = require("https");
const selfsigned = require("selfsigned");

const TMP = path.join(__dirname, ".smoke");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const tokenFile = path.join(TMP, "authtoken.txt");
fs.writeFileSync(tokenFile, "fake-token\n");

const errors = [];
const expected = {};
const received = [];
let pluginSocket = null;
let plugin = null;

function fail(msg) { errors.push(msg); console.error("ASSERT FAIL:", msg); }
function assertEq(actual, want, label) {
	if (actual !== want) fail(label + ": expected " + JSON.stringify(want) + ", got " + JSON.stringify(actual));
}
function assert(cond, label) { if (!cond) fail(label); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitFor(fn, ms, label) {
	const until = Date.now() + ms;
	while (Date.now() < until) {
		if (fn()) return;
		await sleep(25);
	}
	fail(label + " timeout after " + ms + "ms");
}

function sendFromHCU(type, body, id) {
	if (!pluginSocket) throw new Error("plugin not connected yet");
	const msg = {
		id: id || randomUUID(),
		pluginId: "de.example.plugin.fakeswitches",
		type: type,
		body: body || {}
	};
	pluginSocket.send(JSON.stringify(msg));
	console.log("->", type);
}

function request(type, body, assertionFn) {
	return new Promise((resolve) => {
		const id = randomUUID();
		expected[id] = { label: type, fn: assertionFn, resolve: resolve };
		sendFromHCU(type, body, id);
		setTimeout(() => {
			if (expected[id]) {
				delete expected[id];
				fail(type + ": no response within 3s");
				resolve();
			}
		}, 3000);
	});
}

async function run() {
	const pems = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
		days: 1,
		keySize: 2048,
		algorithm: "sha256",
		extensions: [
			{
				name: "subjectAltName",
				altNames: [
					{ type: 2, value: "localhost" },
					{ type: 7, ip: "127.0.0.1" }
				]
			}
		]
	});
	const server = https.createServer({
		key: pems.private,
		cert: pems.cert,
		minVersion: "TLSv1.2"
	});
	server.on("tlsClientError", (err) => console.error("[tlsClientError]", err.message));
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = server.address().port;
	console.log("fake HCU listening on wss://127.0.0.1:" + port);

	const wss = new WebSocketServer({ server });

	wss.on("connection", (socket, req) => {
		console.log("plugin connected, authtoken header:", req.headers["authtoken"]);
		pluginSocket = socket;

		assert(req.headers["authtoken"] === "fake-token", "authtoken header");
		assert(req.headers["plugin-id"] === "de.example.plugin.fakeswitches", "plugin-id header");

		socket.on("message", (data) => {
			let msg;
			try {
				msg = JSON.parse(data.toString());
			} catch (e) {
				fail("plugin sent invalid JSON: " + e.message);
				return;
			}
			console.log("<-", msg.type);
			received.push(msg);

			// Envelope checks
			assertEq(typeof msg.id, "string", msg.type + ".id type");
			assertEq(msg.pluginId, "de.example.plugin.fakeswitches", msg.type + ".pluginId");
			assertEq(typeof msg.type, "string", msg.type + ".type");
			assert(msg.body && typeof msg.body === "object", msg.type + ".body object");

			const pending = expected[msg.id];
			if (pending) {
				delete expected[msg.id];
				try {
					pending.fn(msg);
				} catch (e) {
					fail(pending.label + " assertion: " + e.message);
				}
				pending.resolve();
			}
		});
	});

	// Launch plugin
	plugin = spawn(process.execPath, [
		"plugin.js",
		"de.example.plugin.fakeswitches",
		"127.0.0.1",
		tokenFile
	], {
		cwd: __dirname,
		env: {
			...process.env,
			FAKE_DATA_DIR: TMP,
			FAKE_SWITCH_COUNT: "3",
			FAKE_LIGHT_ENABLED: "true",
			FAKE_WS_URL: "wss://127.0.0.1:" + port,
			NODE_TLS_REJECT_UNAUTHORIZED: "0"
		},
		stdio: ["ignore", "pipe", "pipe"]
	});
	plugin.stdout.on("data", (b) => process.stdout.write("[plug] " + b.toString()));
	plugin.stderr.on("data", (b) => process.stderr.write("[plug-err] " + b.toString()));

	await waitFor(() => received.find((m) => m.type === "PLUGIN_STATE_RESPONSE"), 5000, "first PLUGIN_STATE_RESPONSE");
	{
		const m = received.find((m) => m.type === "PLUGIN_STATE_RESPONSE");
		assertEq(m.body.pluginReadinessStatus, "READY", "PLUGIN_STATE_RESPONSE.pluginReadinessStatus");
		assert(m.body.friendlyName && m.body.friendlyName.de, "PLUGIN_STATE_RESPONSE.friendlyName.de present");
	}

	// 1. PLUGIN_STATE_REQUEST
	await request("PLUGIN_STATE_REQUEST", {}, (m) => {
		assertEq(m.type, "PLUGIN_STATE_RESPONSE", "reply type");
		assertEq(m.body.pluginReadinessStatus, "READY", "ready");
	});

	// 2. DISCOVER_REQUEST
	await request("DISCOVER_REQUEST", {}, (m) => {
		assertEq(m.type, "DISCOVER_RESPONSE", "reply type");
		assertEq(m.body.success, true, "success");
		assert(Array.isArray(m.body.devices), "devices array");
		assertEq(m.body.devices.length, 4, "3 switches + 1 light");
		const sw = m.body.devices.find((d) => d.deviceType === "SWITCH");
		assert(sw.features.some((f) => f.type === "switchState"), "SWITCH has switchState");
		assert(sw.features.some((f) => f.type === "maintenance"), "SWITCH has maintenance");
		const light = m.body.devices.find((d) => d.deviceType === "LIGHT");
		assert(light.features.some((f) => f.type === "dimming"), "LIGHT has dimming");
		assert(light.features.some((f) => f.type === "switchState"), "LIGHT has switchState");
	});
	await sleep(700);
	{
		const events = received.filter((m) => m.type === "STATUS_EVENT");
		assert(events.length >= 4, "STATUS_EVENT pushed for each device after discover (got " + events.length + ")");
	}

	// 3. STATUS_REQUEST (no filter)
	await request("STATUS_REQUEST", { deviceIds: [] }, (m) => {
		assertEq(m.type, "STATUS_RESPONSE", "reply type");
		assertEq(m.body.devices.length, 4, "all 4 devices when filter empty");
	});

	// 4. STATUS_REQUEST (filter one switch)
	await request("STATUS_REQUEST", { deviceIds: ["fake-switch-2"] }, (m) => {
		assertEq(m.type, "STATUS_RESPONSE", "reply type");
		assertEq(m.body.devices.length, 1, "filter applied");
		assertEq(m.body.devices[0].deviceId, "fake-switch-2", "filtered deviceId");
	});

	// 5. CONTROL_REQUEST switch on
	received.length = 0;
	await request("CONTROL_REQUEST", {
		deviceId: "fake-switch-1",
		features: [{ type: "switchState", on: true }]
	}, (m) => {
		assertEq(m.type, "CONTROL_RESPONSE", "reply type");
		assertEq(m.body.success, true, "success");
		assertEq(m.body.deviceId, "fake-switch-1", "deviceId echoed");
	});
	await sleep(200);
	{
		const ev = received.find((m) => m.type === "STATUS_EVENT" && m.body.deviceId === "fake-switch-1");
		assert(ev, "STATUS_EVENT for switch 1 after control");
		if (ev) {
			const st = ev.body.features.find((f) => f.type === "switchState");
			assertEq(st.on, true, "on=true in event");
		}
	}

	// 6. CONTROL_REQUEST with onTime (auto-off)
	received.length = 0;
	await request("CONTROL_REQUEST", {
		deviceId: "fake-switch-2",
		features: [
			{ type: "switchState", on: true },
			{ type: "onTime", onTime: 0.3 }
		]
	}, (m) => {
		assertEq(m.body.success, true, "onTime control ok");
	});
	await sleep(800);
	{
		const evs = received.filter((m) => m.type === "STATUS_EVENT" && m.body.deviceId === "fake-switch-2");
		assert(evs.length >= 2, "2+ STATUS_EVENTs (turn-on + auto-off) got " + evs.length);
		if (evs.length > 0) {
			const last = evs[evs.length - 1].body.features.find((f) => f.type === "switchState");
			assertEq(last.on, false, "auto-off");
		}
	}

	// 7. CONTROL_REQUEST unknown device
	await request("CONTROL_REQUEST", {
		deviceId: "fake-switch-99",
		features: [{ type: "switchState", on: true }]
	}, (m) => {
		assertEq(m.body.success, false, "unknown device fails");
		assert(m.body.error && m.body.error.code === "UNKNOWN_DEVICE", "error.code provided");
	});

	// 8. CONTROL_REQUEST dimming on light
	received.length = 0;
	await request("CONTROL_REQUEST", {
		deviceId: "fake-light-1",
		features: [{ type: "dimming", dimLevel: 0.5 }]
	}, (m) => {
		assertEq(m.body.success, true, "dim ok");
	});
	await sleep(200);
	{
		const ev = received.find((m) => m.type === "STATUS_EVENT" && m.body.deviceId === "fake-light-1");
		if (!ev) {
			fail("STATUS_EVENT for fake-light-1 missing after dim");
		} else {
			const dim = ev.body.features.find((f) => f.type === "dimming");
			const sw = ev.body.features.find((f) => f.type === "switchState");
			assertEq(dim.dimLevel, 0.5, "dimLevel");
			assertEq(sw.on, true, "dim>0 implies on");
		}
	}

	// 9. CONFIG_TEMPLATE_REQUEST
	await request("CONFIG_TEMPLATE_REQUEST", { languageCode: "de" }, (m) => {
		assertEq(m.type, "CONFIG_TEMPLATE_RESPONSE", "reply type");
		assert(m.body.groups && m.body.properties, "groups + properties");
		for (const [key, p] of Object.entries(m.body.properties)) {
			assertEq(typeof p.currentValue, "string", "property " + key + ".currentValue is string");
			assertEq(typeof p.defaultValue, "string", "property " + key + ".defaultValue is string");
			assert(
				["INTEGER", "NUMBER", "BOOLEAN", "STRING", "PASSWORD", "ENUM", "TYPEAHEAD", "QRCODE", "READONLY", "WEBLINK"].includes(p.dataType),
				"property " + key + ".dataType valid (" + p.dataType + ")"
			);
		}
	});

	// 10. CONFIG_UPDATE_REQUEST (valid)
	received.length = 0;
	await request("CONFIG_UPDATE_REQUEST", {
		languageCode: "de",
		properties: { switchCount: 2, lightEnabled: false, lightName: "Garten-Lampe" }
	}, (m) => {
		assertEq(m.type, "CONFIG_UPDATE_RESPONSE", "reply type");
		assertEq(m.body.status, "APPLIED", "applied");
	});
	await sleep(300);
	{
		const disc = received.find((m) => m.type === "DISCOVER_RESPONSE");
		assert(disc, "plugin re-announces via DISCOVER_RESPONSE after config update");
		if (disc) assertEq(disc.body.devices.length, 2, "2 switches, no light after update");
	}

	// 11. CONFIG_UPDATE_REQUEST (invalid)
	await request("CONFIG_UPDATE_REQUEST", {
		languageCode: "de",
		properties: { switchCount: 999 }
	}, (m) => {
		assertEq(m.body.status, "FAILED", "failed on out-of-range");
		assert(typeof m.body.message === "string" && m.body.message.length > 0, "failure message set");
	});

	// 12. INCLUSION_EVENT
	received.length = 0;
	sendFromHCU("INCLUSION_EVENT", { deviceIds: ["fake-switch-1", "fake-switch-2"] });
	await sleep(300);
	{
		const resp = received.find((m) => m.type === "STATUS_RESPONSE");
		assert(resp, "plugin replies with STATUS_RESPONSE after INCLUSION_EVENT");
		if (resp) assertEq(resp.body.devices.length, 2, "status response covers included devices");
	}

	// 13. EXCLUSION_EVENT
	sendFromHCU("EXCLUSION_EVENT", { deviceIds: ["fake-switch-1"] });
	await sleep(100);

	// 14. USER_MESSAGE_ACK_EVENT (silent)
	received.length = 0;
	sendFromHCU("USER_MESSAGE_ACK_EVENT", {
		userMessageId: randomUUID(),
		ackType: "OK"
	});
	await sleep(200);
	assert(received.length === 0, "no reply to USER_MESSAGE_ACK_EVENT (got " + received.length + ")");

	// 15. ERROR_RESPONSE (silent)
	sendFromHCU("ERROR_RESPONSE", {
		error: { code: "ERROR", message: "from test" },
		originalMessage: { foo: "bar" }
	});
	await sleep(100);

	// Shutdown
	plugin.kill();
	await new Promise((r) => plugin.on("exit", r));
	server.close();

	if (errors.length > 0) {
		console.error("\nFAILURES:");
		errors.forEach((e) => console.error(" -", e));
		process.exit(1);
	}
	console.log("\nSmoke test PASSED.");
}

run().catch((e) => {
	console.error(e);
	if (plugin) plugin.kill();
	process.exit(1);
});
