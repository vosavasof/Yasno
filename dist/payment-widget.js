// Official YooKassa iframe widget. A browser event never grants credits: the
// caller verifies the order on the server before displaying a successful result.
import{CHECKOUT_SCRIPTS}from'./security-policy.js';
let loading;
function loadScript(src){
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.async=true;script.referrerPolicy='no-referrer';
  const fail=()=>{clearTimeout(timeout);script.onload=script.onerror=null;script.remove();reject(Error('Не удалось загрузить форму ЮKassa. Проверьте соединение.'))};
  const timeout=setTimeout(fail,10000);
  script.onload=()=>{clearTimeout(timeout);script.onload=script.onerror=null;if(window.YooMoneyCheckoutWidget)resolve(window.YooMoneyCheckoutWidget);else{script.remove();reject(Error('Не удалось открыть форму ЮKassa'))}};
  script.onerror=fail;document.head.append(script);
 });
}
export function loadCheckoutWidget(){
 if(window.YooMoneyCheckoutWidget)return Promise.resolve(window.YooMoneyCheckoutWidget);
 if(loading)return loading;
 loading=(async()=>{
  for(const [index,src]of CHECKOUT_SCRIPTS.entries()){
   try{return await loadScript(src)}catch(error){if(index===CHECKOUT_SCRIPTS.length-1)throw error}
  }
 })().catch(error=>{loading=null;throw error});
 return loading;
}
export async function mountCheckout({token,container,onComplete,onError}){
 const Widget=await loadCheckoutWidget();if(!document.getElementById(container))return null;
 const checkout=new Widget({confirmation_token:token,error_callback:()=>onError('Не удалось открыть форму или срок её действия истёк. Проверьте статус оплаты перед повторной попыткой.')});
 checkout.on('success',()=>onComplete());checkout.on('fail',()=>onComplete());
 try{await checkout.render(container)}catch(e){try{checkout.destroy()}catch{};throw Error('Форма ЮKassa не открылась. Проверьте статус платежа и повторите попытку.')}
 return checkout;
}
