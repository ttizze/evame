import Link from "next/link";

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

				<section className="mb-8">
					<p>
						These Terms of Service (“Terms”) govern your access to and use of
						Evame (the “Service”). By clicking “I agree” or using the Service,
						you accept these Terms and our{" "}
						<Link className="text-blue-600" href="/privacy-policy">
							Privacy Policy
						</Link>
						.
					</p>
					<p className="text-sm">
						Last updated:
						<time dateTime="2025-07-31">31 July 2025</time>
					</p>
				</section>

				{/* 0. Definitions */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
					<ul className="list-disc pl-6">
						<li>
							<b>“User Content”</b>: articles, translations, comments, images,
							and any material you submit.
						</li>
						<li>
							<b>“Translation”</b>: text that renders a source work into another
							language, whether AI-assisted or human-authored.
						</li>
						<li>
							<b>“We/Us”</b>: REIMEI LLC.
						</li>
					</ul>
				</section>

				{/* 1. Service Description */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						2. Service Description
					</h2>
					<p>
						The Service is a platform where users may publish articles and
						upload or refine translations. AI may provide draft translations for
						human post-editing.
					</p>
				</section>

				{/* 2. Responsibilities */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						3. User Responsibilities
					</h2>
					<ul className="list-disc pl-6">
						<li>Comply with all applicable laws and regulations.</li>
						<li>
							Ensure you hold necessary rights or licences for source texts.
						</li>
						<li>
							Refrain from infringing intellectual-property, privacy, or other
							rights.
						</li>
						<li>No unlawful, harassing, or hateful content.</li>
						<li>
							Safeguard login credentials; you are responsible for activity on
							your account.
						</li>
					</ul>
				</section>

				{/* 3. Licence of User Content */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						4. Licence of User Content
					</h2>
					<p className="mb-4">
						By submitting User Content you grant REIMEI LLC a worldwide,
						royalty-free, sublicensable licence to host, reproduce, distribute,
						publicly display, and create derivative works for the purpose of
						operating and improving the Service.
					</p>
					<p className="mb-4">
						<b>Translations of Public-Domain source texts</b> are released by
						you into the public domain (CC0 1.0). If the source text is subject
						to copyright, your translation is licensed under{" "}
						<a
							className="text-blue-600"
							href="https://creativecommons.org/licenses/by-sa/4.0/"
							rel="noreferrer"
							target="_blank"
						>
							CC BY-SA 4.0
						</a>
						.
					</p>
				</section>

				{/* 4. Copyright Notification */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						5. Copyright Infringement (DMCA)
					</h2>
					<p>
						If you believe content infringes your copyright, send a notice to
						<a href="mailto:dmca@evame.tech">dmca@evame.tech</a>
						with the information required by 17 U.S.C. § 512. We will respond
						and, where appropriate, remove or disable access to the material.
					</p>
				</section>

				{/* 5. Disclaimer */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">6. Disclaimer</h2>
					<p>
						The Service is provided “as is” without warranty of any kind. We
						disclaim all implied warranties, including merchantability, fitness
						for a particular purpose, and non-infringement.
					</p>
				</section>

				{/* 6. Limitation of Liability */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						7. Limitation of Liability
					</h2>
					<p>
						To the maximum extent permitted by law, REIMEI LLC's aggregate
						liability arising out of or relating to the Service shall not exceed
						the greater of (a) JPY 10,000 or (b) the amount you paid us in the
						prior 12 months.
					</p>
				</section>

				{/* 7. Force Majeure */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">8. Force Majeure</h2>
					<p>
						We are not liable for failure to perform due to causes beyond our
						reasonable control, including natural disasters, internet outages,
						or governmental actions.
					</p>
				</section>

				{/* 8. EU DSA Compliance */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						9. EU Digital Services Act Notice
					</h2>
					<p>
						EU users may appeal content-moderation decisions or submit
						illegal-content notices by emailing
						<a href="mailto:legal@evame.tech">legal@evame.tech</a>
						with the subject line <code>[DSA Appeal]</code> or
						<code>[Illegal Content]</code>. We publish an annual transparency
						report in accordance with Regulation (EU) 2022/2065.
					</p>
				</section>

				{/* 9. Governing Law */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						10. Governing Law & Jurisdiction
					</h2>
					<p>
						These Terms are governed by Japanese law. The Tokyo District Court
						has exclusive jurisdiction for disputes arising out of or relating
						to the Service.
					</p>
				</section>

				{/* 10. Changes */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						11. Changes to These Terms
					</h2>
					<p>
						We may revise these Terms. We will notify you at least 30 days in
						advance by email and in-app banner. Continued use after the
						effective date constitutes acceptance of the revised Terms.
					</p>
				</section>

				{/* 11. Contact */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">12. Contact</h2>
					<p>
						For any questions, email us at
						<a className="text-blue-600" href="mailto:support@evame.tech">
							support@evame.tech
						</a>
						.
					</p>
				</section>

				<div className="mt-8">
					<Link className="text-blue-600 hover:underline" href="/">
						Return to Home
					</Link>
				</div>
			</main>
		</div>
	);
}
