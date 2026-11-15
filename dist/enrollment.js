import{LESSON_TYPES}from'./catalog.js';
export function enrollApplication(s,input,now=new Date(),actor=null){
 if(!/^https:\/\//.test(s.settings.privacyDocumentUrl||''))throw Error('Мастер ещё не добавил документ о персональных данных');
 const response=r=>{const l=s.lessons.find(l=>l.id===r.lesson);return{id:r.id,status:r.status,child:r.child,family:r.family,booking:r.booking,plan:r.plan||'trial',lesson:l?{id:l.id,title:l.title,date:l.date,time:l.time}:null}};
 const key=input.registrationKey;if(typeof key!=='string'||!/^[a-f0-9-]{36}$/.test(key))throw Error('Обновите форму и повторите запись');
 const old=s.applications.find(a=>a.registrationKey===key);if(old){if(!s.bookings.some(b=>b.id===old.booking&&b.status!=='cancelled'))throw Error('Эта запись уже отменена');return response(old)}
 const lesson=s.lessons.find(l=>l.id===input.lesson&&l.status!=='cancelled');
 if(!lesson||new Date(lesson.date+'T'+lesson.time+':00+05:00')<=now)throw Error('Выберите предстоящее занятие');
 if(s.bookings.filter(b=>b.lesson===lesson.id&&!['cancelled','waitlist'].includes(b.status)).length>=lesson.capacity)throw Object.assign(Error('Все места уже заняты. Выберите другое занятие'),{status:409});
 // Contact values never grant access to an existing family.
 const family=actor?.role==='parent'?actor.family:crypto.randomUUID();
 const name=String(input.childName||'').trim(),parent=String(input.parentName||'').trim(),phone=String(input.phone||'').trim(),email=String(input.email||'').trim(),age=Number(input.age);
 if(name.length<2||name.length>100||parent.length<2||parent.length>100||!Number.isInteger(age)||age<3||age>18||!/^[+\d()\s-]+$/.test(phone)||phone.replace(/\D/g,'').length<10||phone.length>30||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||input.consent!==true)throw Error('Проверьте имя, возраст, контакты и согласие на обработку данных');
 if(input.lessonType&&input.lessonType!==(lesson.lessonType||'group'))throw Error('Выберите занятие нужного формата');
 if(!LESSON_TYPES.includes(input.lessonType||lesson.lessonType||'group'))throw Error('Выберите формат занятия');
 if(input.plan&&!['trial','single','subscription'].includes(input.plan))throw Error('Выберите вариант оплаты');
 const child={id:crypto.randomUUID(),family,name,age,parent,phone,email,color:'peach',balance:0};
 if(!s.parents.some(p=>p.family===family&&!p.archived))s.parents.push({id:crypto.randomUUID(),family,name:parent,phone,email,archived:false});
 s.children.push(child);const booking={id:crypto.randomUUID(),child:child.id,lesson:lesson.id,status:'booked',paymentPlan:input.plan||'trial'};s.bookings.push(booking);
 const r={id:crypto.randomUUID(),registrationKey:key,childName:name,parentName:parent,phone,email,age,lesson:lesson.id,lessonType:lesson.lessonType||'group',contactMethod:['phone','telegram','whatsapp','email'].includes(input.contactMethod)?input.contactMethod:'phone',messenger:String(input.messenger||'').slice(0,100),contactTime:String(input.contactTime||'').slice(0,200),notes:String(input.notes||'').slice(0,500),consent:true,consentDocument:s.settings.privacyDocumentUrl,consentedAt:now.toISOString(),createdAt:now.toISOString(),confirmedAt:now.toISOString(),status:'confirmed',plan:input.plan||'trial',child:child.id,family,booking:booking.id};s.applications.push(r);s.revision++;return response(r);
}
export function publicEnrollment(s,now=new Date()){return{privacyDocumentUrl:s.settings.privacyDocumentUrl||'',lessons:s.lessons.filter(l=>l.status!=='cancelled'&&new Date(l.date+'T'+l.time+':00+05:00')>now).map(l=>({id:l.id,title:l.title,date:l.date,time:l.time,duration:l.duration,lessonType:l.lessonType||'group',format:l.format,age:l.age,capacity:l.capacity,available:Math.max(0,l.capacity-s.bookings.filter(b=>b.lesson===l.id&&!['cancelled','waitlist'].includes(b.status)).length)}))}}
