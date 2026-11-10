import { z } from "zod";

/**
 * 記事の題名の正規化と検証。Webの保存とアプリのAPIで同じ規則にする。
 * 片方だけ変えると、同じ題名を送っても版が変わったと判定され、変更なしの再送が競合になる。
 */
export const pageTitleSchema = z
	.string()
	.transform((value) => value.replace(/\r\n|\r|\n/g, " ").trim())
	.pipe(z.string().min(1).max(100));
