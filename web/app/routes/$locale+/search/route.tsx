import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { Link } from "@remix-run/react";
import { Form } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { authenticator } from "~/utils/auth.server";
import { searchTitle } from "./functions/queries.server";

export const meta: MetaFunction = () => {
	return [{ title: "Search" }, { name: "robots", content: "noindex" }];
};

const schema = z.object({
	query: z.string().min(1, "Search query is required"),
});

export async function loader({ request }: LoaderFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request);
	return { currentUser };
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema });
	if (submission.status !== "success") {
		return { lastResult: submission.reply(), searchResults: [] };
	}
	const { query } = submission.value;

	const searchResults = await searchTitle(query);
	return { lastResult: submission.reply(), searchResults };
}

export default function Search() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isSearching = navigation.state === "submitting";

	const [form, fields] = useForm({
		id: "search-form",
		constraint: getZodConstraint(schema),
		lastResult: actionData?.lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
	});

	return (
		<div>
			<div className="container mx-auto max-w-4xl min-h-50 py-10">
				<Form method="post" {...getFormProps(form)}>
					<div className="flex gap-2">
						<Input
							{...getInputProps(fields.query, { type: "text" })}
							placeholder="Titles or translation titles..."
							className="w-full"
						/>
						<Button type="submit" disabled={isSearching}>
							{isSearching ? "Searching..." : "Search"}
						</Button>
					</div>
				</Form>
				{actionData?.searchResults && (
					<div className=" shadow-lg rounded-md z-10  ">
						{actionData.searchResults.length === 0 ? (
							<p className="p-2 text-gray-500">No results found.</p>
						) : (
							<ul className="max-h-60 overflow-y-auto">
								{actionData.searchResults.map((result) => (
									<li
										key={result.id}
										className="hover:bg-gray-300 dark:hover:bg-gray-700 transition duration-150 rounded-lg"
									>
										<Link
											to={`/${result.user.userName}/page/${encodeURIComponent(result.slug)}`}
											className="block p-2 text-inherit no-underline"
										>
											<h3 className="font-bold">{result.title}</h3>
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
