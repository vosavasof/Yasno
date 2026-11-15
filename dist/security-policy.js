// JavaScript, styles and fonts are served by the workshop site.
export function securityPolicy({apiOrigin='',preventEmbedding=false,localOnly=false}={}){
 return [
  "default-src 'self'",
  localOnly?"connect-src 'self'":`connect-src 'self' ${apiOrigin} https://yoomoney.ru https://yookassa.ru https://kassa.yandex.ru`,
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", "font-src 'self'",
  localOnly?"frame-src 'none'":"frame-src 'self' https://yoomoney.ru https://*.yoomoney.ru https://yookassa.ru https://kassa.yandex.ru",
  "img-src 'self' data: blob:", "object-src 'none'",
  ...(preventEmbedding?["frame-ancestors 'none'"]:[]),
  "base-uri 'self'", "form-action 'self'",
 ].join('; ');
}
