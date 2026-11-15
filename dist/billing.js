// All monetary arithmetic uses integer kopecks. The workshop sets the lesson price.
export function moneyMinor(value){
 const text=String(value??'').trim().replace(',','.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Error('Укажите сумму с точностью до копеек');
 const[whole,fraction='']=text.split('.'),minor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(minor)||minor<100||minor>100000000)throw Error('Сумма должна быть от 1 до 1 000 000 ₽');
 return minor;
}
export function lessonPriceMinor(settings){
 if(settings.lessonPrice!==undefined)return moneyMinor(settings.lessonPrice);
 return moneyMinor((Math.round(Number(settings.price)*100/Number(settings.credits))/100).toFixed(2));
}
export function paymentQuote(settings,amount,advanceMinor=0){
 const amountMinor=moneyMinor(amount),unitPriceMinor=lessonPriceMinor(settings);
 if(!Number.isSafeInteger(advanceMinor)||advanceMinor<0||advanceMinor>100000000)throw Error('Проверьте денежный аванс ребёнка');
 const total=amountMinor+advanceMinor,credits=Math.floor(total/unitPriceMinor),advanceAfterMinor=total%unitPriceMinor;
 if(credits>100000)throw Error('Слишком большое количество занятий');
 return{amountMinor,unitPriceMinor,credits,advanceBeforeMinor:advanceMinor,advanceAfterMinor};
}
export function lessonPurchase(settings,quantity,advanceMinor=0){
 const lessons=Number(quantity);
 if(!Number.isSafeInteger(lessons)||lessons<1||lessons>100000)throw Error('Укажите целое количество занятий от 1 до 100 000');
 if(!Number.isSafeInteger(advanceMinor)||advanceMinor<0||advanceMinor>100000000)throw Error('Проверьте денежный аванс ребёнка');
 const required=lessonPriceMinor(settings)*lessons-advanceMinor;
 if(required<=0)throw Error('Это количество занятий уже покрывается авансом. Выберите больше занятий или оплату на сумму.');
 return paymentQuote(settings,(required/100).toFixed(2),advanceMinor);
}
