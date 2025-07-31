import Link from "next/link";

export default function PrivacyPolicyPage() {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

				<section className="mb-8">
					<p className="mb-4">
						This Privacy Policy explains how <b>REIMEI LLC</b> (“REIMEI”, “we”,
						“our”, or “us”) collects, uses, discloses, and safeguards Personal
						Data when you use our services (the “Service”).
					</p>
					<p className="text-sm">
						Last updated: <time dateTime="2025-07-31">31 July 2025</time>
					</p>
				</section>

				{/* 0. Controller */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">Controller Details</h2>
					<p>
						<b>REIMEI LLC</b>
						<br />
						3-7-46 Hakenomiya, Kita-ku, Kumamoto-shi, Kumamoto 〒861-8064 Japan
						<br />
						Managing Member: Takate Tomoki
						<br />
						Data Protection Officer:
						<a href="mailto:privacy@evame.tech">privacy@evame.tech</a>
					</p>
				</section>

				{/* 1. Information We Collect */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						1. Information We Collect & How
					</h2>
					<p className="mb-4">
						We collect Personal Data you provide directly and data generated
						automatically when you interact with the Service:
					</p>
					<ul className="list-disc pl-6">
						<li>Account data (handle, email address, display name)</li>
						<li>
							Content you post (articles, translations, comments, votes,
							attachments)
						</li>
						<li>Usage logs (pages visited, actions taken, timestamps)</li>
						<li>
							Device & connection info (IP address, browser type, OS, referrer)
						</li>
						<li>Cookies & similar technologies (please see “Cookies” below)</li>
					</ul>
				</section>

				{/* 2. Legal Bases & Purposes */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						2. Legal Bases & Purposes
					</h2>
					<p className="mb-4">
						We process Personal Data under the following legal bases:
					</p>
					<ul className="list-disc pl-6 mb-4">
						<li>Performance of a contract (provision of the Service)</li>
						<li>Legitimate interests (service improvement, security)</li>
						<li>Consent (optional marketing emails, analytics cookies)</li>
						<li>Compliance with legal obligations</li>
					</ul>
					<p className="mb-4">Key purposes include to:</p>
					<ul className="list-disc pl-6">
						<li>Provide, maintain, and improve the Service</li>
						<li>Communicate with you regarding your account or feedback</li>
						<li>Analyze usage patterns to optimize user experience</li>
						<li>Detect, prevent, and investigate fraud or abuse</li>
					</ul>
				</section>

				{/* 3. Retention */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">3. Retention Period</h2>
					<p>
						We retain Personal Data for as long as your account is active and
						for six (6) months after deletion unless longer retention is
						required by law (e.g. tax records) or our legitimate interests (e.g.
						security logs).
					</p>
				</section>

				{/* 4. International Transfers */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						4. International Transfers
					</h2>
					<p>
						Your data may be processed on servers located outside Japan and the
						EU / EEA (e.g. AWS us-east-1). When we transfer Personal Data
						internationally, we rely on Standard Contractual Clauses or adequacy
						decisions to ensure an equivalent level of protection.
					</p>
				</section>

				{/* 5. Sharing */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						5. Sharing and Disclosure
					</h2>
					<p className="mb-4">
						We share Personal Data only in the following circumstances:
					</p>
					<ul className="list-disc pl-6">
						<li>With your explicit consent</li>
						<li>With service providers under confidentiality agreements</li>
						<li>To comply with legal or regulatory obligations</li>
						<li>
							To protect the rights, property, or safety of REIMEI LLC or others
						</li>
						<li>In connection with corporate restructuring (e.g. merger)</li>
					</ul>
				</section>

				{/* 6. Cookies */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
					<p className="mb-4">
						We use essential cookies for authentication and session management,
						and optional analytics cookies to understand feature usage. You can
						manage cookie preferences in your browser or via our in-app cookie
						banner.
					</p>
				</section>

				{/* 7. Your Rights */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
					<p className="mb-4">
						Subject to applicable law, you have the right to access, correct,
						delete, restrict, or object to the processing of your Personal Data,
						and to receive a portable copy. Requests can be sent to
						<a href="mailto:privacy@evame.tech">privacy@evame.tech</a>. You may
						also lodge a complaint with the Personal Information Protection
						Commission (Japan) or your local supervisory authority.
					</p>
				</section>

				{/* 8. Children */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">8. Children’s Privacy</h2>
					<p>
						The Service is not directed to children under 13. We do not
						knowingly collect Personal Data from children. If we learn that a
						child has provided us Personal Data, we will delete it promptly.
					</p>
				</section>

				{/* 9. Updates */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						9. Changes to This Policy
					</h2>
					<p>
						We may amend this Policy. We will notify you at least 30 days in
						advance via in-app banner or email, and seek renewed consent where
						required.
					</p>
				</section>

				{/* 10. Contact */}
				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">10. Contact</h2>
					<p>
						Questions about this Policy? Contact us at
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
