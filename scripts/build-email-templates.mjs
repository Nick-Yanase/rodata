// Gera os modelos de e-mail do Supabase (supabase/templates/*.html) a partir de um molde único,
// para todos terem a mesma cara. Rode `npm run emails` depois de mudar um texto aqui.
//
// Em produção os modelos não sobem sozinhos: copie cada arquivo em
// Supabase → Authentication → Emails (o assunto de cada um está em SUBJECT abaixo).
import { mkdirSync, writeFileSync } from 'node:fs';

const LOGO = 'https://rodata.pages.dev/email/logo-truck.png';
const URL = '{{ .ConfirmationURL }}';
// user_metadata.name, gravado no cadastro (pode não existir em contas convidadas)
const HELLO = 'Olá{{ if .Data.name }}, {{ .Data.name }}{{ end }}!';

/** @type {Record<string, {subject: string, heading: string, body: string[], button?: string, code?: boolean, note: string, link?: boolean, plainHello?: boolean}>} */
const EMAILS = {
  confirmation: {
    subject: 'Confirme seu e-mail no Rodata',
    heading: 'Confirme seu e-mail',
    body: ['Falta só um passo para começar a usar o Rodata. Toque no botão abaixo para confirmar seu e-mail.'],
    button: 'Confirmar meu e-mail',
    note: 'Se você não criou uma conta no Rodata, pode ignorar este e-mail.',
  },
  recovery: {
    subject: 'Crie uma nova senha no Rodata',
    heading: 'Crie uma nova senha',
    body: ['Recebemos um pedido para trocar a senha da sua conta no Rodata. Toque no botão abaixo para criar uma senha nova.'],
    button: 'Criar nova senha',
    note: 'Se não foi você que pediu, ignore este e-mail: sua senha continua a mesma.',
  },
  invite: {
    subject: 'Você foi convidado para o Rodata',
    heading: 'Você foi convidado para o Rodata',
    body: [
      'Criaram uma conta no Rodata para você. É nele que ficam as viagens, os gastos e o acompanhamento do MEI.',
      'Toque no botão abaixo para aceitar o convite e criar sua senha.',
    ],
    button: 'Aceitar convite',
    note: 'Se você não esperava este convite, pode ignorar este e-mail.',
  },
  magic_link: {
    subject: 'Seu link para entrar no Rodata',
    heading: 'Entre no Rodata',
    body: ['Toque no botão abaixo para entrar na sua conta, sem precisar digitar a senha. O link vale por 1 hora e só funciona uma vez.'],
    button: 'Entrar no Rodata',
    note: 'Se não foi você que pediu, ignore este e-mail: ninguém entra na sua conta sem este link.',
  },
  email_change: {
    subject: 'Confirme a troca de e-mail no Rodata',
    heading: 'Confirme a troca de e-mail',
    body: [
      'Recebemos um pedido para trocar o e-mail da sua conta no Rodata de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>.',
      'Toque no botão abaixo para confirmar.',
    ],
    button: 'Confirmar novo e-mail',
    note: 'Se não foi você que pediu, ignore este e-mail e troque sua senha: o e-mail da conta continua o mesmo.',
  },
  reauthentication: {
    subject: 'Seu código de confirmação do Rodata',
    heading: 'Confirme que é você',
    body: ['Para continuar, digite este código no Rodata:'],
    code: true,
    note: 'O código vale por alguns minutos. Se não foi você que pediu, ignore este e-mail e troque sua senha.',
    link: false,
  },
  password_changed_notification: {
    subject: 'Sua senha do Rodata foi trocada',
    heading: 'Sua senha foi trocada',
    body: ['A senha da sua conta no Rodata (<strong>{{ .Email }}</strong>) acabou de ser trocada.', 'Se foi você, está tudo certo e não precisa fazer nada.'],
    note: 'Se não foi você, entre no Rodata e toque em “Esqueceu sua senha?” para criar uma nova agora mesmo.',
    link: false,
    // avisos de segurança não garantem os dados do usuário (.Data) no modelo
    plainHello: true,
  },
};

const p = (html) => `<p style="margin:0 0 16px;font-size:18px;line-height:1.5;">${html}</p>`;

function render(e) {
  const button = e.button
    ? `
        <tr>
          <td align="center" style="padding:8px 32px 24px;">
            <a href="${URL}" style="display:inline-block;background:#C9411A;color:#FFFFFF;font-size:20px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;">${e.button}</a>
          </td>
        </tr>`
    : '';
  const code = e.code
    ? `
        <tr>
          <td align="center" style="padding:0 32px 24px;">
            <div style="display:inline-block;background:#FDE9E1;color:#1F2937;font-size:32px;font-weight:800;letter-spacing:8px;padding:16px 24px;border-radius:12px;">{{ .Token }}</div>
          </td>
        </tr>`
    : '';
  const fallback =
    e.button && e.link !== false
      ? `
            <p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#6B7280;">Se o botão não funcionar, copie e cole este endereço no navegador:<br><a href="${URL}" style="color:#C9411A;word-break:break-all;">${URL}</a></p>`
      : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e.heading}</title>
</head>
<body style="margin:0;padding:0;background:#F4F4F5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">
        <tr>
          <td align="center" style="padding:32px 32px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:32px;font-weight:800;letter-spacing:-0.5px;color:#1F2937;">Ro<span style="color:#EE5728;">data</span></td>
                <td style="padding-left:8px;"><img src="${LOGO}" width="54" height="36" alt="" style="display:block;border:0;"></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0;">
            <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#1F2937;">${e.heading.replaceAll('e-mail', 'e&#8209;mail')}</h1>
            ${p(e.plainHello ? 'Olá!' : HELLO)}
            ${e.body.map(p).join('\n            ')}
          </td>
        </tr>${button}${code}
        <tr>
          <td style="padding:0 32px 32px;">
            <p style="margin:0;font-size:15px;line-height:1.5;color:#6B7280;">${e.note}</p>${fallback}
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9CA3AF;">Rodata · controle das viagens do caminhoneiro MEI</p>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

mkdirSync('supabase/templates', { recursive: true });
for (const [name, e] of Object.entries(EMAILS)) {
  writeFileSync(`supabase/templates/${name}.html`, render(e));
  console.log(`${name.padEnd(32)} ${e.subject}`);
}
