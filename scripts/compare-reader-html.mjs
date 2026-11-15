import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

// SSR・Static Assets・R2の比較で、基準画像の更新と比較時の上書き禁止を揃える。
export async function compareReaderHtml(directory, origins, paths) {
	await writeFile(
		`${directory}/visual.config.mjs`,
		`
import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'visual-check.mjs',workers:1,retries:0,
 updateSnapshots:'none',reporter:'list',outputDir:'./visual-results',
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 expect:{toHaveScreenshot:{maxDiffPixels:0}}});
`,
	);
	await writeFile(
		`${directory}/visual-check.mjs`,
		`
import {test,expect} from '@playwright/test';
const origins=${JSON.stringify(origins)};
const targets=process.env.READER_STUDY_VISUAL_MODE==='baseline'?origins.slice(0,1):origins.slice(1);
for(const width of [1280,390])for(const path of ${JSON.stringify(paths)}){
 test(width+' '+path+' の初回HTMLが基準と一致する',async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:'light'});
  // 初回HTMLだけを比較し、閲覧数の書き込みを起こさない。
  await context.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
  try{for(const origin of targets){
   const page=await context.newPage();
   const response=await page.goto(new URL(path,origin).href);
   expect(response.status()).toBe(200);
   await expect(page.locator('main')).toBeVisible();
   await expect(page).toHaveScreenshot(width+'-'+path.replaceAll('/','_')+'.png');
   await page.close();
  }}finally{await context.close();}
 });
}
`,
	);
	for (const mode of ["baseline", "compare"]) {
		const child = spawn(
			"bun",
			[
				"x",
				"playwright",
				"test",
				"--config",
				`${directory}/visual.config.mjs`,
				...(mode === "baseline" ? ["--update-snapshots=all"] : []),
			],
			{
				env: {
					...process.env,
					SENTRY_DSN: "",
					VITE_SENTRY_DSN: "",
					READER_STUDY_VISUAL_MODE: mode,
				},
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
		let log = "";
		child.stdout.on("data", (data) => {
			log += data;
		});
		child.stderr.on("data", (data) => {
			log += data;
		});
		const code = await new Promise((resolve, reject) => {
			child.once("error", reject);
			child.once("exit", resolve);
		});
		await writeFile(`${directory}/visual-${mode}.log`, log);
		assert.equal(code, 0, `${directory}/visual-${mode}.log`);
	}
}
