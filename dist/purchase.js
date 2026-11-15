import{moneyMinor}from'./billing.js';
export function planSettings(s){return{trialPrice:s.trialPrice??1000,singlePrice:s.singlePrice??1600,subscriptionPrice:s.subscriptionPrice??5500,subscriptionCredits:s.subscriptionCredits??4}}
export function familyPurchase(s,input,actor){
 const ids=input.children,plan=input.plan||'single',settings=planSettings(s.settings);
 if(!Array.isArray(ids)||!ids.length||ids.length>20||new Set(ids).size!==ids.length)throw Error('Выберите от 1 до 20 разных детей');
 if(!['trial','single','subscription'].includes(plan))throw Error('Выберите пробное, разовое занятие или абонемент');
 const children=ids.map(id=>s.children.find(c=>c.id===id&&!c.archived));
 if(children.some(c=>!c)||new Set(children.map(c=>c.family)).size!==1||actor.role!=='master'&&children.some(c=>c.family!==actor.family))throw Error('Доступны только дети одной вашей семьи');
 if(plan==='trial'&&children.some(c=>s.payments.some(p=>p.child===c.id&&p.plan==='trial')))throw Error('Пробное занятие уже оплачено. Выберите разовое занятие или абонемент');
 const credits=plan==='subscription'?Number(settings.subscriptionCredits):1;
 if(!Number.isInteger(credits)||credits<1||credits>100)throw Error('Проверьте количество занятий в абонементе');
 const gross=moneyMinor(plan==='trial'?settings.trialPrice:plan==='single'?settings.singlePrice:settings.subscriptionPrice),discountPercent=ids.length>=2?10:0;
 const items=children.map(c=>{const discountMinor=discountPercent?Math.round(gross/10):0,priceMinor=gross-discountMinor,advanceBeforeMinor=c.advanceMinor||0,advanceUsedMinor=Math.min(advanceBeforeMinor,priceMinor);return{child:c.id,plan,credits,grossMinor:gross,discountMinor,priceMinor,advanceBeforeMinor,advanceUsedMinor,advanceAfterMinor:advanceBeforeMinor-advanceUsedMinor,amountMinor:priceMinor-advanceUsedMinor}});
 return{family:children[0].family,plan,items,discountPercent,amountMinor:items.reduce((n,x)=>n+x.amountMinor,0),totalPriceMinor:items.reduce((n,x)=>n+x.priceMinor,0),credits:items.reduce((n,x)=>n+x.credits,0)};
}
export function applyPurchase(s,order,paymentDate,makeId){
 const all=order.items.every(i=>s.payments.some(p=>p.id===makeId(i.child)));if(all)return;
 if(order.items.some(i=>s.payments.some(p=>p.id===makeId(i.child))))throw Error('Часть оплаты уже учтена. Нужна проверка мастера');
 for(const item of order.items){const c=s.children.find(c=>c.id===item.child&&c.family===order.family);if(!c||(c.advanceMinor||0)<item.advanceUsedMinor)throw Error('Денежный аванс изменился. Нужна проверка мастера');}
 for(const item of order.items){const c=s.children.find(c=>c.id===item.child);c.balance+=item.credits;c.advanceMinor=(c.advanceMinor||0)-item.advanceUsedMinor;s.payments.unshift({id:makeId(item.child),child:item.child,amount:item.amountMinor/100,credits:item.credits,plan:item.plan,date:paymentDate,method:order.method||'ЮKassa',receipt:null,discountPercent:order.discountPercent,discountMinor:item.discountMinor,advanceBeforeMinor:item.advanceBeforeMinor,advanceAfterMinor:c.advanceMinor,advanceUsedMinor:item.advanceUsedMinor,provider:order.test?'test':order.provider||'yookassa',...(order.providerId?{providerPaymentId:order.providerId}:{})});}
}
