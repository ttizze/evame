import { expect, test } from "@playwright/test";
import { prisma } from "./utils/test-setup";

test.describe("Magic Link Authentication", () => {
	test.beforeEach(async () => {
		// Clean up any existing test data
		await prisma.user.deleteMany({
			where: {
				email: {
					startsWith: "test-",
				},
			},
		});
		await prisma.verificationToken.deleteMany({
			where: {
				identifier: {
					startsWith: "test-",
				},
			},
		});
	});

	test.afterAll(async () => {
		// Final cleanup
		await prisma.user.deleteMany({
			where: {
				email: {
					startsWith: "test-",
				},
			},
		});
		await prisma.verificationToken.deleteMany({
			where: {
				identifier: {
					startsWith: "test-",
				},
			},
		});
		await prisma.$disconnect();
	});

	test("creates user with auto-generated name via magic-link", async ({
		page,
	}) => {
		const email = "test-alice@example.com";

		// 1. Navigate to login page
		await page.goto("/en/auth/login");

		// 2. Fill in email and submit magic link request
		await page.fill('input[name="email"]', email);
		await page.click('button[type="submit"]');

		// 3. Wait for success message
		await expect(page.locator("text=Email sent successfully!")).toBeVisible();

		// 4. Get the verification token from database
		const verificationToken = await prisma.verificationToken.findFirstOrThrow({
			where: { identifier: email },
		});

		// 5. Navigate to the callback URL to complete authentication
		const callbackUrl = `/api/auth/callback/email?token=${encodeURIComponent(
			verificationToken.token,
		)}&email=${encodeURIComponent(email)}`;

		await page.goto(callbackUrl);

		// 6. Verify user was created with auto-generated name
		const user = await prisma.user.findUniqueOrThrow({
			where: { email },
		});

		expect(user.name).toBeTruthy(); // Should not be empty or null
		expect(user.name.length).toBeGreaterThan(0);
		expect(user.email).toBe(email);
		expect(user.handle).toBeTruthy();
		expect(user.handle.length).toBeGreaterThan(0);
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.updatedAt).toBeInstanceOf(Date);
	});

	test("handles invalid magic link token", async ({ page }) => {
		const email = "test-bob@example.com";
		const invalidToken = "invalid-token";

		// Try to access callback with invalid token
		const callbackUrl = `/api/auth/callback/email?token=${encodeURIComponent(
			invalidToken,
		)}&email=${encodeURIComponent(email)}`;

		await page.goto(callbackUrl);

		// Should redirect to error page (Configuration error) or login page
		// NextAuth may redirect to error page when providers are not properly configured
		await expect(page).toHaveURL(/.*\/auth\/(error|login).*/);

		// Verify no user was created
		const user = await prisma.user.findUnique({
			where: { email },
		});
		expect(user).toBeNull();
	});

	test("prevents duplicate user creation", async ({ page }) => {
		const email = "test-charlie@example.com";

		// Create user first time
		await page.goto("/en/auth/login");
		await page.fill('input[name="email"]', email);
		await page.click('button[type="submit"]');
		await expect(page.locator("text=Email sent successfully!")).toBeVisible();

		const verificationToken1 = await prisma.verificationToken.findFirstOrThrow({
			where: { identifier: email },
		});

		await page.goto(
			`/api/auth/callback/email?token=${encodeURIComponent(
				verificationToken1.token,
			)}&email=${encodeURIComponent(email)}`,
		);

		const user1 = await prisma.user.findUniqueOrThrow({
			where: { email },
		});

		// Try to create user again with same email
		await page.goto("/en/auth/login");
		await page.fill('input[name="email"]', email);
		await page.click('button[type="submit"]');
		await expect(page.locator("text=Email sent successfully!")).toBeVisible();

		const verificationToken2 = await prisma.verificationToken.findFirstOrThrow({
			where: { identifier: email },
		});

		await page.goto(
			`/api/auth/callback/email?token=${encodeURIComponent(
				verificationToken2.token,
			)}&email=${encodeURIComponent(email)}`,
		);

		// Should not create duplicate user
		const users = await prisma.user.findMany({
			where: { email },
		});

		expect(users).toHaveLength(1);
		expect(users[0].id).toBe(user1.id);
		expect(users[0].name).toBe(user1.name);
		expect(users[0].handle).toBe(user1.handle);
	});

	test("validates email format", async ({ page }) => {
		const invalidEmail = "invalid-email";

		await page.goto("/en/auth/login");
		await page.fill('input[name="email"]', invalidEmail);
		await page.click('button[type="submit"]');

		// Should show validation error
		await expect(
			page.locator("text=Please enter a valid email address"),
		).toBeVisible();

		// Verify no verification token was created
		const token = await prisma.verificationToken.findFirst({
			where: { identifier: invalidEmail },
		});
		expect(token).toBeNull();
	});

	test("handles expired verification token", async ({ page }) => {
		const email = "test-david@example.com";

		// Create a verification token manually with past expiration
		await prisma.verificationToken.create({
			data: {
				identifier: email,
				token: "expired-token",
				expires: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
			},
		});

		// Try to use expired token
		const callbackUrl = `/api/auth/callback/email?token=${encodeURIComponent(
			"expired-token",
		)}&email=${encodeURIComponent(email)}`;

		await page.goto(callbackUrl);

		// Should redirect to error page (Configuration error) or login page
		await expect(page).toHaveURL(/.*\/auth\/(error|login).*/);

		// Verify no user was created
		const user = await prisma.user.findUnique({
			where: { email },
		});
		expect(user).toBeNull();
	});

	test("handles NextAuth configuration errors gracefully", async ({ page }) => {
		// Test that the application handles NextAuth configuration issues
		// This is particularly important when email providers are not configured

		const email = "test-config@example.com";

		// Navigate to login page
		await page.goto("/en/auth/login");

		// Fill in email and submit
		await page.fill('input[name="email"]', email);
		await page.click('button[type="submit"]');

		// Should either show success message or handle configuration error gracefully
		// The exact behavior depends on whether RESEND_API_KEY is configured
		try {
			await expect(page.locator("text=Email sent successfully!")).toBeVisible({
				timeout: 5000,
			});
		} catch {
			// If email sending fails due to configuration, that's also acceptable
			// The important thing is that the app doesn't crash
			await expect(page).toHaveURL(/.*\/auth\/login.*/);
		}
	});
});
