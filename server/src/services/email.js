let warnedMissingCredentials = false;

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName =
    process.env.BREVO_SENDER_NAME || 'Threads of Chaithu Boutique';

  if (!apiKey || !senderEmail) {
    if (!warnedMissingCredentials) {
      console.warn(
        '⚠️ Brevo email configuration missing. Required: BREVO_API_KEY and BREVO_SENDER_EMAIL.'
      );
      console.warn(
        'Transactional emails are safely skipped. The application continues normal operation.'
      );
      warnedMissingCredentials = true;
    }

    return false;
  }

  try {
    const boutiqueHeader = `
      <div style="background-color:#702b43;padding:24px 20px;text-align:center;color:#fff8f0;font-family:'Playfair Display',Georgia,serif;">
        <h1 style="margin:0;font-size:22px;letter-spacing:2px;font-weight:600;">
          THREADS OF CHAITHU
        </h1>
        <p style="margin:6px 0 0;font-size:10px;letter-spacing:1.5px;color:#e8d1b5;">
          WHERE EVERY THREAD TELLS A STORY
        </p>
      </div>
    `;

    const boutiqueFooter = `
      <div style="background-color:#faf8f4;border-top:1px solid #e8e0d7;padding:20px;text-align:center;font-family:Arial,sans-serif;color:#827a72;font-size:11px;">
        <p style="margin:0 0 6px;">
          Thank you for shopping with Threads of Chaithu Boutique.
        </p>
        <p style="margin:0;">
          Handcrafted silhouettes & everyday elegance.
        </p>
      </div>
    `;

    const wrappedHtml = `
      <div style="max-width:600px;margin:20px auto;border:1px solid #e8e0d7;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        ${boutiqueHeader}

        <div style="padding:28px 24px;font-family:Arial,sans-serif;color:#292522;line-height:1.6;font-size:14px;">
          ${html}
        </div>

        ${boutiqueFooter}
      </div>
    `;

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
          subject: `Threads of Chaithu · ${subject}`,
          htmlContent: wrappedHtml,
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

    console.log('✅ Brevo API email sent successfully:', to);

    return true;
  } catch (err) {
    console.error('Email sending failed:', err.message);

    return false;
  }
}

export default sendEmail;
    const boutiqueHeader = `
      <div style="background-color:#702b43;padding:24px 20px;text-align:center;color:#fff8f0;font-family:'Playfair Display',Georgia,serif;">
        <h1 style="margin:0;font-size:22px;letter-spacing:2px;font-weight:600;">THREADS OF CHAITHU</h1>
        <p style="margin:6px 0 0;font-size:10px;letter-spacing:1.5px;color:#e8d1b5;">WHERE EVERY THREAD TELLS A STORY</p>
      </div>
    `;

    const boutiqueFooter = `
      <div style="background-color:#faf8f4;border-top:1px solid #e8e0d7;padding:20px;text-align:center;font-family:Arial,sans-serif;color:#827a72;font-size:11px;">
        <p style="margin:0 0 6px;">Thank you for shopping with Threads of Chaithu Boutique.</p>
        <p style="margin:0;">Handcrafted silhouettes & everyday elegance.</p>
      </div>
    `;

    const wrappedHtml = `
      <div style="max-width:600px;margin:20px auto;border:1px solid #e8e0d7;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.04);">
        ${boutiqueHeader}
        <div style="padding:28px 24px;font-family:Arial,sans-serif;color:#292522;line-height:1.6;font-size:14px;">
          ${html}
        </div>
        ${boutiqueFooter}
      </div>
    `;

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: `Threads of Chaithu · ${subject}`,
      html: wrappedHtml,
      text: text || subject
    });

    return true;
  } catch (err) {
    console.error('Email sending failed:', err.message);
    return false;
  }
}

export default sendEmail;
