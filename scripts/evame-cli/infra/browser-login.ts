import { spawn } from "node:child_process";
import { createServer } from "node:http";

const CLI_LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export async function loginWithBrowser(baseUrl: string): Promise<string> {
	// 全体の流れ:
	// 1) ローカルHTTPサーバーを起動して callback を待つ
	// 2) ログインURLを生成してブラウザを開く
	// 3) callback で token を受け取ったら Promise を resolve
	// 4) エラー/タイムアウト時は reject して後始末する
	return new Promise((resolve, reject) => {
		let done = false;
		let timeout: NodeJS.Timeout | null = null;

		// resolve/reject の二重実行を防ぎ、終了処理を1箇所に集約する。
		const finalize = (fn: () => void) => {
			if (done) return;
			done = true;
			if (timeout) clearTimeout(timeout);
			// コールバック待ちサーバーを停止してリソースを解放する。
			server.close();
			fn();
		};

		// ブラウザ認証フローの token を受け取る一時コールバックサーバー。
		const server = createServer((req, res) => {
			// 想定外メソッドは受け付けない。
			if (req.method !== "GET") {
				res.statusCode = 405;
				res.setHeader("Allow", "GET");
				res.end("Method Not Allowed");
				return;
			}

			// req.url は相対URLなので、ダミーのoriginを付けてパースする。
			const url = new URL(req.url ?? "/", "http://127.0.0.1");
			// 想定パス以外は即時 404。
			if (url.pathname !== "/callback") {
				res.statusCode = 404;
				res.end("Not Found");
				return;
			}

			// 認証完了後に付与される token クエリを取り出す。
			const token = url.searchParams.get("token")?.trim();
			if (!token) {
				res.statusCode = 400;
				res.end("Missing token");
				return;
			}

			// ブラウザ上で完了を明示して、CLI側は token を確定させる。
			res.statusCode = 200;
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.end("Evame CLI login completed. You can close this tab.");

			finalize(() => resolve(token));
		});

		// サーバー自体の障害はログイン失敗として終了する。
		server.on("error", (error) => {
			finalize(() => reject(error));
		});

		// 127.0.0.1 の空きポートで待受開始。外部公開しない。
		server.listen(0, "127.0.0.1", () => {
			const callbackHost =
				process.env.EVAME_CLI_CALLBACK_HOST?.trim() || "127.0.0.1";
			const address = server.address();
			if (!address || typeof address === "string") {
				finalize(() =>
					reject(new Error("Failed to allocate CLI callback port.")),
				);
				return;
			}

			// 認証後に戻ってくる CLI 用 callback URL を作る。
			const callbackUrl = `http://${callbackHost}:${address.port}/callback`;
			// ベースURL末尾スラッシュの有無を吸収してログインURLを組み立てる。
			const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
			const loginUrl = new URL("/api/sync/cli-login", normalizedBaseUrl);
			loginUrl.searchParams.set("redirect_uri", callbackUrl);
			const loginUrlString = loginUrl.toString();

			// 自動起動に失敗しても手動で進められるようURLを必ず表示する。
			console.log(`Complete login in your browser: ${loginUrlString}`);
			void openBrowser(loginUrlString).then((opened) => {
				if (!opened) {
					console.log(
						"Could not open browser automatically. Open the URL above manually.",
					);
				}
			});

			// callback が来ない場合は一定時間で打ち切る。
			timeout = setTimeout(() => {
				finalize(() =>
					reject(new Error("Login timed out. Run `evame login` again.")),
				);
			}, CLI_LOGIN_TIMEOUT_MS);
		});
	});
}

function openBrowser(url: string): Promise<boolean> {
	// OSごとに標準の「URLを開く」コマンドを使う。
	if (process.platform === "darwin") {
		return spawnDetached("open", [url]);
	}
	if (process.platform === "win32") {
		return spawnDetached("cmd", ["/c", "start", "", url]);
	}
	return spawnDetached("xdg-open", [url]);
}

function spawnDetached(command: string, args: string[]): Promise<boolean> {
	// 親プロセスをブロックしないよう、切り離し実行で起動する。
	return new Promise((resolve) => {
		try {
			const child = spawn(command, args, {
				stdio: "ignore",
				detached: true,
			});
			child.on("error", () => resolve(false));
			child.unref();
			setTimeout(() => resolve(true), 150);
		} catch {
			resolve(false);
		}
	});
}
