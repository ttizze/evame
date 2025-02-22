import { Link } from "@/i18n/routing";

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

				<section className="mb-8">
					<p className="mb-4">
						Please read the following Terms of Service carefully before using
						Evame (hereinafter referred to as "the Service"). By using the
						Service, you are deemed to have agreed to these terms.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						1. Service Description
					</h2>
					<p>
						The Service is a platform where users can post articles and other
						users can provide translations for those articles. Users can post
						their own articles and provide translations for articles posted by
						other users.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						2. User Responsibilities
					</h2>
					<ul className="list-disc pl-6">
						<li>
							Users are responsible for complying with all applicable laws and
							regulations when using the Service.
						</li>
						<li>
							Users are responsible for complying with the copyright and terms
							of use of the content they translate.
						</li>
						<li>
							Use that violates copyright law or unauthorized commercial use is
							prohibited.
						</li>
						<li>
							Users are fully responsible for the use of content displayed
							through the Service.
						</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						3. Copyright and Intellectual Property Rights
					</h2>
					<p>
						Users grant the operating company permission to post and distribute
						(including public transmission and making transmittable) user
						content on this website.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">4. Disclaimer</h2>
					<ul className="list-disc pl-6">
						<li>
							The Service is provided "as is" and makes no warranties of any
							kind, either express or implied.
						</li>
						<li>
							The Service does not guarantee the accuracy, completeness,
							timeliness, or quality of posted articles or translations.
						</li>
						<li>
							The Service is not responsible for any damages arising from
							interactions between users or content posted on the Service.
						</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						5. Content Removal and Usage Restrictions
					</h2>
					<p>
						The Service reserves the right to remove without notice any posts or
						content deemed to violate the terms of service or be inappropriate.
						The Service also reserves the right to restrict or terminate the use
						of the Service by specific users.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						6. Governing Law and Jurisdiction
					</h2>
					<p>
						The interpretation and application of these terms shall be governed
						by Japanese law, and the Tokyo District Court shall have exclusive
						jurisdiction as the court of first instance for any disputes related
						to the Service.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						7. Changes to the Terms
					</h2>
					<p>
						The Service reserves the right to change these terms as necessary.
						If you continue to use the Service after changes are made, you are
						deemed to have agreed to the updated terms.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						Confirmation of Agreement
					</h2>
					<p>
						By using the Service, you are deemed to have agreed to the above
						terms of service. If you do not agree to these terms, please
						discontinue use of the Service.
					</p>
				</section>

				<div className="mt-8">
					<Link href="/" className="text-blue-600 hover:underline">
						Return to Home
					</Link>
				</div>
			</main>
		</div>
	);
}
