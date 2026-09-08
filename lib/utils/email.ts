// Service d'envoi d'emails via Resend
// Documentation: https://resend.com/docs/api-reference/emails/send-email

import { Resend } from 'resend';

// Initialiser Resend avec la clé API
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoyer un email via Resend
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ [Email] RESEND_API_KEY non configuré. Email non envoyé.');
    console.log(`📧 [Email] Destinataire: ${to}`);
    console.log(`   Sujet: ${subject}`);
    console.log(`   Contenu: ${text || html}`);
    return { success: false, error: 'RESEND_API_KEY non configuré' };
  }

  try {
    // Resend v3 - utiliser la méthode sendEmail directement
    // @ts-ignore - Problème de typage avec Resend, on force l'exécution
    const { data, error } = await resend.sendEmail({
      from: 'Garde-Manger <noreply@garde-manger.app>',
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('❌ [Email] Erreur Resend:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ [Email] Envoyé à ${to}: ${subject}`);
    console.log(`   ID de l'email: ${(data as any)?.id}`);
    return { success: true };
  } catch (error) {
    console.error('❌ [Email] Erreur:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Envoyer un email de vérification Better-Auth
 */
export async function sendVerificationEmail({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  const verificationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Vérifiez votre email - Garde-Manger</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #8B4513; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Bienvenue sur Garde-Manger, ${user.name || 'Utilisateur'} !</h2>
        <p>Merci de vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
        <p><a href="${url}" class="button">Vérifier mon email</a></p>
        <p>Ou copiez ce lien dans votre navigateur : <code>${url}</code></p>
        <p>Ce lien expire dans 24 heures.</p>
        <div class="footer">
          <p>Si vous n'avez pas demandé cela, vous pouvez ignorer cet email.</p>
          <p>© Garde-Manger - Gestion de stock</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Vérifiez votre email - Garde-Manger',
    html: verificationHtml,
    text: `Bienvenue sur Garde-Manger!
Vérifiez votre email en visitant: ${url}
Ce lien expire dans 24 heures.`,
  });
}

/**
 * Envoyer un email de réinitialisation de mot de passe Better-Auth
 */
export async function sendResetPasswordEmail({
  user,
  url,
}: {
  user: { email: string; name?: string };
  url: string;
}) {
  const resetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Réinitialisez votre mot de passe - Garde-Manger</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #8B4513; color: white; text-decoration: none; border-radius: 4px; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Réinitialisez votre mot de passe, ${user.name || 'Utilisateur'} !</h2>
        <p>Nous avons reçu une demande pour réinitialiser votre mot de passe.</p>
        <p><a href="${url}" class="button">Réinitialiser mon mot de passe</a></p>
        <p>Ou copiez ce lien dans votre navigateur : <code>${url}</code></p>
        <p>Ce lien expire dans 1 heure.</p>
        <div class="footer">
          <p>Si vous n'avez pas demandé cela, vous pouvez ignorer cet email.</p>
          <p>© Garde-Manger - Gestion de stock</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Réinitialisez votre mot de passe - Garde-Manger',
    html: resetHtml,
    text: `Réinitialisez votre mot de passe en visitant: ${url}
Ce lien expire dans 1 heure.`,
  });
}