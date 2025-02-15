// import type { SendEmailFunction } from "remix-auth-email-link";
// import type { SanitizedUser } from "~/types";
// import { resendSendEmail } from "~/utils/resend.server";

// export const sendMagicLink: SendEmailFunction<SanitizedUser> = async (
// 	options,
// ) => {
// 	const emailHtml = `
// 		<div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
// 			<h1 style="color: #333; text-align: center;">Welcome to Evame</h1>
// 			<p style="color: #666; margin: 20px 0;">Click the button below to sign in to your account. This link will expire in 24 hours.</p>
// 			<div style="text-align: center; margin: 30px 0;">
// 				<a href="${options.magicLink}"
// 					style="background-color: #0070f3; color: white; padding: 12px 24px;
// 					text-decoration: none; border-radius: 5px; display: inline-block;">
// 					Sign in to Evame
// 				</a>
// 			</div>
// 			<p style="color: #666; font-size: 14px;">If you didn't request this email, you can safely ignore it.</p>
// 			<hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
// 			<p style="color: #999; font-size: 12px; text-align: center;">
// 				This link was sent from Evame. If you can't click the button above, copy and paste this URL into your browser:<br/>
// 				<span style="color: #666;">${options.magicLink}</span>
// 			</p>
// 		</div>
// 	`;

// 	await resendSendEmail(options.emailAddress, "Sign in to Evame", emailHtml);
// };
