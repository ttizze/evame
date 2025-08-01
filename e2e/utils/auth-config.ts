// Test-specific auth configuration
// This file contains configuration that might be needed for E2E tests

export const TEST_AUTH_CONFIG = {
	// For testing purposes, you might want to mock the email provider
	// or use a test-specific configuration
	providers: {
		resend: {
			from: "test@example.com",
		},
	},
	// Test-specific secrets
	secrets: {
		NEXTAUTH_SECRET: "test-secret-key",
		NEXTAUTH_URL: "http://localhost:3000",
	},
};

// Environment variables that should be set for tests
export const REQUIRED_TEST_ENV_VARS = [
	"DATABASE_URL",
	"NEXTAUTH_SECRET",
	"NEXTAUTH_URL",
	// "RESEND_API_KEY", // Optional for tests, can be mocked
];
