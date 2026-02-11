// Email sending utility using Resend
// Set RESEND_API_KEY in .env.local to enable email sending

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const PLATFORM_NAME = "ROB — Role of Bridge";

export type ArtistApplicationEmail = {
  galleryEmail: string;
  galleryName: string;
  openCallTheme: string;
  artistName: string;
  artistEmail: string;
  artistCountry: string;
  artistCity: string;
  artistBio?: string;
  portfolioUrl?: string;
  artistWebsite?: string;
  message?: string;
};

function buildApplicationEmailHtml(data: ArtistApplicationEmail): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; background: #000000; color: #FFFFFF; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
    .header { border-bottom: 1px solid #333; padding-bottom: 24px; margin-bottom: 32px; }
    .logo { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; color: #FFFFFF; }
    .subtitle { font-size: 10px; letter-spacing: 0.15em; color: #666; text-transform: uppercase; margin-top: 4px; }
    .badge { display: inline-block; background: #00FF66; color: #000; font-size: 11px; font-weight: 700; padding: 4px 12px; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px; }
    h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 8px; }
    h2 { font-size: 14px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin: 24px 0 12px; }
    .info-row { padding: 8px 0; border-bottom: 1px solid #222; display: flex; }
    .info-label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; min-width: 120px; }
    .info-value { color: #FFFFFF; font-size: 14px; }
    .message-box { background: #111; border: 1px solid #333; padding: 16px; margin: 16px 0; font-size: 14px; line-height: 1.6; color: #CCC; }
    .cta { display: inline-block; background: #FFFFFF; color: #000; padding: 14px 32px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; margin-top: 16px; }
    .cta-secondary { display: inline-block; border: 1px solid #555; color: #FFFFFF; padding: 12px 24px; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none; margin-top: 8px; margin-left: 8px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #222; font-size: 11px; color: #555; line-height: 1.6; }
    .green { color: #00FF66; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ROB</div>
      <div class="subtitle">ROLE OF BRIDGE — GLOBAL ART NETWORK</div>
    </div>
    
    <div class="badge">NEW APPLICATION</div>
    
    <h1>New Artist Application Received</h1>
    <p style="color: #888; font-size: 14px; margin-bottom: 32px;">
      An artist has applied to your open call <span class="green">"${data.openCallTheme}"</span> through the ROB platform.
    </p>
    
    <h2>ARTIST INFORMATION</h2>
    <table style="width:100%; border-collapse:collapse;">
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; width:120px;">Name</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px; font-weight:600;">${data.artistName}</td>
      </tr>
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Email</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px;"><a href="mailto:${data.artistEmail}" style="color:#00FF66; text-decoration:none;">${data.artistEmail}</a></td>
      </tr>
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Location</td>
        <td style="padding:10px 0; color:#FFF; font-size:14px;">${data.artistCity}${data.artistCity && data.artistCountry ? ', ' : ''}${data.artistCountry}</td>
      </tr>
      ${data.artistWebsite ? `
      <tr style="border-bottom:1px solid #222;">
        <td style="padding:10px 0; color:#666; font-size:12px; text-transform:uppercase; letter-spacing:0.1em;">Website</td>
        <td style="padding:10px 0;"><a href="${data.artistWebsite}" style="color:#00FF66; text-decoration:none;">${data.artistWebsite}</a></td>
      </tr>` : ''}
    </table>

    ${data.artistBio ? `
    <h2>ARTIST BIO</h2>
    <div class="message-box">${data.artistBio}</div>
    ` : ''}

    ${data.message ? `
    <h2>APPLICATION MESSAGE</h2>
    <div class="message-box">${data.message}</div>
    ` : ''}

    <div style="margin-top: 32px;">
      ${data.portfolioUrl ? `<a href="${data.portfolioUrl}" class="cta">VIEW PORTFOLIO →</a>` : ''}
      <a href="mailto:${data.artistEmail}" class="cta-secondary">REPLY TO ARTIST</a>
    </div>

    <div class="footer">
      <p>This application was submitted through <strong>ROB — Role of Bridge</strong>, a global art network platform connecting artists and galleries worldwide.</p>
      <p style="color:#444;">If you did not expect this email, you can safely ignore it. The artist applied to your open call that was listed on our platform.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildApplicationEmailText(data: ArtistApplicationEmail): string {
  return `
NEW APPLICATION — ROB (Role of Bridge)
═══════════════════════════════════════

An artist has applied to your open call "${data.openCallTheme}".

ARTIST INFORMATION
──────────────────
Name: ${data.artistName}
Email: ${data.artistEmail}
Location: ${data.artistCity}${data.artistCity && data.artistCountry ? ', ' : ''}${data.artistCountry}
${data.artistWebsite ? `Website: ${data.artistWebsite}` : ''}

${data.artistBio ? `BIO\n────\n${data.artistBio}\n` : ''}
${data.message ? `APPLICATION MESSAGE\n────────────────────\n${data.message}\n` : ''}
${data.portfolioUrl ? `PORTFOLIO: ${data.portfolioUrl}` : ''}

──────────────────
Sent via ROB — Role of Bridge (Global Art Network)
  `.trim();
}

export async function sendApplicationEmail(data: ArtistApplicationEmail): Promise<{ ok: boolean; error?: string }> {
  // API 키가 없으면 콘솔 로그만 남기고 성공 반환
  if (!RESEND_API_KEY) {
    console.log("═══════════════════════════════════════════════");
    console.log("📧 EMAIL WOULD BE SENT (No RESEND_API_KEY set)");
    console.log(`   TO: ${data.galleryEmail}`);
    console.log(`   GALLERY: ${data.galleryName}`);
    console.log(`   OPEN CALL: ${data.openCallTheme}`);
    console.log(`   ARTIST: ${data.artistName} (${data.artistEmail})`);
    console.log(`   PORTFOLIO: ${data.portfolioUrl || "N/A"}`);
    console.log("═══════════════════════════════════════════════");
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${PLATFORM_NAME} <${FROM_EMAIL}>`,
        to: [data.galleryEmail],
        subject: `[ROB] New Application: ${data.artistName} → "${data.openCallTheme}"`,
        html: buildApplicationEmailHtml(data),
        text: buildApplicationEmailText(data),
        reply_to: data.artistEmail,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", result);
      return { ok: false, error: result?.message || "Failed to send email" };
    }

    console.log(`📧 Email sent to ${data.galleryEmail} (ID: ${result.id})`);
    return { ok: true };
  } catch (error: any) {
    console.error("Email send failed:", error);
    return { ok: false, error: error?.message || "Email send failed" };
  }
}
