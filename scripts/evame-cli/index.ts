import { runCommand } from "./service/commands";

async function main(): Promise<void> {
	// argv[2] をコマンドとして扱い、残りをコマンド引数として渡す。
	const args = process.argv.slice(2);
	const command = args[0];

	try {
		// シェル連携のため、コマンドの終了コードで明示的に終了する。
		const exitCode = await runCommand(command, args.slice(1));
		process.exit(exitCode);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error";
		console.error(message);
		process.exit(1);
	}
}

void main();
