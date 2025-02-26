"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
	error,
	reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// エラーオブジェクトの詳細情報をコンソールに出力
		console.error("Error object:", error);

		// エラーオブジェクトのプロパティを列挙
		console.error("Error properties:", Object.getOwnPropertyNames(error));

		// Response オブジェクトの場合の追加情報
		if (error.toString() === "[object Response]") {
			const responseError = error as unknown as Response;
			console.error("Response details:", {
				status: responseError.status,
				url: responseError.url,
				type: responseError.type,
				redirected: responseError.redirected,
			});
		}
		Sentry.captureException(error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				{/* `NextError` is the default Next.js error page component. Its type
        definition requires a `statusCode` prop. However, since the App Router
        does not expose status codes for errors, we simply pass 0 to render a
        generic error message. */}
				<NextError statusCode={0} />
				<button onClick={() => reset()} type="button">
					Reset error boundary
				</button>
			</body>
		</html>
	);
}
