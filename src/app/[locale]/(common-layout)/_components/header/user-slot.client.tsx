"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "@/auth/client";
import { Skeleton } from "@/components/ui/skeleton";
import { StartButton } from "../start-button";
import { LocaleSelector } from "./locale-selector/client";
import { UserMenu } from "./user-menu.client";

type CurrentUser = {
	handle: string;
	name: string;
	image?: string | null;
	plan?: string;
};

export function HeaderUserSlot({ locale }: { locale: string }) {
	const [hydrated, setHydrated] = useState(false);
	const [sessionUser, setSessionUser] = useState<CurrentUser | null>(null);
	const [sessionPending, setSessionPending] = useState(true);
	useEffect(() => setHydrated(true), []);
	useEffect(() => {
		let active = true;
		void authClient
			.getSession()
			.then((result) => {
				if (!active) return;
				setSessionUser(
					(result.data?.user as unknown as CurrentUser | undefined) ?? null,
				);
				setSessionPending(false);
			})
			.catch(() => {
				if (active) setSessionPending(false);
			});
		return () => {
			active = false;
		};
	}, []);

	const showLoading = !hydrated || sessionPending;

	if (showLoading) {
		return (
			<div className="flex items-center gap-3">
				<a aria-label="Search for pages" href={`/${locale}/search`}>
					<Search className="h-6 w-6" />
				</a>
				<Skeleton className="h-6 w-[150px] rounded-full" />
				<Skeleton className="h-6 w-20 rounded-full" />
			</div>
		);
	}

	if (!sessionUser) {
		return (
			<>
				<a aria-label="Search for pages" href={`/${locale}/search`}>
					<Search className="h-6 w-6" />
				</a>
				<LocaleSelector locale={locale} />
				<StartButton locale={locale} />
			</>
		);
	}

	return (
		<>
			<a aria-label="Search for pages" href={`/${locale}/search`}>
				<Search className="h-6 w-6" />
			</a>
			<UserMenu currentUser={sessionUser} locale={locale} />
		</>
	);
}
