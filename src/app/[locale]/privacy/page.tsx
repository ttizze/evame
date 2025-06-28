import Link from "next/link";

export default function PrivacyPolicyPage() {
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

				<section className="mb-8">
					<p className="mb-4">
						This Privacy Policy describes how Evame ("we", "our", or "us")
						collects, uses, and shares your personal information when you use
						our service.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						1. Information We Collect
					</h2>
					<p className="mb-4">We collect the following types of information:</p>
					<ul className="list-disc pl-6">
						<li>Account information (e.g., handle, email address)</li>
						<li>Content you post (articles and translations)</li>
						<li>Usage data (e.g., pages visited, actions taken)</li>
						<li>Device information (e.g., IP address, browser type)</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						2. How We Use Your Information
					</h2>
					<p className="mb-4">We use your information to:</p>
					<ul className="list-disc pl-6">
						<li>Provide and improve our service</li>
						<li>Communicate with you about your account or the service</li>
						<li>Analyze usage patterns and optimize user experience</li>
						<li>Prevent fraud and ensure the security of our service</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						3. Information Sharing and Disclosure
					</h2>
					<p className="mb-4">
						We may share your information in the following circumstances:
					</p>
					<ul className="list-disc pl-6">
						<li>With your consent</li>
						<li>To comply with legal obligations</li>
						<li>To protect our rights, privacy, safety, or property</li>
						<li>In connection with a merger, sale, or acquisition</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
					<p>
						We implement reasonable security measures to protect your personal
						information. However, no method of transmission over the Internet or
						electronic storage is 100% secure.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
					<p className="mb-4">You have the right to:</p>
					<ul className="list-disc pl-6">
						<li>Access, correct, or delete your personal information</li>
						<li>Object to or restrict the processing of your data</li>
						<li>Request a copy of your data in a portable format</li>
						<li>Withdraw your consent at any time</li>
					</ul>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">
						6. Changes to This Policy
					</h2>
					<p>
						We may update this Privacy Policy from time to time. We will notify
						you of any changes by posting the new Privacy Policy on this page
						and updating the "Last updated" date.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-semibold mb-4">7. Contact Us</h2>
					<p>
						If you have any questions about this Privacy Policy, please contact
						us at: [Your Contact Information]
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
