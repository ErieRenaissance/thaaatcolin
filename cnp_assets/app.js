// CNP Dashboard Application Logic
/* ============================================================
   DRAWER
   ============================================================ */
var sidebar=document.getElementById('sidebar');
var overlay=document.getElementById('overlay');
var menuBtn=document.getElementById('menuBtn');

function openDrawer(){sidebar.classList.add('open');overlay.classList.add('open');menuBtn.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';}
function closeDrawer(){sidebar.classList.remove('open');overlay.classList.remove('open');menuBtn.setAttribute('aria-expanded','false');document.body.style.overflow='';}
menuBtn.addEventListener('click',function(){sidebar.classList.contains('open')?closeDrawer():openDrawer();});
overlay.addEventListener('click',closeDrawer);

/* Nav links */
document.querySelectorAll('.nav-link').forEach(function(link){
    link.addEventListener('click',function(){navigateTo(parseInt(this.dataset.view));});
    link.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();navigateTo(parseInt(this.dataset.view));}});
});

/* Export button */
document.getElementById('exportBtn').addEventListener('click',exportCSV);

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(idx){
    document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
    var target=document.getElementById('view-'+idx);
    if(target)target.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(function(l){l.classList.remove('active');});
    var al=document.querySelector('.nav-link[data-view="'+idx+'"]');
    if(al)al.classList.add('active');
    if(idx>=1&&idx<=7&&!target.dataset.rendered){renderPillarDetail(idx);target.dataset.rendered='1';}
    closeDrawer();
    window.scrollTo({top:0,behavior:'smooth'});
}

/* ============================================================
   PILLAR CARDS
   ============================================================ */
function renderPillarCards(){
    var g=document.getElementById('pillarsGrid');var h='';
    DATA.pillars.forEach(function(p){
        var total=p.usScore+p.chinaScore;var usPct=Math.round((p.usScore/total)*100);var cnPct=100-usPct;
        var lead=p.usScore>p.chinaScore;var d=Math.abs(p.usScore-p.chinaScore).toFixed(1);
        h+='<div class="pcard" onclick="navigateTo('+p.id+')">'+
            '<div class="pcard-top"><div class="pcard-icon">'+ICONS[p.id-1]+'</div><div class="pcard-num">PILLAR '+p.id+'</div></div>'+
            '<div class="pcard-title">'+p.title+'</div>'+
            '<div class="pcard-scores">'+
            '<div><div class="pcard-s-label" style="color:#3b82f6">US</div><div class="pcard-s-val" style="color:#3b82f6">'+p.usScore+'</div></div>'+
            '<div style="text-align:right"><div class="pcard-s-label" style="color:#f43f5e">CN</div><div class="pcard-s-val" style="color:#f43f5e">'+p.chinaScore+'</div></div>'+
            '</div>'+
            '<div class="bar-track"><div class="bar-us" style="width:'+usPct+'%"></div><div class="bar-cn" style="width:'+cnPct+'%"></div></div>'+
            '<div class="pcard-lead" style="color:'+(lead?'#3b82f6':'#f43f5e')+'">'+(lead?'\u25B2 US':'\u25B2 CN')+' leads by '+d+'</div>'+
            '</div>';
    });
    g.innerHTML=h;
}

/* ============================================================
   PILLAR DETAIL
   ============================================================ */
function tc(t){if(t==='\u2191'||t==='\u2191\u2191')return 't-up';if(t==='\u2193')return 't-dn';return 't-flat';}

function renderPillarDetail(id){
    var p=DATA.pillars.find(function(x){return x.id===id;});if(!p)return;
    var el=document.getElementById('view-'+id);
    var rows='';
    p.indicators.forEach(function(ind){
        rows+='<tr><td class="td-ind">'+ind.name+'</td>'+
            '<td class="td-us ctr">'+ind.us+'</td>'+
            '<td class="ctr '+tc(ind.usTrend)+'" style="font-size:14px">'+ind.usTrend+'</td>'+
            '<td class="td-cn ctr">'+ind.china+'</td>'+
            '<td class="ctr '+tc(ind.chinaTrend)+'" style="font-size:14px">'+ind.chinaTrend+'</td>'+
            '<td class="td-note">'+ind.note+'</td></tr>';
        if(ind.subIndicators&&ind.subIndicators.length){
            var sr='';ind.subIndicators.forEach(function(s){
                sr+='<tr><td style="color:#94a3b8">'+s.name+'</td><td class="td-us ctr">'+(s.us||'\u2014')+'</td><td class="td-cn ctr">'+(s.china||'\u2014')+'</td></tr>';
            });
            rows+='<tr class="sub-row"><td colspan="6"><details>'+
                '<summary><span class="chev">\u25B6</span>'+ind.subIndicators.length+' subcategories</summary>'+
                '<div class="sub-inner"><table><thead><tr><th style="text-align:left">Subcategory</th><th class="ctr">US</th><th class="ctr">China</th></tr></thead>'+
                '<tbody>'+sr+'</tbody></table></div></details></td></tr>';
        }
    });
    el.innerHTML='<div class="pillar-head">'+
        '<div class="back-btn" onclick="navigateTo(0)">\u2190 Back to overview</div>'+
        '<h2>'+ICONS[id-1]+' '+p.title+'</h2>'+
        '<div class="pillar-head-sub">Pillar '+id+' of 7 \u00B7 '+p.indicators.length+' indicators</div></div>'+
        '<div class="score-pair">'+
        '<div class="scard us"><div class="scard-label" style="color:#3b82f6">UNITED STATES</div><div class="scard-val" style="color:#3b82f6">'+p.usScore+'</div></div>'+
        '<div class="scard cn"><div class="scard-label" style="color:#f43f5e">CHINA</div><div class="scard-val" style="color:#f43f5e">'+p.chinaScore+'</div></div></div>'+
        '<div class="table-scroll"><table>'+
        '<thead><tr><th style="width:26%">Indicator</th><th class="ctr">US</th><th class="ctr" style="width:44px">Trend</th><th class="ctr">China</th><th class="ctr" style="width:44px">Trend</th><th>Source</th></tr></thead>'+
        '<tbody>'+rows+'</tbody></table></div>';
}

/* ============================================================
   RADAR
   ============================================================ */
var radarInstance=null;
function renderRadar(){
    if(typeof Chart==='undefined'){
        document.getElementById('radarWrap').innerHTML='<div class="radar-fallback">Chart library unavailable. Data is shown in the cards below.</div>';
        return;
    }
    var ctx=document.getElementById('radarChart');
    if(!ctx)return;
    try{
        if(radarInstance)radarInstance.destroy();
        radarInstance=new Chart(ctx,{
            type:'radar',
            data:{
                labels:DATA.pillars.map(function(p){return p.title;}),
                datasets:[
                    {label:'US',data:DATA.pillars.map(function(p){return p.usScore;}),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,0.08)',borderWidth:2.5,pointBackgroundColor:'#3b82f6',pointBorderColor:'#3b82f6',pointRadius:3,pointHoverRadius:5},
                    {label:'China',data:DATA.pillars.map(function(p){return p.chinaScore;}),borderColor:'#f43f5e',backgroundColor:'rgba(244,63,94,0.08)',borderWidth:2.5,pointBackgroundColor:'#f43f5e',pointBorderColor:'#f43f5e',pointRadius:3,pointHoverRadius:5}
                ]
            },
            options:{
                responsive:true,maintainAspectRatio:true,
                plugins:{legend:{display:false},tooltip:{backgroundColor:'#1a2235',borderColor:'rgba(148,163,184,0.15)',borderWidth:1,padding:10,cornerRadius:6}},
                scales:{r:{grid:{color:'rgba(148,163,184,0.06)'},angleLines:{color:'rgba(148,163,184,0.06)'},pointLabels:{color:'#94a3b8',font:{size:10,weight:'500'}},ticks:{display:false},suggestedMin:0,suggestedMax:35}}
            }
        });
    }catch(e){
        console.warn('Chart error:',e);
        document.getElementById('radarWrap').innerHTML='<div class="radar-fallback">Chart rendering failed. Data is in the cards below.</div>';
    }
}

/* ============================================================
   CSV EXPORT
   ============================================================ */
function exportCSV(){
    var csv='Pillar,Indicator,US Value,US Trend,China Value,China Trend,Source\n';
    DATA.pillars.forEach(function(p){p.indicators.forEach(function(i){
        csv+='"'+p.title+'","'+i.name+'","'+i.us+'","'+i.usTrend+'","'+i.china+'","'+i.chinaTrend+'","'+i.note+'"\n';
        if(i.subIndicators){i.subIndicators.forEach(function(s){
            csv+='"'+p.title+'","  > '+s.name+'","'+(s.us||'')+'","","'+(s.china||'')+'","",""\n';
        });}
    });});
    var blob=new Blob([csv],{type:'text/csv'});var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download='CNP-Dashboard-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    var t=document.createElement('div');t.textContent='\u2713 Exported 400+ data points';
    t.style.cssText='position:fixed;bottom:24px;right:16px;left:16px;max-width:300px;margin-left:auto;background:#222d44;color:#34d399;padding:12px 18px;border-radius:8px;font-size:13px;font-weight:500;border:1px solid rgba(52,211,153,0.2);box-shadow:0 8px 24px rgba(0,0,0,0.5);z-index:9998;text-align:center;';
    document.body.appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},2500);
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded',function(){renderPillarCards();renderRadar();});
