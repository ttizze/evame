# Server Actions 規約

Server Action の認証・入力検証・返却形式を統一するための正本ドキュメント。

## 目的
- Action ごとの実装揺れをなくす
- `useActionState` で扱いやすいレスポンス形式を維持する
- 認証漏れ・権限漏れ・エラー握り潰しを防ぐ

## 適用範囲
- `src/app/**/action.ts`
- `src/app/[locale]/_action/*.ts`

## 基本原則
- Action は「境界」のみ担当し、業務ロジックは service/domain/db に寄せる
- 入力は Zod で検証し、返却は `ActionResponse<T, U>` で統一する
- 認証・バリデーションは共通ユーティリティを使い、手書き実装を増やさない

## 認証・バリデーション

### 認証のみ必要な場合
- `requireAuth` を使う
- 未認証は `/auth/login` にリダイレクトされる

```ts
import { requireAuth } from "@/app/[locale]/_action/auth-and-validate";

const currentUser = await requireAuth();
```

### 認証 + FormData 検証が必要な場合
- `authAndValidate(schema, formData)` を使う
- 失敗時は `zodErrors` をそのまま返す

```ts
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";

const v = await authAndValidate(schema, formData);
if (!v.success) {
	return { success: false, zodErrors: v.zodErrors };
}
const { currentUser, data } = v;
```

### 認可（Authorization）
- 認可判定の主語は必ず `currentUser.id`
- 他ユーザーのリソース更新/削除は service/db 側で拒否する
- 判定結果は `success: false` + `message` で返す（仕様上リダイレクトが必要な場合はその仕様を優先）

## 返却規約（ActionResponse）

`src/app/types.ts` の `ActionResponse<T, U>` を使う。

```ts
type ActionResponse<T, U> =
	| { success: true; data: T; message?: string }
	| { success: false; message?: string; zodErrors?: Record<string, string[]> };
```

返却パターン:
- バリデーション失敗: `{ success: false, zodErrors }`
- 業務ルール失敗: `{ success: false, message }`
- 成功: `{ success: true, data }`
- 成功で戻り値不要: `{ success: true, data: undefined }`

注意:
- 予期可能な失敗は throw せず、`ActionResponse` で返す
- 予期しない障害のみ throw して上位に伝搬させる

## ナビゲーション API の扱い
- `redirect` / `permanentRedirect` / `notFound` / `forbidden` / `unauthorized` を `try-catch` で握り潰さない
- これらを含む処理を `catch` する必要がある場合は `unstable_rethrow` を使って再送出する
- 成功時リダイレクトはドメイン処理成功後に実行する

## 実装テンプレート

```ts
"use server";

import { z } from "zod";
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import type { ActionResponse } from "@/app/types";

const schema = z.object({
	id: z.coerce.number(),
});

type State = ActionResponse<{ updated: boolean }, { id: number }>;

export async function updateAction(
	_previousState: State,
	formData: FormData,
): Promise<State> {
	const v = await authAndValidate(schema, formData);
	if (!v.success) return { success: false, zodErrors: v.zodErrors };

	const { currentUser, data } = v;
	const result = await updateSomething(data.id, currentUser.id);
	if (!result.success) return { success: false, message: result.message };

	return { success: true, data: { updated: true } };
}
```

## テスト観点（最低限）
- 未認証時にログインへリダイレクトされる
- 不正入力時に `zodErrors` を返す
- 権限なし操作が拒否される
- 成功時に `success: true` と期待データを返す
- リダイレクトを含む場合、ナビゲーション API を握り潰さない

## 参照実装
- `src/app/[locale]/_action/auth-and-validate.ts`
- `src/app/types.ts`
