# Server Actions 規約

## 認証・バリデーション

Server Action では認証とバリデーションに共通ユーティリティを使用する。

### requireAuth

認証のみが必要な場合に使用。未認証時は自動的に `/auth/login` へリダイレクト。

```ts
import { requireAuth } from "@/app/[locale]/_action/auth-and-validate";

export async function myAction(): Promise<ActionResponse<Data>> {
  const currentUser = await requireAuth();
  // currentUser.id, currentUser.handle, currentUser.plan が利用可能
}
```

### authAndValidate

認証 + Zod バリデーションが必要な場合に使用。

```ts
import { authAndValidate } from "@/app/[locale]/_action/auth-and-validate";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
});

export async function myAction(formData: FormData) {
  const result = await authAndValidate(schema, formData);
  if (!result.success) {
    return { success: false, zodErrors: result.zodErrors };
  }
  const { currentUser, data } = result;
  // data は型安全にアクセス可能
}
```

## レスポンス型

Server Action のレスポンスは `ActionResponse<T>` 型を使用する。

```ts
type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; message: string };
```

Zod バリデーションエラーがある場合は `zodErrors` を含める:

```ts
type ActionResponseWithValidation<T> =
  | { success: true; data: T }
  | { success: false; message?: string; zodErrors?: Record<string, string[]> };
```
