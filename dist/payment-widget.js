// Official YooKassa iframe widget. A browser event never grants credits: the
// caller verifies the order on the server before displaying a successful result.
let loading;
export function loadCheckoutWidget(){
 if(window.YooMoneyCheckoutWidget)return Promise.resolve(window.YooMoneyCheckoutWidget);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://yookassa.ru/checkout-widget/v1/checkout-widget.js';script.async=true;script.referrerPolicy='no-referrer';const timeout=setTimeout(()=>{script.remove();loading=null;reject(Error('Форма ЮKassa загружается слишком долго. Проверьте соединение и откройте оплату снова.'))},20000);script.onload=()=>{clearTimeout(timeout);if(window.YooMoneyCheckoutWidget)resolve(window.YooMoneyCheckoutWidget);else{loading=null;reject(Error('Не удалось открыть форму ЮKassa'))}};script.onerror=()=>{clearTimeout(timeout);script.remove();loading=null;reject(Error('Не удалось загрузить форму ЮKassa. Проверьте соединение.'))};document.head.append(script)});
 return loading;
}
export async function mountCheckout({token,container,onComplete,onError}){
 const Widget=await loadCheckoutWidget();if(!document.getElementById(container))return null;
 const checkout=new Widget({confirmation_token:token,error_callback:()=>onError('Не удалось открыть форму или срок её действия истёк. Проверьте статус оплаты перед повторной попыткой.')});
 checkout.on('success',()=>onComplete());checkout.on('fail',()=>onComplete());
 try{await checkout.render(container)}catch(e){try{checkout.destroy()}catch{};throw Error('Форма ЮKassa не открылась. Проверьте статус платежа и повторите попытку.')}
 return checkout;
}
