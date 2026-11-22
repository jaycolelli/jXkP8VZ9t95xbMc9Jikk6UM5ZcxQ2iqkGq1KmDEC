/* ABC Sand & Rock · bilingual help assistant (demo). Runs entirely in the browser: intent + fuzzy matching over
   facts published on abcsandrock.com. In production this would run on a real AI model with the same guardrails. */
(function(){
'use strict';
if(!window.VIZ) return;
var V=window.VIZ, P=V.products, PBY=V.byId;
var TEL='+16022721792', PHONE='(602) 272-1792';
var $=function(s,r){return (r||document).querySelector(s);};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var norm=function(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[″”"]/g,'"').replace(/[^a-z0-9"\/\.\s-]/g,' ').replace(/\s+/g,' ').trim();};
var DENS={ds:1.4,rr:1.4,rr6:1.1,dg:1.4};
var DENSL={en:{ds:'Decorative Stone 1/4"–1"',rr:'River Rock 1/4"–6"',rr6:'River Rock 6"+',dg:'Decomposed Granite'},es:{ds:'Piedra decorativa 1/4"–1"',rr:'Piedra de río 1/4"–6"',rr6:'Piedra de río 6"+',dg:'Granito descompuesto (DG)'}};
var CAT={en:{stone:'Decorative Stone',dg:'Decomposed Granite (DG)',river:'River Rock'},es:{stone:'Piedra decorativa',dg:'Granito descompuesto (DG)',river:'Piedra de río'}};
var r2=function(v){return Math.round(v*100)/100;};
var f2=function(v,l){return (Math.round(v*100)/100).toLocaleString(l==='es'?'es-MX':'en-US',{maximumFractionDigits:2});};

/* ---------------------------------------------------------------- facts (all from abcsandrock.com, crawled 2026-11-22) */
var T={
 en:{
  title:'ABC Help', sub:'Demo assistant by JayCo',
  note:'Demo: runs in your browser from ABC\u2019s published info. In production this would run on a real AI model. It never quotes prices.',
  hello:'Hi! I\u2019m ABC Sand & Rock\u2019s help assistant. Ask me about hours, delivery, products, or how much rock you need. Tambi\u00e9n hablo espa\u00f1ol.',
  ph:'Ask about rock, delivery, hours\u2026',
  chips:['How much do I need?','Delivery','Hours','DG vs river rock','Gold rocks','Get a quote','Show Black Cherry in my yard','Where are you?','Payment'],
  hours:'<b>Hours</b>\nMon\u2013Fri: 5 AM to 4:30 PM\nSaturday: 6 AM to 12 PM\nSunday: Closed\n\nDelivery windows: weekdays 6\u20139 AM, 9 AM\u201312 PM or 12\u20134 PM; Saturdays 6\u20139 AM or 9 AM\u201312 PM.',
  where:'<b>Two yards:</b>\n\n<b>Retail / Our Store (Phoenix)</b>\n1804 N. 27th Ave, Phoenix, AZ 85009\n(602) 272-1792 \u00b7 (623) 935-1677, option 1\n\n<b>Mining (Glendale)</b>\n5401 N. 119th Ave, Glendale, AZ 85307\n(623) 935-1677, option 2',
  delivery:'<b>Delivery</b>\n\u2022 Next-day delivery across Phoenix and the greater metro area\n\u2022 1 to 24 tons per truck; the minimum order is 1 ton\n\u2022 Orders under 8 tons have limited availability each day\n\u2022 Windows: weekdays 6\u20139 AM, 9 AM\u201312 PM, 12\u20134 PM; Saturdays 6\u20139 AM, 9 AM\u201312 PM\n\u2022 Prepay at either location and you don\u2019t need to be home; otherwise someone must be there to pay and sign\n\u2022 Dumping on the street needs a signed indemnification form\n\nDelivery fees aren\u2019t published. Call '+PHONE+' for a quote.',
  pay:'ABC accepts <b>cash and all major credit cards</b>. You can prepay at either location, and then you don\u2019t need to be there for the delivery.',
  retail:'<b>Retail store, 1804 N. 27th Ave, Phoenix</b>\nThe original ABC yard. Bulk construction and decorative rock, plus bagged products like Portland cement, mortar mix and lime for pickup. There\u2019s a rock display out front to help you choose.\n\nThe counter team all speaks Spanish, gives free quantity estimates, and can quote delivery right from the store.',
  mine:'<b>Mining yard, 5401 N. 119th Ave, Glendale</b>\nProduces construction materials and natural river rock, and sells mine aggregate to the public. Check in at the scale house first, pay and get a scale ticket, then wait in your vehicle for an escort. Don\u2019t get out of your vehicle inside the mine.',
  price:'ABC doesn\u2019t publish prices online, so I can\u2019t quote one. For pricing, call <b>'+PHONE+'</b> or stop by the counter. Want me to put together a quote request you can send them?',
  about:'ABC Sand & Rock is family-owned and has served Phoenix since <b>1974</b>, now run by the third generation. It started as a retail yard and bought its first dump truck that same year to deliver. Today it has two yards: the Phoenix store and a Glendale mine.',
  dgvr:'<b>DG vs. river rock</b>\n\n<b>Decomposed granite (DG)</b> is finely crushed granite (ABC\u2019s is 1/4" or 3/8" minus). It compacts firmly and drains well, which makes it ABC\u2019s go-to for pathways, driveways, patios and dog runs.\n\n<b>River rock</b> is rounded and naturally smooth, from ABC\u2019s Glendale mine, from 1/4" up to 6"+. It\u2019s used for ground cover, dry creek beds, tree wells, and drainage or erosion control. It doesn\u2019t pack down like DG.\n\nWeight: DG and river rock up to 6" are 1.4 tons per cubic yard; 6"+ river rock is 1.1.',
  calcAskMat:'Happy to help! What material? Name a rock (like Desert Gold), or just say decorative stone, DG or river rock.',
  calcAskArea:'How big is the area? Give me square feet (e.g. 300 sq ft) or length \u00d7 width (e.g. 20 x 15).',
  calcAskDepth:'How deep? Most rock goes in at about <b>2 inches</b>. Type a number in inches, or say \u201c2\u201d.',
  calcRes:function(c){return 'For <b>'+esc(c.mat)+'</b>, '+f2(c.area)+' sq ft at '+f2(c.depth)+'" deep:<span class="calc">'+f2(c.area)+' \u00d7 '+f2(c.depth)+' \u00f7 12 = '+f2(c.cuft)+' cu ft\n'+f2(c.cuft)+' \u00f7 27 = '+f2(c.yd)+' cu yd\n'+f2(c.yd)+' \u00d7 '+c.t+' t/yd\u00b3 = '+f2(c.tons)+' tons</span>\nAbout <b>'+f2(c.tons)+' tons</b> (estimate, using ABC\u2019s published weight for '+c.dl+'). '+(c.tons<1?'Delivery minimum is 1 ton, so ask about picking it up at the Phoenix store.':c.tons>24?'That\u2019s more than one truck; single loads go up to 24 tons.':'That fits in one delivery truck.')+'\n\nWant a quote request for this?';},
  qAskMat:'Let\u2019s build your quote request. Which material?', qAskQty:'How much? Tons, or the area and depth (e.g. 400 sq ft, 2 in).',
  qAskZip:'Delivery ZIP code or city? (or say \u201cpickup\u201d)', qAskDate:'When do you need it? (e.g. next Tuesday)',
  qDone:'Here\u2019s your quote request in English and Spanish. Copy it and text or email it to ABC, or read it to them on the phone. Nothing is sent from here.',
  copy:'Copy', call:'Call ABC', copied:'Copied',
  show:'Show me this rock in my yard', shown:function(n){return 'Done! <b>'+esc(n)+'</b> is now in the visualizer. Close this chat to see it.';},
  noProd:'I didn\u2019t find that rock. Try a name like Desert Gold or Black Cherry, or a color like gold, red or grey.',
  found:function(n,w){return n===1?'Here it is:':'Here are '+n+' '+w+' from ABC:';},
  thanks:'You\u2019re welcome! Anything else?',
  fallback:'Sorry, I can only answer from ABC\u2019s published info. Try one of the topics below, or call <b>'+PHONE+'</b> to talk to the yard.',
  skip:'skip', pickup:'Pickup at the Phoenix store', tbd:'to be confirmed',
  sizes:'Sizes', avail:{Retail:'store pickup',Delivery:'delivery',Mining:'mine pickup'}, availL:'Available for'
 },
 es:{
  title:'Ayuda ABC', sub:'Asistente demo por JayCo',
  note:'Demo: funciona en su navegador con la informaci\u00f3n publicada por ABC. En producci\u00f3n usar\u00eda un modelo de IA real. Nunca da precios.',
  hello:'\u00a1Hola! Soy el asistente de ABC Sand & Rock. Preg\u00fanteme por el horario, las entregas, los productos o cu\u00e1nta piedra necesita. I speak English too.',
  ph:'Pregunte por piedra, entregas, horario\u2026',
  chips:['\u00bfCu\u00e1nto necesito?','Entregas','Horario','DG o piedra de r\u00edo','Piedras doradas','Pedir cotizaci\u00f3n','Ver Black Cherry en mi patio','\u00bfD\u00f3nde est\u00e1n?','Formas de pago'],
  hours:'<b>Horario</b>\nLunes a viernes: 5 AM a 4:30 PM\nS\u00e1bado: 6 AM a 12 PM\nDomingo: cerrado\n\nHorarios de entrega: entre semana de 6 a 9 AM, de 9 AM a 12 PM o de 12 a 4 PM; los s\u00e1bados de 6 a 9 AM o de 9 AM a 12 PM.',
  where:'<b>Tenemos dos yardas:</b>\n\n<b>Tienda (Phoenix)</b>\n1804 N. 27th Ave, Phoenix, AZ 85009\n(602) 272-1792 \u00b7 (623) 935-1677, opci\u00f3n 1\n\n<b>Mina (Glendale)</b>\n5401 N. 119th Ave, Glendale, AZ 85307\n(623) 935-1677, opci\u00f3n 2',
  delivery:'<b>Entregas</b>\n\u2022 Entrega al d\u00eda siguiente en Phoenix y todo el \u00e1rea metropolitana\n\u2022 De 1 a 24 toneladas por cami\u00f3n; el pedido m\u00ednimo es de 1 tonelada\n\u2022 Para pedidos de menos de 8 toneladas hay disponibilidad limitada cada d\u00eda\n\u2022 Horarios: entre semana 6\u20139 AM, 9 AM\u201312 PM y 12\u20134 PM; s\u00e1bados 6\u20139 AM y 9 AM\u201312 PM\n\u2022 Si paga por adelantado en cualquiera de las dos yardas, no tiene que estar presente; si no, alguien tiene que estar para pagar y firmar\n\u2022 Para descargar en la calle se necesita firmar un formulario de responsabilidad (indemnizaci\u00f3n)\n\nEl costo de env\u00edo no est\u00e1 publicado. Llame al '+PHONE+' para una cotizaci\u00f3n.',
  pay:'ABC acepta <b>efectivo y todas las tarjetas de cr\u00e9dito principales</b>. Puede pagar por adelantado en cualquiera de las dos yardas y as\u00ed no tiene que estar presente cuando llegue la entrega.',
  retail:'<b>Tienda, 1804 N. 27th Ave, Phoenix</b>\nEs la yarda original de ABC. Material a granel para construcci\u00f3n y piedra decorativa, y productos en bolsa como cemento Portland, mezcla para mortero y cal para recoger. Afuera hay una exhibici\u00f3n de piedras para que escoja la suya.\n\nTodo el personal del mostrador habla espa\u00f1ol, le calcula la cantidad que necesita sin costo y le puede cotizar la entrega ah\u00ed mismo.',
  mine:'<b>Mina, 5401 N. 119th Ave, Glendale</b>\nAh\u00ed se producen materiales de construcci\u00f3n y piedra de r\u00edo natural, y se vende agregado al p\u00fablico. Primero pase a la caseta de la b\u00e1scula, pague y recoja su boleto, y espere en su veh\u00edculo a que lo acompa\u00f1en. No se baje del veh\u00edculo dentro de la mina.',
  price:'ABC no publica precios en l\u00ednea, as\u00ed que no le puedo dar uno. Para precios, llame al <b>'+PHONE+'</b> o pase al mostrador. \u00bfQuiere que le prepare una solicitud de cotizaci\u00f3n para mandarles?',
  about:'ABC Sand & Rock es una empresa familiar que da servicio en Phoenix desde <b>1974</b>, y hoy la dirige la tercera generaci\u00f3n. Empez\u00f3 como una yarda de venta al p\u00fablico y ese mismo a\u00f1o compr\u00f3 su primer cami\u00f3n de volteo para hacer entregas. Hoy tiene dos yardas: la tienda en Phoenix y una mina en Glendale.',
  dgvr:'<b>DG o piedra de r\u00edo</b>\n\n<b>El granito descompuesto (DG)</b> es granito triturado fino (el de ABC es de 1/4" o 3/8" minus). Se compacta firme y drena bien, por eso es lo que m\u00e1s se usa en ABC para andadores, entradas de carro, patios y \u00e1reas para perros.\n\n<b>La piedra de r\u00edo</b> es redonda y lisa al natural, sale de la mina de ABC en Glendale y viene desde 1/4" hasta 6" o m\u00e1s. Se usa para cubrir jardines, arroyos secos, alrededor de \u00e1rboles y para drenaje o control de erosi\u00f3n. No se compacta como el DG.\n\nPeso: el DG y la piedra de r\u00edo de hasta 6" pesan 1.4 toneladas por yarda c\u00fabica; la de 6" o m\u00e1s, 1.1.',
  calcAskMat:'\u00a1Claro que s\u00ed! \u00bfQu\u00e9 material? D\u00edgame el nombre de la piedra (como Desert Gold) o nada m\u00e1s piedra decorativa, DG o piedra de r\u00edo.',
  calcAskArea:'\u00bfQu\u00e9 tan grande es el \u00e1rea? D\u00edgame los pies cuadrados (ej. 300 pies cuadrados) o largo \u00d7 ancho (ej. 20 x 15).',
  calcAskDepth:'\u00bfA qu\u00e9 profundidad? Casi siempre se pone a unas <b>2 pulgadas</b>. Escriba el n\u00famero en pulgadas, o nada m\u00e1s \u201c2\u201d.',
  calcRes:function(c){return 'Para <b>'+esc(c.mat)+'</b>, '+f2(c.area,'es')+' pies cuadrados a '+f2(c.depth,'es')+' pulgadas de profundidad:<span class="calc">'+f2(c.area,'es')+' \u00d7 '+f2(c.depth,'es')+' \u00f7 12 = '+f2(c.cuft,'es')+' pies c\u00fabicos\n'+f2(c.cuft,'es')+' \u00f7 27 = '+f2(c.yd,'es')+' yardas c\u00fabicas\n'+f2(c.yd,'es')+' \u00d7 '+c.t+' ton/yd\u00b3 = '+f2(c.tons,'es')+' toneladas</span>\nSon como <b>'+f2(c.tons,'es')+' toneladas</b> (es un estimado con el peso que publica ABC para '+c.dl+'). '+(c.tons<1?'El m\u00ednimo de entrega es 1 tonelada; pregunte por recogerlo en la tienda de Phoenix.':c.tons>24?'Es m\u00e1s de un cami\u00f3n; cada carga es de hasta 24 toneladas.':'Cabe en un solo cami\u00f3n de entrega.')+'\n\n\u00bfLe preparo una solicitud de cotizaci\u00f3n con esto?';},
  qAskMat:'Vamos a armar su solicitud de cotizaci\u00f3n. \u00bfQu\u00e9 material?', qAskQty:'\u00bfCu\u00e1nto? En toneladas, o el \u00e1rea y la profundidad (ej. 400 pies cuadrados, 2 pulgadas).',
  qAskZip:'\u00bfC\u00f3digo postal o ciudad de entrega? (o diga \u201crecoger\u201d)', qAskDate:'\u00bfPara cu\u00e1ndo lo necesita? (ej. el pr\u00f3ximo martes)',
  qDone:'Aqu\u00ed est\u00e1 su solicitud de cotizaci\u00f3n en espa\u00f1ol y en ingl\u00e9s. C\u00f3piela y m\u00e1ndela por mensaje o correo a ABC, o l\u00e9asela por tel\u00e9fono. Desde aqu\u00ed no se env\u00eda nada.',
  copy:'Copiar', call:'Llamar a ABC', copied:'Copiado',
  show:'Ver esta piedra en mi patio', shown:function(n){return '\u00a1Listo! Ya puse <b>'+esc(n)+'</b> en el visualizador. Cierre el chat para verla.';},
  noProd:'No encontr\u00e9 esa piedra. Pruebe con un nombre como Desert Gold o Black Cherry, o un color como dorado, rojo o gris.',
  found:function(n,w){return n===1?'Aqu\u00ed est\u00e1:':'Aqu\u00ed tiene '+n+' '+w+' de ABC:';},
  thanks:'\u00a1Con mucho gusto! \u00bfAlgo m\u00e1s en que le pueda ayudar?',
  fallback:'Disculpe, solo puedo contestar con la informaci\u00f3n que publica ABC. Pruebe uno de los temas de abajo, o llame al <b>'+PHONE+'</b> para hablar con la yarda.',
  skip:'omitir', pickup:'Recoger en la tienda de Phoenix', tbd:'por confirmar',
  sizes:'Tama\u00f1os', avail:{Retail:'recoger en tienda',Delivery:'entrega',Mining:'recoger en la mina'}, availL:'Disponible para'
 }
};

/* ---------------------------------------------------------------- language detection */
var ES_W='que como cuanto cuanta cuantas cuantos donde horario horarios hola gracias necesito piedra piedras entrega entregas envio envian precio precios cuando tienen tiene puedo para el la los las una por mi mis de del con abren abierto cierran pago pagar tarjeta tarjetas efectivo granito rio patio yarda quiero cotizacion cotizar buenas buenos dias tardes noches es son esta estan hay venden aceptan ver mostrar muestrame camion toneladas pulgadas pies cuadrados dorado dorada rojo roja gris cafe negro blanco verde rosa tienda mina tambien si usted ustedes mas cual sabado domingo lunes hoy manana entregan llevan grava arena'.split(' ');
var EN_W='the what how much many where when do does you your hours open close delivery deliver need price prices cost my is are can i quote yard hello hi hey thanks thank show me in of and to for get pay card cash store mine sand gravel tons inches feet square depth deep area today tomorrow saturday sunday which have sell accept truck'.split(' ');
function detect(text,cur){ var n=norm(text), toks=n.split(' '), es=0, en=0; toks.forEach(function(t){ if(ES_W.indexOf(t)>=0) es++; if(EN_W.indexOf(t)>=0) en++; });
  if(/[¿¡ñáéíóú]/i.test(text)) es+=1.5; if(es===en) return cur; return es>en?'es':'en'; }

/* ---------------------------------------------------------------- fuzzy matching */
function lev(a,b){ if(a===b) return 0; var m=a.length,n=b.length; if(Math.abs(m-n)>2) return 9; var d=[],i,j; for(i=0;i<=m;i++){d[i]=[i];} for(j=0;j<=n;j++) d[0][j]=j;
  for(i=1;i<=m;i++) for(j=1;j<=n;j++) d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)); return d[m][n]; }
function has(n,toks,kw){ if(kw.indexOf(' ')>=0) return n.indexOf(kw)>=0; if(toks.indexOf(kw)>=0) return true; if(kw.length<6) return false; var tol=kw.length>=8?2:1;
  for(var i=0;i<toks.length;i++){ var t=toks[i]; if(t.length>=5&&lev(t,kw)<=tol) return true; } return false; }
var INTENTS={
  greet:['hi','hello','hey','hola','buenas','buenos dias','buenas tardes','good morning'],
  thanks:['thanks','thank you','gracias','thx','perfect','perfecto','ok gracias'],
  hours:['hours','open','opening','close','closing','horario','horarios','abren','abierto','cierran','sunday','saturday','domingo','sabado','what time','a que hora','que hora'],
  where:['where','address','location','located','directions','direccion','donde','ubicacion','ubicados','phone number','telefono','numero','glendale','27th'],
  delivery:['delivery','deliver','delivered','ship','truck','next day','minimum','windows','entrega','entregas','entregan','envio','envian','llevan','domicilio','camion','troca','minimo','valley','valle','dump'],
  pay:['pay','payment','card','cards','credit','cash','visa','prepay','pago','pagar','tarjeta','tarjetas','credito','efectivo','aceptan'],
  retail:['retail','store','bagged','bag','bags','pickup','pick up','counter','cement','mortar','lime','spanish','tienda','bolsa','bolsas','recoger','mostrador','cemento','mortero','cal','espanol'],
  mine:['mine','mining','scale house','scale ticket','mina','bascula','caseta'],
  price:['price','prices','pricing','cost','how much does','how much is','cheap','fee','fees','precio','precios','cuanto cuesta','cuanto vale','costo','cobran','barato'],
  about:['about','history','family','since','owner','company','who are','historia','familia','empresa','desde cuando','quienes'],
  dgvr:['dg vs','vs river','versus','difference','compare','dg or','granite or','diferencia','comparar','dg o','o piedra de rio','cual es mejor','which is better'],
  calc:['how much do i need','how much rock','how many tons','how much material','calculate','calculator','estimate','cubic yard','cuanto necesito','cuanta piedra','cuantas toneladas','calcular','calculadora','yardas cubicas','how much','cuanto','cuanta'],
  quote:['quote','estimate request','order','buy','purchase','cotizacion','cotizar','pedido','pedir','comprar','ordenar'],
  show:['in my yard','in the yard','visualize','visualizer','preview it','show me','try it','en mi patio','en mi yarda','en el patio','muestrame','mostrar','ensename','ver como se ve','como se ve']
};
var COLORS=[
 [['gold','golden','dorado','dorada','dorados','doradas','oro','amarillo','amarilla'],function(p){return /gold/i.test(p.name);},{en:'gold rocks',es:'piedras doradas'}],
 [['red','reds','rojo','roja','rojos','rojas','rojizo','rojiza'],function(p){return p.fam==='red'&&/red|cherry|cinder|sedona|spice|sunset/i.test(p.name);},{en:'red rocks',es:'piedras rojas'}],
 [['pink','rose','coral','rosa','rosado','rosada','rosas'],function(p){return /pink|rose|coral|mauve/i.test(p.name);},{en:'pink and coral rocks',es:'piedras rosas y coral'}],
 [['brown','browns','cafe','cafes','marron','chocolate'],function(p){return p.fam==='brown';},{en:'brown rocks',es:'piedras caf\u00e9'}],
 [['grey','gray','gris','grises','silver','plateado'],function(p){return p.fam==='grey'&&!/white|frost|charcoal|sable/i.test(p.name)||/grey|ash|platinum/i.test(p.name);},{en:'grey rocks',es:'piedras grises'}],
 [['black','dark','charcoal','negro','negra','oscuro','oscura','carbon'],function(p){return /charcoal|sable|black|armor/i.test(p.name);},{en:'dark rocks',es:'piedras oscuras'}],
 [['white','blanco','blanca','blancas','blancos'],function(p){return /white|frost/i.test(p.name);},{en:'white rocks',es:'piedras blancas'}],
 [['green','verde','verdes','jade'],function(p){return p.fam==='green'&&/jade|verde|painted|rainbow|sundance/i.test(p.name);},{en:'green and blended rocks',es:'piedras verdes y mezcladas'}],
 [['tan','beige','blonde','cream','crema','arena','caramel','caramelo'],function(p){return /beige|blonde|tan|caramel|carmel|santa fe/i.test(p.name);},{en:'tan and beige rocks',es:'piedras beige'}]
];
var TYPES=[[['decomposed granite','granito descompuesto','dg','granito'],'dg'],[['river rock','piedra de rio','river','rio','pea gravel','canto rodado','boleo'],'river'],[['decorative','decorativa','decorative stone','piedra decorativa','landscape rock','yard rock','stone','stones','crushed rock'],'stone']];
var PN=P.map(function(p){ var n=norm(p.name.replace(/\(DG\)/,'')); return {p:p,n:n,toks:n.split(' ').filter(function(t){return t.length>1&&!/^\d|"/.test(t);})}; });
function findProducts(n){ var toks=n.split(' '), hits=[];
  PN.forEach(function(x){ if(!x.toks.length) return; var exact=n.indexOf(x.n)>=0; var all=x.toks.every(function(t){ return toks.indexOf(t)>=0||(t.length>=5&&toks.some(function(u){return u.length>=4&&lev(u,t)<=1;})); });
    if(exact||all) hits.push({p:x.p,s:x.toks.length+(exact?.5:0)}); });
  if(!hits.length) return [];
  var dgWanted=/\bdg\b|granito|decomposed/.test(n);
  hits.sort(function(a,b){return b.s-a.s;}); var best=hits[0].s; hits=hits.filter(function(h){return h.s>=best;});
  if(hits.length>1){ var pref=hits.filter(function(h){return (h.p.cat==='dg')===dgWanted;}); if(pref.length) hits=pref; }
  return hits.map(function(h){return h.p;});
}
function findType(n,toks){ for(var i=0;i<TYPES.length;i++) if(TYPES[i][0].some(function(k){return has(n,toks,k);})) return TYPES[i][1]; return null; }
function findColor(n,toks){ for(var i=0;i<COLORS.length;i++) if(COLORS[i][0].some(function(k){return toks.indexOf(k)>=0;})) return COLORS[i]; return null; }
function nums(n){ var out=[]; n.replace(/(\d+(?:[\.,]\d+)?)/g,function(m){out.push(parseFloat(m.replace(',','.')));}); return out; }
function parseArea(n){ var m=n.match(/(\d+(?:\.\d+)?)\s*(?:x|by|por|×)\s*(\d+(?:\.\d+)?)/); if(m) return parseFloat(m[1])*parseFloat(m[2]);
  m=n.match(/(\d+(?:\.\d+)?)\s*(?:sq\.?\s*ft|sqft|square\s*f(?:ee|oo)t|sf|ft2|pies\s*cuadrados|pies2|p2|pies)/); if(m) return parseFloat(m[1]); return null; }
function parseDepth(n){ var m=n.match(/(\d+(?:\.\d+)?)\s*(?:"|in\b|inch|inches|pulgada|pulgadas|pulg)/); return m?parseFloat(m[1]):null; }
function parseTons(n){ var m=n.match(/(\d+(?:\.\d+)?)\s*(?:tons?|toneladas?|ton\b|t\b)/); return m?parseFloat(m[1]):null; }

/* ---------------------------------------------------------------- UI */
var lang=/^es/i.test(navigator.language||'')?'es':'en', flow=null, lastProd=null, lastCalc=null, built=false;
var box=$('#chat');
function build(){ built=true;
  box.innerHTML='<div class="ch-head"><div class="ch-av"><svg viewBox="0 0 32 32"><path d="M4 24 L11 11 L16 17 L20 9 L28 24 Z" fill="#FBF5EA"/></svg></div><div class="ch-t"><b id="ch-title"></b><small id="ch-sub"></small></div><div class="lang" role="group" aria-label="Language"><button type="button" data-l="en">EN</button><button type="button" data-l="es">ES</button></div><button type="button" class="ch-x" aria-label="Close chat">\u00d7</button></div><div class="ch-note" id="ch-note"></div><div class="ch-log" id="ch-log" aria-live="polite"></div><div class="ch-chips" id="ch-chips"></div><form class="ch-in" id="ch-form"><input id="ch-input" autocomplete="off" enterkeyhint="send"><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M4 12l16-8l-6 16l-2-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button></form>';
  box.querySelectorAll('[data-l]').forEach(function(b){ b.onclick=function(){ setLang(b.getAttribute('data-l'),true); }; });
  $('.ch-x',box).onclick=close;
  $('#ch-form').onsubmit=function(e){ e.preventDefault(); var i=$('#ch-input'); var v=i.value.trim(); if(!v) return; i.value=''; send(v); };
  setLang(lang,false); bot(T[lang].hello);
}
function setLang(l,announce){ var ch=l!==lang; lang=l; var t=T[l]; $('#ch-title').textContent=t.title; $('#ch-sub').textContent=t.sub; $('#ch-note').textContent=t.note; $('#ch-input').placeholder=t.ph;
  box.querySelectorAll('[data-l]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-l')===l);}); chips(); if(announce&&ch) bot(l==='es'?'Listo, seguimos en espa\u00f1ol. \u00bfEn qu\u00e9 le puedo ayudar?':'Sure, switching to English. How can I help?'); }
function chips(){ var c=$('#ch-chips'); c.innerHTML=''; T[lang].chips.forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.textContent=x; b.onclick=function(){send(x);}; c.appendChild(b); }); }
function log(){return $('#ch-log');}
function scroll(){ var l=log(); l.scrollTop=l.scrollHeight; }
function me(t){ var d=document.createElement('div'); d.className='msg me'; d.textContent=t; log().appendChild(d); scroll(); }
function bot(html,extra){ var d=document.createElement('div'); d.className='msg bot'; d.innerHTML=html; log().appendChild(d); if(extra) log().appendChild(extra); scroll(); }
var busy=0;
function reply(fn){ busy++; var ty=document.createElement('div'); ty.className='typing'; ty.innerHTML='<i></i><i></i><i></i>'; log().appendChild(ty); scroll();
  setTimeout(function(){ ty.remove(); busy--; fn(); }, 380+Math.random()*320); }
function open(){ if(!built) build(); box.hidden=false; $('#chat-fab').hidden=true; setTimeout(function(){ if(window.matchMedia('(min-width:700px)').matches) $('#ch-input').focus(); },50); }
function close(){ box.hidden=true; $('#chat-fab').hidden=false; }
$('#chat-fab').onclick=open;

function cards(list){ var t=T[lang], w=document.createElement('div'); w.className='pcards';
  list.slice(0,8).forEach(function(p){ var c=document.createElement('div'); c.className='pcard';
    var av=(p.div||[]).map(function(d){return t.avail[d];}).filter(Boolean);
    var desc=lang==='en'?p.sum:(t.sizes+': '+(p.sizes.length?p.sizes.join(', '):'\u2014')+(av.length?'. '+t.availL+' '+av.join(', ')+'.':''));
    c.innerHTML='<div class="img" style="background-image:url(sw/'+p.id+'.jpg)"></div><div class="b"><div class="n">'+esc(p.name)+'</div><div class="c">'+esc(CAT[lang][p.cat])+'</div><div class="d">'+esc(desc)+'</div><button type="button">'+esc(t.show)+'</button></div>';
    $('button',c).onclick=function(){ showInYard(p); }; w.appendChild(c); });
  return w; }
function showInYard(p){ lastProd=p; var ok=V.applyProduct(p.id,false); if(ok!==false){ bot(T[lang].shown(p.name)); if(!window.matchMedia('(min-width:700px)').matches) setTimeout(close,1100); } }

function calcOut(c){ var t=DENS[c.dk]; var cuft=c.area*c.depth/12, yd=r2(cuft/27), tons=r2(yd*t); lastCalc={mat:c.mat,prod:c.prod,area:c.area,depth:c.depth,yd:yd,tons:tons}; return T[lang].calcRes({mat:c.mat,area:c.area,depth:c.depth,cuft:cuft,yd:yd,tons:tons,t:t,dl:DENSL[lang][c.dk]}); }
function matFrom(n,toks){ var ps=findProducts(n); if(ps.length){ var p=ps[0]; lastProd=p; return {mat:p.name,prod:p,dk:p.dens}; }
  var ty=findType(n,toks); if(ty) return {mat:CAT[lang][ty],dk:ty==='dg'?'dg':ty==='river'?'rr':'ds'}; return null; }
function activeMat(){ var id=V.activeProduct&&V.activeProduct(); var p=id&&PBY[id]||lastProd; return p?{mat:p.name,prod:p,dk:p.dens}:null; }

function quoteSummary(q){ var e=[], s=[]; var qtyE=q.tons!=null?f2(q.tons)+' tons (est.)'+(q.area?' \u2014 '+f2(q.area)+' sq ft at '+f2(q.depth)+' in':''):T.en.tbd, qtyS=q.tons!=null?f2(q.tons,'es')+' toneladas (aprox.)'+(q.area?' \u2014 '+f2(q.area,'es')+' pies\u00b2 a '+f2(q.depth,'es')+' pulg.':''):T.es.tbd;
  var placeE=q.pickup?T.en.pickup:(q.zip||T.en.tbd), placeS=q.pickup?T.es.pickup:(q.zip||T.es.tbd);
  e.push('QUOTE REQUEST \u2014 ABC Sand & Rock','Material: '+(q.mat||T.en.tbd),'Quantity: '+qtyE,'Delivery ZIP / area: '+placeE,'Date needed: '+(q.date||T.en.tbd));
  s.push('SOLICITUD DE COTIZACI\u00d3N \u2014 ABC Sand & Rock','Material: '+(q.mat||T.es.tbd),'Cantidad: '+qtyS,'C\u00f3digo postal / zona: '+placeS,'Fecha: '+(q.date||T.es.tbd));
  var foot=['','Estimate from ABC\u2019s published densities / Estimado con los pesos publicados por ABC.','Call / Llame: '+PHONE];
  return (lang==='es'?s.concat(['']).concat(e):e.concat(['']).concat(s)).concat(foot).join('\n'); }
function quoteCard(txt){ var t=T[lang], w=document.createElement('div'); w.className='qcard'; w.innerHTML='<pre></pre><div class="row"><button type="button" class="btn sand sm" style="background:#E9D8B8">'+t.copy+'</button><a class="btn copper sm" href="tel:'+TEL+'">'+t.call+'</a></div>'; $('pre',w).textContent=txt;
  $('button',w).onclick=function(){ var b=this; var ok=function(){ b.textContent=t.copied+' \u2713'; }; if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(txt).then(ok,fb); else fb(); function fb(){ var a=document.createElement('textarea'); a.value=txt; a.style.cssText='position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try{document.execCommand('copy');ok();}catch(e){} a.remove(); } };
  return w; }

function startQuote(n,toks){ var q={}; var m=(n&&matFrom(n,toks))||(lastCalc&&{mat:lastCalc.mat})||activeMat(); if(m) q.mat=m.mat;
  if(lastCalc&&lastCalc.mat===q.mat){ q.tons=lastCalc.tons; q.area=lastCalc.area; q.depth=lastCalc.depth; }
  if(n){ var tn=parseTons(n); if(tn) q.tons=tn; var z=n.match(/\b(8[5-6]\d{3})\b/); if(z) q.zip=z[1]; }
  flow={k:'quote',q:q}; nextQuote(); }
function nextQuote(){ var q=flow.q, t=T[lang];
  if(!q.mat){ flow.need='mat'; return bot(t.qAskMat); }
  if(q.tons==null&&!q.qtySkip){ flow.need='qty'; return bot(t.qAskQty); }
  if(!q.zip&&!q.pickup&&!q.zipSkip){ flow.need='zip'; return bot(t.qAskZip); }
  if(!q.date&&!q.dateSkip){ flow.need='date'; return bot(t.qAskDate); }
  flow=null; bot(t.qDone, quoteCard(quoteSummary(q))); }
function isSkip(n){ return /^(skip|omitir|no se|no lo se|i don.?t know|idk|no|n\/a|ninguno|pass|paso)$/.test(n); }

function handle(text){
  var n=norm(text), toks=n.split(' '), t=T[lang];
  /* --- slot filling flows (a clear new question breaks out of the flow) */
  if(flow&&!/\d/.test(n)&&!isSkip(n)){ var si=scoreIntents(n,toks).s; var brk=['dgvr','where','pay','retail','mine','price','about','show','thanks','delivery'].concat(flow.need==='date'?[]:['hours']).some(function(k){return (si[k]||0)>=1;});
    if(flow.need==='zip'&&/pick ?up|recoger|recojo|tienda|store/.test(n)) brk=false; if(flow.need==='mat'&&findProducts(n).length) brk=false; if(brk) flow=null; }
  if(flow&&flow.k==='calc'){
    var c=flow.c;
    if(flow.need==='mat'){ var m=matFrom(n,toks); if(m){ c.mat=m.mat; c.prod=m.prod; c.dk=m.dk; } else if(!/\d/.test(n)&&!scoreIntents(n,toks).best) { return bot(t.calcAskMat); } }
    var a=parseArea(n); if(a) c.area=a; var d=parseDepth(n); if(d) c.depth=d;
    var ns=nums(n);
    if(flow.need==='area'&&!a&&ns.length){ c.area=ns.length>=2&&/x|by|por/.test(n)?ns[0]*ns[1]:ns[0]; }
    else if(flow.need==='depth'&&!d&&ns.length){ c.depth=ns[0]; }
    if(flow.need==='depth'&&!d&&!ns.length&&/default|normal|usual|ok|okay|si|yes|2/.test(n)) c.depth=2;
    if(c.area&&c.depth&&c.mat){ flow=null; return bot(calcOut(c)); }
    if(!c.mat){ flow.need='mat'; return bot(t.calcAskMat); } if(!c.area){ flow.need='area'; return bot(t.calcAskArea); } flow.need='depth'; return bot(t.calcAskDepth);
  }
  if(flow&&flow.k==='quote'){
    var q=flow.q, nd=flow.need;
    if(nd==='mat'){ var mm=matFrom(n,toks); q.mat=mm?mm.mat:text.trim().slice(0,60); }
    else if(nd==='qty'){ if(/pick ?up|recoger|recojo/.test(n)&&!/\d/.test(n)){ q.pickup=true; q.qtySkip=true; } else if(isSkip(n)) q.qtySkip=true; else { var tn=parseTons(n), ar=parseArea(n), dp=parseDepth(n);
        if(tn) q.tons=tn; else if(ar){ var dk=(q.mat&&findProducts(norm(q.mat))[0]||{dens:'ds'}).dens; dp=dp||2; var yd=r2(ar*dp/12/27); q.tons=r2(yd*DENS[dk]); q.area=ar; q.depth=dp; }
        else { var nn=nums(n); if(nn.length) q.tons=nn[0]; else q.qtySkip=true; } } }
    else if(nd==='zip'){ if(isSkip(n)) q.zipSkip=true; else if(/pick ?up|recoger|recojo|lo recojo|tienda|store/.test(n)) q.pickup=true; else { var z=text.match(/\b\d{5}\b/); q.zip=z?z[0]:text.trim().slice(0,40); } }
    else if(nd==='date'){ if(isSkip(n)) q.dateSkip=true; else q.date=text.trim().slice(0,40); }
    return nextQuote();
  }
  /* --- intents */
  var sc=scoreIntents(n,toks), I=sc.s;
  var prods=findProducts(n), color=findColor(n,toks), type=findType(n,toks);
  if(I.show&&(prods.length||lastProd)){ var p=prods[0]||lastProd; bot(lang==='es'?'Va, aqu\u00ed est\u00e1 <b>'+esc(p.name)+'</b>:':'Sure, here\u2019s <b>'+esc(p.name)+'</b>:', cards([p])); return showInYard(p); }
  if(I.quote>=1&&!I.price) return startQuote(n,toks);
  if(I.dgvr||(/\bdg\b|granito/.test(n)&&/river|rio/.test(n))) return bot(t.dgvr);
  if(I.price&&(I.price>=(I.calc||0))) return bot(t.price);
  if(I.calc&&!(I.hours||I.where||I.delivery||I.pay)){ var cc={}; var m2=matFrom(n,toks)||activeMat(); if(m2){cc.mat=m2.mat;cc.prod=m2.prod;cc.dk=m2.dk;} var aa=parseArea(n); if(aa) cc.area=aa; var dd=parseDepth(n); if(dd) cc.depth=dd;
    flow={k:'calc',c:cc}; if(cc.mat&&cc.area&&cc.depth){ flow=null; return bot(calcOut(cc)); } if(!cc.mat){flow.need='mat'; return bot(t.calcAskMat);} if(!cc.area){flow.need='area'; return bot((lang==='es'?'Con <b>'+esc(cc.mat)+'</b>. ':'Using <b>'+esc(cc.mat)+'</b>. ')+t.calcAskArea);} flow.need='depth'; return bot(t.calcAskDepth); }
  if(prods.length){ lastProd=prods[0]; return bot(t.found(prods.length, lang==='es'?'opciones':'options'), cards(prods)); }
  var order=['hours','mine','where','delivery','pay','retail','mine','about','greet','thanks'];
  var best=null,bv=0; order.forEach(function(k){ if((I[k]||0)>bv){bv=I[k];best=k;} });
  if(color||type){ if(!best||best==='greet'||bv<2){ var list=P.filter(function(p){ return (!color||color[1](p))&&(!type||p.cat===type); }); if(list.length){ lastProd=list[0]; var w=color?color[2][lang]:({en:{stone:'decorative stones',dg:'DG colors',river:'river rock sizes'},es:{stone:'piedras decorativas',dg:'colores de DG',river:'tama\u00f1os de piedra de r\u00edo'}})[lang][type]; return bot(t.found(list.length,w)+(list.length>8?(lang==='es'?' (le muestro 8)':' (showing 8)'):''), cards(list)); } } }
  if(best==='greet') return bot(t.hello);
  if(best==='thanks') return bot(t.thanks);
  if(best) return bot(t[best]);
  return bot(t.fallback);
}
function scoreIntents(n,toks){ var s={},best=null,bv=0; Object.keys(INTENTS).forEach(function(k){ var v=0; INTENTS[k].forEach(function(kw){ if(has(n,toks,kw)) v+=kw.indexOf(' ')>=0?2:1; }); if(v){s[k]=v; if(v>bv){bv=v;best=k;}} }); return {s:s,best:best}; }
function send(text){ if(busy) return; me(text); var l=detect(text,lang); var inFlowNumeric=flow&&/^[\d\s\.,x"]+$/.test(text.trim()); if(l!==lang&&!inFlowNumeric) setLang(l,false); reply(function(){ handle(text); }); }
window.ABC_CHAT={open:open,close:close,send:send,lang:function(){return lang;},setLang:function(l){if(!built)build();setLang(l,false);}};
})();
