import { execFileSync, spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createClient } from "@libsql/client/http";

/** Tests and the Workers artifact use Turso's HTTP protocol, like production. */
export async function startTursoServer(databasePath, port) {
	if (port === null) {
		const socket = createServer();
		await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
		port = socket.address().port;
		await new Promise((resolve, reject) =>
			socket.close((error) => (error ? reject(error) : resolve())),
		);
	}
	const version = execFileSync("sqld", ["--version"], {
		encoding: "utf8",
	}).match(/\d+\.\d+\.\d+/)?.[0];
	if (!version)
		throw new Error("Cannot determine the local libSQL server version");
	const directory = await mkdtemp(join(tmpdir(), "evame-turso-"));
	await mkdir(join(directory, "dbs"));
	await symlink(directory, join(directory, "dbs", "default"));
	await symlink(resolve(databasePath), join(directory, "data"));
	await writeFile(join(directory, ".version"), version);
	const child = spawn(
		"sqld",
		[
			"--no-welcome",
			"--http-listen-addr",
			`127.0.0.1:${port}`,
			"-d",
			directory,
		],
		{ stdio: "ignore" },
	);
	let failed = false;
	child.on("error", () => {
		failed = true;
	});
	async function stop() {
		if (
			child.pid !== undefined &&
			child.exitCode === null &&
			child.signalCode === null
		) {
			const closed = new Promise((resolve) => child.once("exit", resolve));
			child.kill();
			await closed;
		}
		await rm(directory, { recursive: true, force: true });
	}
	const url = `http://127.0.0.1:${port}`;
	const client = createClient({ url });
	try {
		for (let attempt = 0; ; attempt++) {
			try {
				await client.execute("SELECT 1");
				break;
			} catch {
				if (failed || child.exitCode !== null || attempt === 100)
					throw new Error("Local Turso server did not start");
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	} catch (error) {
		await stop();
		throw error;
	} finally {
		client.close();
	}
	return { url, stop };
}
