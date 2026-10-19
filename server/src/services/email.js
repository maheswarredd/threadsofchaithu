let warnedMissingCredentials = false;

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName =
    process.env.BREVO_SENDER_NAME || 'Threads of Chaithu Boutique';

  if (!apiKey || !senderEmail) {
    if (!warnedMissingCredentials) {
      console.warn(
        'Brevo email configuration missing. Required: BREVO_API_KEY and BREVO_SENDER_EMAIL.'
      );
      warnedMissingCredentials = true;
    }

    return false;
  }

  try {
    const response = await fetch(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail
          },
          to: [
            {
              email: to
            }
          ],
          subject,
          htmlContent: html,
          textContent: text || subject
        })
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        'Brevo API email failed:',
        response.status,
        responseText
      );

      return false;
    }

    console.log('Brevo API email sent successfully:', to);

    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);

    return false;
  }
}

export default sendEmail;
