<?php
declare(strict_types=1);

namespace MediaPrint\Backend\Mailer;

final class EmailTemplate
{
    private const DEFAULT_FOOTER = 'Messaggio generato dal portale MediaPrint ERP. Non rispondere direttamente a questa email.';

    private function __construct()
    {
    }

    /**
     * @param array<string, string|null> $summaryRows
     */
    public static function render(
        string $title,
        string $bodyHtml,
        array $summaryRows = [],
        ?string $recipientName = null,
        ?string $ctaLabel = null,
        ?string $ctaUrl = null,
        ?string $date = null,
        ?string $companyName = null,
        ?string $companyAddress = null,
        ?string $supportEmail = null,
        ?string $companyWebsite = null,
        ?string $signatureName = null,
        ?string $signatureRole = null
    ): string {
        $safeTitle = htmlspecialchars(trim($title) !== '' ? trim($title) : 'MediaPrint S.r.l.', ENT_QUOTES, 'UTF-8');
        $recipient = htmlspecialchars(trim((string) ($recipientName ?? 'Cliente')) !== '' ? trim((string) ($recipientName ?? 'Cliente')) : 'Cliente', ENT_QUOTES, 'UTF-8');
        $footer = trim((string) (self::DEFAULT_FOOTER));
        $safeFooter = htmlspecialchars($footer !== '' ? $footer : self::DEFAULT_FOOTER, ENT_QUOTES, 'UTF-8');
        $romeZone = new \DateTimeZone('Europe/Rome');
        $currentDate = new \DateTimeImmutable('now', $romeZone);
        $dateText = trim((string) ($date ?? $currentDate->format('d/m/Y H:i')));
        $safeDate = htmlspecialchars($dateText !== '' ? $dateText : $currentDate->format('d/m/Y H:i'), ENT_QUOTES, 'UTF-8');
        $resolvedCompanyName = htmlspecialchars(trim($companyName ?? getenv('COMPANY_NAME') ?: 'MediaPrint S.r.l.'), ENT_QUOTES, 'UTF-8');
        $resolvedCompanyAddress = htmlspecialchars(trim($companyAddress ?? getenv('COMPANY_ADDRESS') ?: 'Zona Industriale Via Certosa, Snc, 64015 Nereto'), ENT_QUOTES, 'UTF-8');
        $resolvedSupportEmail = htmlspecialchars(trim($supportEmail ?? getenv('SUPPORT_EMAIL') ?: 'clienti@mediaprint.it'), ENT_QUOTES, 'UTF-8');
        $resolvedCompanyWebsite = htmlspecialchars(trim($companyWebsite ?? getenv('COMPANY_WEBSITE') ?: 'https://www.mediaprint.it'), ENT_QUOTES, 'UTF-8');
        $resolvedSignatureName = htmlspecialchars(trim($signatureName ?? 'Assistenza Clienti MediaPrint'), ENT_QUOTES, 'UTF-8');
        $resolvedSignatureRole = htmlspecialchars(trim($signatureRole ?? 'MediaPrint S.r.l.'), ENT_QUOTES, 'UTF-8');

        $messageBody = trim($bodyHtml) === ''
            ? '<p>Gentile cliente, ti inviamo una comunicazione ufficiale da MediaPrint ERP.</p>'
            : $bodyHtml;

        $infoRowsHtml = '';
        if ($summaryRows !== []) {
            foreach ($summaryRows as $label => $value) {
                $labelText = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
                $valueText = htmlspecialchars((string) ($value ?? '-'), ENT_QUOTES, 'UTF-8');
                $infoRowsHtml .= <<<HTML
                <tr>
                  <td style="padding:10px; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#374151; line-height:1.6;">
                    <strong>{$labelText}:</strong> {$valueText}
                  </td>
                </tr>
                HTML;
            }
        } else {
            $infoRowsHtml = <<<HTML
            <tr>
              <td style="padding:10px; font-family:Arial, Helvetica, sans-serif; font-size:13px; color:#374151; line-height:1.6;">
                <strong>Informazioni:</strong> Nessun dettaglio aggiuntivo fornito.
              </td>
            </tr>
            HTML;
        }

        $styles = <<<CSS
body {
  margin: 0;
  background-color: #f4f6f9;
}
* {
  box-sizing: border-box;
}
CSS;

        return <<<HTML
<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>{$safeTitle}</title>
  <style>{$styles}</style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border-radius:14px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;">
          <tr>
            <td style="padding:20px 24px; border-bottom:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="cid:mediaprint-logo" width="180" alt="MediaPrint" style="display:block; border:0; outline:none; text-decoration:none;">
                  </td>
                  <td align="right" style="font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280;">
                    {$safeDate}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 24px 10px 24px; font-family:Arial, Helvetica, sans-serif;">
              <h1 style="margin:0; font-size:22px; color:#1f2937;">{$safeTitle}</h1>
              <p style="margin-top:8px; font-size:14px; color:#374151;">
                Gentile <strong>{$recipient}</strong>,
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 16px 24px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.7; color:#374151;">
              {$messageBody}
            </td>
          </tr>
          {$ctaHtml}
          <tr>
            <td style="padding:0 24px 20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px;">
                {$infoRowsHtml}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px; border-top:1px solid #e5e7eb; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280; line-height:1.6;">
              <strong>{$resolvedCompanyName}</strong><br>
              {$resolvedCompanyAddress}<br>
              <a href="mailto:{$resolvedSupportEmail}" style="color:#f28c00; text-decoration:none;">{$resolvedSupportEmail}</a> |
              <a href="{$resolvedCompanyWebsite}" target="_blank" style="color:#f28c00; text-decoration:none;">{$resolvedCompanyWebsite}</a>
              <br><br>
              {$resolvedSignatureName} – {$resolvedSignatureRole}
            </td>
          </tr>
        </table>
        <div style="margin-top:12px; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#9ca3af;">
          © {$safeDate} {$resolvedCompanyName} – Tutti i diritti riservati
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    public static function getLogoPath(): string
    {
        return __DIR__ . '/assets/logo.png';
    }
}
