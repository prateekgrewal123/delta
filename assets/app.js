const carrierList=[
 {name:"American Airlines",code:"AA",abbr:"AA",factor:1.00},
 {name:"Delta Air Lines",code:"DL",abbr:"DL",factor:1.03},
 {name:"United Airlines",code:"UA",abbr:"UA",factor:1.01},
 {name:"Southwest Airlines",code:"WN",abbr:"WN",factor:.88},
 {name:"JetBlue",code:"B6",abbr:"B6",factor:.94},
 {name:"Alaska Airlines",code:"AS",abbr:"AS",factor:.97},
 {name:"Air Canada",code:"AC",abbr:"AC",factor:1.02},
 {name:"British Airways",code:"BA",abbr:"BA",factor:1.10},
 {name:"Lufthansa",code:"LH",abbr:"LH",factor:1.08},
 {name:"Emirates",code:"EK",abbr:"EK",factor:1.18},
 {name:"Qatar Airways",code:"QR",abbr:"QR",factor:1.15},
 {name:"Singapore Airlines",code:"SQ",abbr:"SQ",factor:1.16},
 {name:"Air India",code:"AI",abbr:"AI",factor:1.00},
 {name:"IndiGo",code:"6E",abbr:"6E",factor:.90},
 {name:"Etihad Airways",code:"EY",abbr:"EY",factor:1.12}
];

function val(id){return document.getElementById(id)?.value||""}
function airportByInput(v){
 const s=(v||"").toLowerCase().trim();
 const m=s.match(/\(([a-z]{3})\)/);
 const code=m?m[1]:s;
 return (window.AIRPORTS||[]).find(x=>x.iata.toLowerCase()===code)
   || (window.AIRPORTS||[]).find(x=>x.city.toLowerCase()===s)
   || (window.AIRPORTS||[]).find(x=>x.name.toLowerCase()===s);
}
function airportSuggestions(inputId, boxId){
 const input=document.getElementById(inputId), box=document.getElementById(boxId);
 if(!input||!box)return;
 const airports=()=>Array.isArray(window.AIRPORTS)?window.AIRPORTS:[];
 function render(){
   const q=input.value.trim().toLowerCase();
   if(!q){box.innerHTML="";box.classList.remove("show");return}
   const terms=q.split(/\s+/).filter(Boolean);
   const matches=airports().map(a=>{
     const fields=[a.iata,a.city,a.name,a.country].map(x=>String(x||"").toLowerCase());
     let score=0;
     if(fields[0].startsWith(q))score+=100;
     if(fields[1].startsWith(q))score+=95;
     if(fields[2].startsWith(q))score+=85;
     if(fields[3].startsWith(q))score+=70;
     if(fields.some(x=>x.includes(q)))score+=50;
     if(terms.length>1 && terms.every(t=>fields.some(x=>x.includes(t))))score+=80;
     return {a,score};
   }).filter(x=>x.score>0).sort((x,y)=>y.score-x.score||x.a.city.localeCompare(y.a.city)).slice(0,12);
   box.innerHTML=matches.map(({a})=>
     `<button type="button" class="airport-option" data-value="${String(a.city).replace(/"/g,'&quot;')} (${a.iata})">
       <span class="airport-code">${a.iata}</span>
       <span class="airport-main"><b>${a.city}</b><small>${a.name} · ${a.country}</small></span>
     </button>`
   ).join("");
   box.classList.toggle("show",matches.length>0);
   box.querySelectorAll(".airport-option").forEach(btn=>btn.addEventListener("mousedown",e=>{
     e.preventDefault();
     input.value=btn.dataset.value;
     box.innerHTML="";box.classList.remove("show");
   }));
 }
 input.addEventListener("input",render);
 input.addEventListener("focus",()=>{if(input.value.trim())render()});
 input.addEventListener("keydown",e=>{
   if(e.key==="Escape"){box.classList.remove("show");return}
   if(e.key==="Enter"){
     const first=box.querySelector(".airport-option");
     if(first){e.preventDefault();first.dispatchEvent(new MouseEvent("mousedown",{bubbles:true}))}
   }
 });
 document.addEventListener("click",e=>{
   if(!e.target.closest("#"+inputId)&&!e.target.closest("#"+boxId))box.classList.remove("show");
 });
}
function initSearch(){
 const form=document.getElementById("searchForm"); if(!form)return;
 airportSuggestions("from","fromSuggestions"); airportSuggestions("to","toSuggestions");
 document.querySelectorAll(".trip").forEach(b=>b.onclick=()=>{
   document.querySelectorAll(".trip").forEach(x=>x.classList.remove("active"));b.classList.add("active");
   document.getElementById("returnWrap").style.display=b.dataset.trip==="one"?"none":"block";
 });
 document.getElementById("swap").onclick=()=>{let a=val("from"),b=val("to");document.getElementById("from").value=b;document.getElementById("to").value=a};
 document.querySelectorAll(".route").forEach(b=>b.onclick=()=>{document.getElementById("from").value=b.dataset.from;document.getElementById("to").value=b.dataset.to;location.hash="search"});
 form.onsubmit=e=>{
   e.preventDefault();
   const f=airportByInput(val("from")),t=airportByInput(val("to"));
   if(!f||!t){alert("Please choose a valid airport from the suggestions.");return}
   if(f.iata===t.iata){alert("Origin and destination must be different.");return}
   sessionStorage.setItem("search",JSON.stringify({from:f.iata,to:t.iata,fromLabel:`${f.city} (${f.iata})`,toLabel:`${t.city} (${t.iata})`,depart:val("depart"),return:val("return"),passengers:val("passengers")}));
   location.href="results.html";
 }
}
function haversine(a,b){
 const R=3958.8,rad=Math.PI/180, dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
 const x=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 2*R*Math.asin(Math.sqrt(x));
}
function money(n){return "$"+Math.round(n).toLocaleString("en-US")}
function mins(n){return `${Math.floor(n/60)}h ${String(n%60).padStart(2,"0")}m`}
function timeFromOffset(offset){let h=(7+offset)%24;return String(h).padStart(2,"0")+":00"}
function makeFlights(from,to){
 const a=(window.AIRPORTS||[]).find(x=>x.iata===from),b=(window.AIRPORTS||[]).find(x=>x.iata===to);
 if(!a||!b)return [];
 const miles=haversine(a,b), international=a.country!==b.country;
 const base=international ? (miles<1000?145:miles<2500?265:miles<5000?430:miles<7500?610:780) : (miles<400?85:miles<900?125:miles<1600?175:miles<2500?235:310);
 let eligible=[];
 // Use route snapshot to prefer carriers historically associated with this airport pair.
 const routeAirlines=new Set((window.ROUTES||[]).filter(r=>r[1]===from&&r[2]===to).map(r=>r[0]));
 const allNames=(window.AIRLINES||[]);
 carrierList.forEach(c=>{
   const found=allNames.find(x=>x.iata===c.code);
   if(found && (routeAirlines.size===0 || routeAirlines.has(c.code))) eligible.push(c);
 });
 if(eligible.length<4) eligible=carrierList.slice(0,Math.min(8,carrierList.length));
 return eligible.slice(0,8).map((c,i)=>{
   const stops=international && miles>5000 ? (i%3===0?1:0) : (i%5===0?1:0);
   const dur=Math.max(55,Math.round((miles/520)*60)+stops*85+20);
   const price=base*c.factor*(1+(i%4)*.055);
   return {air:c.name,code:c.code,abbr:c.abbr,dep:timeFromOffset((i*2)%12),arr:timeFromOffset(((i*2)%12)+Math.ceil(dur/60)),dur,stops,price,baggage:international?"1 checked bag":"carry-on + personal item"};
 });
}
function logo(c){return `<span class="air-logo ${c.toLowerCase()}">${c}</span>`}
function renderResults(){
 let s={from:"JFK",to:"LAX",passengers:"1 Adult"};try{s={...s,...JSON.parse(sessionStorage.getItem("search")||"{}")}}catch{}
 const from=s.from,to=s.to, flights=makeFlights(from,to);
 const fA=(window.AIRPORTS||[]).find(x=>x.iata===from),fB=(window.AIRPORTS||[]).find(x=>x.iata===to);
 document.getElementById("routeTitle").textContent=`${fA?.city||from} → ${fB?.city||to}`;
 document.getElementById("searchMeta").textContent=`${s.return?"Round trip":"One way"} · ${s.passengers||"1 Adult"} · ${from} to ${to}`;
 const list=document.getElementById("flightList"),sort=document.getElementById("sort"),price=document.getElementById("priceFilter"),count=document.getElementById("count"),pv=document.getElementById("priceValue");
 if(!flights.length){
   const fallback=[
     ["American Airlines","AA"],["Delta Air Lines","DL"],["United Airlines","UA"],["Southwest Airlines","WN"],
     ["JetBlue","B6"],["Alaska Airlines","AS"],["Air Canada","AC"],["British Airways","BA"]
   ];
   const dist=(fA&&fB)?Math.max(250,haversine(fA,fB)):1200;
   const base=Math.max(89,Math.min(899,Math.round(dist*.12)));
   flights.push(...fallback.map((x,i)=>({air:x[0],code:x[1],abbr:x[1],dep:timeFromOffset((i*2)%12),arr:timeFromOffset(((i*2)%12)+3),dur:180+(i%4)*35,stops:i%3===0?1:0,price:base*(1+i*.07),baggage:"carry-on + personal item"})));
}
 const maxDefault=Math.ceil(Math.max(...flights.map(x=>x.price))/100)*100;
 price.min=Math.max(25,Math.floor(Math.min(...flights.map(x=>x.price))/100)*100);price.max=Math.ceil(Math.max(...flights.map(x=>x.price))/100)*100;price.value=price.max;
 function draw(){
   let max=+price.value;
   let arr=flights.filter(f=>f.price<=max);
   if(sort.value==="price")arr.sort((a,b)=>a.price-b.price);if(sort.value==="duration")arr.sort((a,b)=>a.dur-b.dur);if(sort.value==="departure")arr.sort((a,b)=>a.dep.localeCompare(b.dep));
   count.textContent=arr.length+" flights";pv.textContent=money(max);
   list.innerHTML=arr.length?arr.map(f=>`<article class="flight"><div class="air-wrap">${logo(f.abbr)}<div><div class="air-name">${f.air}</div><div class="air-code">${f.code} · ${f.baggage}</div></div></div><div><div class="times"><strong>${f.dep}</strong><div class="line"></div><strong>${f.arr}</strong></div><div class="flight-meta">${mins(f.dur)} · ${f.stops?f.stops+" stop":"Non-stop"}</div></div><div class="flight-price"><strong>${money(f.price)}</strong><small>estimated fare</small><a class="book" href="#" onclick="partnerBook(event,'${f.air}')">Book Now →</a></div></article>`).join(""):`<div class="empty">No options under this price. Increase the maximum fare.</div>`;
 }
 [price,sort].forEach(x=>x.addEventListener("input",draw));draw();
}
function partnerBook(e,air){e.preventDefault();alert(`Booking partner link for ${air} will be connected here. The current version does not issue tickets or take payment.`)}
document.addEventListener("DOMContentLoaded",initSearch);
window.renderResults=renderResults;
