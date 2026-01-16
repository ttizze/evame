import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

async function resendSendEmail(
	email: string,
	subject: string,
	html: string,
	from?: string,
) {
	const { data, error } = await resend.emails.send({
		from: from || process.env.EMAIL_FROM || "noreply@mail.reimei.dev",
		to: [email],
		subject,
		html,
	});

	if (error) {
		console.error("Resend email error:", error);
		throw new Error(`Failed to send email: ${error.message}`);
	}

	return data;
}

export async function sendMagicLinkEmail(
	email: string,
	magicLink: string,
	_token: string,
) {
	const emailHtml = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
      <h1 style="color: #333; text-align: center;">Sign in to Evame</h1>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${magicLink}"
          style="background-color: #0070f3; color: white; padding: 12px 24px;
          text-decoration: none; border-radius: 5px; display: inline-block;">
          Sign in to Evame
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">If you did not request this email, you can safely ignore it.</p>
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">
        This link was sent from Evame. If you cannot click the button above, please copy and paste this URL into your browser:<br/>
        <span style="color: #666;">${magicLink}</span>
      </p>
    </div>
  `;

	return resendSendEmail(email, "Sign in to Evame", emailHtml);
}
