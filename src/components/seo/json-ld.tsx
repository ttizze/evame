import type {
	Article,
	BreadcrumbList,
	ImageObject,
	Organization,
	ProfilePage,
	Thing,
	WebSite,
	WithContext,
} from "schema-dts";
import { BASE_URL } from "@/app/_constants/base-url";

const ORGANIZATION_ID = `${BASE_URL}/#organization`;
const ORGANIZATION_LOGO: ImageObject = {
	"@type": "ImageObject",
	url: `${BASE_URL}/logo.png`,
};

function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
	return <script type="application/ld+json">{JSON.stringify(data)}</script>;
}

export function OrganizationJsonLd() {
	const data: WithContext<Organization> = {
		"@context": "https://schema.org",
		"@type": "Organization",
		"@id": ORGANIZATION_ID,
		name: "Evame",
		url: BASE_URL,
		logo: ORGANIZATION_LOGO,
	};
	return <JsonLd data={data} />;
}

export function WebSiteJsonLd({ locale }: { locale: string }) {
	const data: WithContext<WebSite> = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "Evame",
		url: BASE_URL,
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${BASE_URL}/${locale}/search?query={search_term_string}`,
			},
			// @ts-expect-error - schema.org spec allows this but schema-dts doesn't type it
			"query-input": "required name=search_term_string",
		},
	};
	return <JsonLd data={data} />;
}

type ArticleJsonLdProps = {
	headline: string;
	description: string;
	authorName: string;
	authorUrl: string;
	datePublished: string;
	dateModified: string;
	url: string;
	image?: string;
	inLanguage: string;
};

export function ArticleJsonLd(props: ArticleJsonLdProps) {
	const data: WithContext<Article> = {
		"@context": "https://schema.org",
		"@type": "Article",
		headline: props.headline,
		description: props.description,
		author: {
			"@type": "Person",
			name: props.authorName,
			url: props.authorUrl,
		},
		publisher: {
			"@type": "Organization",
			"@id": ORGANIZATION_ID,
			name: "Evame",
			logo: ORGANIZATION_LOGO,
		},
		datePublished: props.datePublished,
		dateModified: props.dateModified,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": props.url,
		},
		...(props.image && { image: props.image }),
		inLanguage: props.inLanguage,
	};
	return <JsonLd data={data} />;
}

type BreadcrumbItem = {
	name: string;
	url: string;
};

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
	const data: WithContext<BreadcrumbList> = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem" as const,
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};
	return <JsonLd data={data} />;
}

type ProfilePageJsonLdProps = {
	name: string;
	url: string;
	image?: string;
	description?: string;
};

export function ProfilePageJsonLd(props: ProfilePageJsonLdProps) {
	const data: WithContext<ProfilePage> = {
		"@context": "https://schema.org",
		"@type": "ProfilePage",
		url: props.url,
		mainEntity: {
			"@type": "Person",
			name: props.name,
			url: props.url,
			...(props.image && { image: props.image }),
			...(props.description && { description: props.description }),
		},
	};
	return <JsonLd data={data} />;
}
