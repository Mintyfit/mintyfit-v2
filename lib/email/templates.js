// Shared HTML email templates for MintyFit. Plain inline-styled HTML so it
// renders consistently across clients without a templating library.

const BRAND_GREEN = '#2d6e2e'
const TEXT_DARK = '#1f2937'
const TEXT_MUTED = '#6b7280'
const BG_LIGHT = '#f9fafb'

function shell({ heading, intro, ctaUrl, ctaLabel, secondary, footer }) {
  const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mintyfit.com'
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BG_LIGHT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${TEXT_DARK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG_LIGHT};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
          <a href="${APP}" style="text-decoration:none;color:${BRAND_GREEN};font-weight:700;font-size:20px;">MintyFit</a>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${TEXT_DARK};">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:${TEXT_DARK};">${intro}</p>
          ${ctaUrl ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:${BRAND_GREEN};">
            <a href="${ctaUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">${ctaLabel}</a>
          </td></tr></table>` : ''}
          ${secondary ? `<p style="margin:24px 0 0;font-size:14px;line-height:1.55;color:${TEXT_MUTED};">${secondary}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;font-size:12px;color:${TEXT_MUTED};">
          ${footer || `MintyFit — family nutrition done right. <a href="${APP}" style="color:${TEXT_MUTED};">${APP.replace(/^https?:\/\//, '')}</a>`}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function familyInviteEmail({ familyName, inviterName, acceptUrl, signupUrl }) {
  return shell({
    heading: `${inviterName || 'Someone'} invited you to join their family on MintyFit`,
    intro: `You've been invited to join <strong>${familyName || 'their family'}</strong> on MintyFit — a family nutrition and meal planning platform. Joining lets you share meal plans, recipes, and shopping lists with personalized nutrition for each family member.`,
    ctaUrl: acceptUrl,
    ctaLabel: 'Accept invitation',
    secondary: `Don't have a MintyFit account yet? <a href="${signupUrl}" style="color:${BRAND_GREEN};">Create one here</a> and you'll join the family automatically. This invite expires in 14 days.`,
  })
}

export function nutritionistInviteEmail({ nutritionistName, acceptUrl, signupUrl, message }) {
  const personalNote = message
    ? `<div style="margin:20px 0;padding:16px;background:#f0fdf4;border-left:3px solid ${BRAND_GREEN};border-radius:6px;font-style:italic;color:${TEXT_DARK};">"${message.replace(/"/g, '&quot;')}"</div>`
    : ''
  return shell({
    heading: `${nutritionistName || 'A nutritionist'} would like to connect with you on MintyFit`,
    intro: `<strong>${nutritionistName || 'A nutritionist'}</strong> has invited you to connect on MintyFit. Once connected, they can review your meal plans and leave personal nutrition guidance.${personalNote}`,
    ctaUrl: acceptUrl,
    ctaLabel: 'Accept invitation',
    secondary: `Don't have a MintyFit account yet? <a href="${signupUrl}" style="color:${BRAND_GREEN};">Create one here</a> and you'll be connected automatically. This invite expires in 14 days.`,
  })
}

export function nutritionistApprovedEmail({ name }) {
  const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://www.mintyfit.com'
  return shell({
    heading: `You're approved as a MintyFit nutritionist`,
    intro: `Hi ${name || 'there'},<br/><br/>Your MintyFit nutritionist application has been approved. You can now invite clients, review their meal plans, and leave nutrition notes.`,
    ctaUrl: `${APP}/nutritionist`,
    ctaLabel: 'Open your dashboard',
  })
}

export function nutritionistApplicationReceivedEmail({ name }) {
  return shell({
    heading: `We received your nutritionist application`,
    intro: `Hi ${name || 'there'},<br/><br/>Thanks for applying to be a MintyFit nutritionist. Our team will review your application and get back to you within a few business days.`,
    secondary: `You'll receive an email once your application is approved.`,
  })
}
