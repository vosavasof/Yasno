// The official SDK URL redirects to the payment provider's static CDN.
export const CHECKOUT_SCRIPTS = Object.freeze([
 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js',
 'https://static.yoomoney.ru/checkout-client/checkout-widget.js',
]);
export function securityPolicy({apiOrigin='',preventEmbedding=false}={}){
 return [
  "default-src 'self'",
  `connect-src 'self' ${apiOrigin} https://yoomoney.ru https://yookassa.ru https://kassa.yandex.ru`,
  `script-src 'self' ${CHECKOUT_SCRIPTS.join(' ')} https://yoomoney.ru/checkout-ui/v2.js https://kassa.yandex.ru/checkout-ui/v2.js`,
  "style-src 'self' 'unsafe-inline'", "font-src 'self'",
  "frame-src 'self' https://yoomoney.ru https://*.yoomoney.ru https://yookassa.ru https://kassa.yandex.ru",
  "img-src 'self' data: blob:", "object-src 'none'",
  ...(preventEmbedding?["frame-ancestors 'none'"]:[]),
  "base-uri 'self'", "form-action 'self'",
 ].join('; ');
}
