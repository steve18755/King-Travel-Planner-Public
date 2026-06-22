/* King Family Travel Planner v7.2 Asset Diagnostics
   Scans GitHub Pages assets, current page images, planner-state image references,
   Supabase Storage bucket reachability, and app.asset_files readiness.
*/
(function(){
  'use strict';
  const CRITICAL_PUBLIC_ASSETS = [
    'assets/images/KingCrest.PNG',
    'assets/images/ui/dashboard_beach_hero.png',
    'assets/images/people/King3.png',
    'assets/images/pets/Pepper.png',
    'assets/images/pets/June.png'
  ];
  const EXPECTED_STORAGE_BUCKETS = [
    {id:'kftp-public-assets', sensitive:false, note:'Optional public mirror for safe non-sensitive assets.'},
    {id:'kftp-profile-photos', sensitive:true, note:'Private household profile photos.'},
    {id:'kftp-loyalty-cards', sensitive:true, note:'Private loyalty, airline, casino, and award card images.'},
    {id:'kftp-travel-documents', sensitive:true, note:'Private passport, ID, confirmation, and PDF imports.'},
    {id:'kftp-trip-attachments', sensitive:true, note:'Private trip confirmations, screenshots, and quote attachments.'},
    {id:'kftp-pet-care', sensitive:true, note:'Private pet care photos, sitter sheets, schedules, and rates.'}
  ];
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function injectStyles(){
    if(document.getElementById('kftpAssetDiagStyles')) return;
    const st=document.createElement('style');
    st.id='kftpAssetDiagStyles';
    st.textContent=`
      .assetDiagWrap{position:fixed;inset:0;z-index:999997;background:rgba(5,28,40,.68);display:flex;align-items:flex-start;justify-content:center;padding:28px;overflow:auto}.assetDiag{width:min(1180px,96vw);background:#fff;border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);padding:20px;font:14px system-ui;color:#12202b}.assetDiag h2{margin:0 0 8px}.assetDiagHead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid #dbe6e8;padding-bottom:12px;margin-bottom:14px}.assetDiag table{width:100%;border-collapse:collapse;min-width:820px}.assetDiag th,.assetDiag td{border-bottom:1px solid #e4eef0;padding:9px;text-align:left;vertical-align:top}.assetDiag th{background:#f1f8f7;color:#3f5c68}.assetDiag .ok{color:#057a44;font-weight:900}.assetDiag .missing{color:#b42318;font-weight:900}.assetDiag .warn{color:#9a5b00;font-weight:900}.assetDiag .blocked{color:#6b4eff;font-weight:900}.assetDiag .diagBox{border:1px solid #dbe6e8;background:#f8fbfc;border-radius:14px;padding:10px;margin:10px 0}.assetDiag .diagScroll{overflow:auto;max-height:55vh}.assetDiag code{font-size:12px;word-break:break-all}.assetDiag .closeDiag{border:0;border-radius:12px;padding:9px 12px;font-weight:900;background:#edf6f8;color:#0a4550;cursor:pointer}
    `;
    document.head.appendChild(st);
  }
  function absolutize(url){
    const raw=String(url||'').trim().replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    if(!raw || raw === 'none') return '';
    if(raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    try{return new URL(raw, document.baseURI).href;}catch(e){return raw;}
  }
  function looksLikeAssetString(s){
    const x=String(s||'');
    if(!x) return false;
    return x.startsWith('data:image/') ||
      x.includes('assets/images/') ||
      /^https?:\/\/.+\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(x) ||
      /^https?:\/\/images\.unsplash\.com\//i.test(x);
  }
  function collectStateAssets(){
    const found=[];
    const seen=new Set();
    const root=(window.KFTP && window.KFTP.state) || {};
    function walk(v,path){
      if(v==null) return;
      if(typeof v==='string'){
        if(looksLikeAssetString(v)){
          const u=absolutize(v);
          if(u && !seen.has(u)){seen.add(u);found.push({url:u,source:'planner state',field:path});}
        }
        return;
      }
      if(Array.isArray(v)){ v.forEach((x,i)=>walk(x, path+'['+i+']')); return; }
      if(typeof v==='object'){
        Object.keys(v).slice(0,250).forEach(k=>walk(v[k], path?path+'.'+k:k));
      }
    }
    walk(root,'state');
    return found;
  }
  function collectDomAssets(){
    const out=[], seen=new Set();
    document.querySelectorAll('img').forEach((img,i)=>{
      const u=absolutize(img.currentSrc || img.src || img.getAttribute('src'));
      if(u && !seen.has(u)){seen.add(u);out.push({url:u,source:'DOM <img>',field:img.alt||('#img'+i)});}
    });
    document.querySelectorAll('*').forEach((el,i)=>{
      const bg=getComputedStyle(el).backgroundImage || '';
      const matches=[...bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      matches.forEach((m,j)=>{
        const u=absolutize(m[1]);
        if(u && !seen.has(u)){seen.add(u);out.push({url:u,source:'CSS background',field:(el.id?('#'+el.id):el.className||el.tagName)+'['+i+':'+j+']'});}
      });
    });
    return out;
  }
  function collectAssetCandidates(){
    const base=CRITICAL_PUBLIC_ASSETS.map(u=>({url:absolutize(u),source:'critical public asset',field:u}));
    const combined=[...base, ...collectDomAssets(), ...collectStateAssets()];
    const seen=new Set();
    return combined.filter(x=>{
      if(!x.url || seen.has(x.url)) return false;
      seen.add(x.url);
      return true;
    }).slice(0,250);
  }
  function testImageAsset(item){
    return new Promise(resolve=>{
      const url=item.url;
      if(url.startsWith('data:image/')) return resolve({...item,status:'ok',detail:'Inline data image.'});
      if(url.startsWith('blob:')) return resolve({...item,status:'warn',detail:'Temporary browser blob URL; cannot verify after reload.'});
      const img=new Image();
      let done=false;
      const finish=(status,detail)=>{ if(done) return; done=true; resolve({...item,status,detail}); };
      const timer=setTimeout(()=>finish('blocked','Timed out or blocked by remote server/CORS.'),7000);
      img.onload=()=>{clearTimeout(timer);finish('ok','Image loaded.');};
      img.onerror=async()=>{
        clearTimeout(timer);
        try{
          const res=await fetch(url,{method:'HEAD',cache:'no-store'});
          if(res.ok) finish('ok','File responds to HEAD but browser image load failed.');
          else finish('missing','HTTP '+res.status+' '+res.statusText);
        }catch(e){
          finish('missing','Image failed to load. '+(e.message||''));
        }
      };
      img.src=url+(url.includes('?')?'&':'?')+'diag='+Date.now();
    });
  }
  async function inspectStorageReadiness(ctx){
    const client=ctx.client;
    const rows=[];
    for(const b of EXPECTED_STORAGE_BUCKETS){
      try{
        const {data,error}=await client.storage.from(b.id).list('',{limit:1});
        if(error){
          const msg=error.message||String(error);
          rows.push({bucket:b.id,status:msg.toLowerCase().includes('not found')?'missing':'blocked',detail:msg,note:b.note});
        }else{
          rows.push({bucket:b.id,status:'ok',detail:'Bucket reachable from current Supabase session. '+((data||[]).length)+' top-level item(s) visible.',note:b.note});
        }
      }catch(e){
        rows.push({bucket:b.id,status:'blocked',detail:e.message||String(e),note:b.note});
      }
    }
    return rows;
  }
  async function inspectAssetFilesTable(ctx){
    try{
      const {data,error}=await ctx.db().from('asset_files').select('id,bucket,storage_path,asset_kind,display_name,created_at').order('created_at',{ascending:false}).limit(25);
      if(error) return {status:'missing',rows:[],detail:error.message};
      return {status:'ok',rows:data||[],detail:'asset_files table reachable.'};
    }catch(e){
      return {status:'missing',rows:[],detail:e.message||String(e)};
    }
  }
  async function runAssetDiagnostics(ctx){
    if(!ctx || !ctx.client || !ctx.db) throw new Error('Asset diagnostics needs the active Supabase bridge context.');
    injectStyles();
    if(ctx.setCloudStatus) ctx.setCloudStatus('warn','Running asset diagnostics...');
    const candidates=collectAssetCandidates();
    const old=document.getElementById('assetDiagModal'); if(old) old.remove();
    const modal=document.createElement('div');
    modal.id='assetDiagModal';
    modal.className='assetDiagWrap';
    modal.innerHTML=`<div class="assetDiag"><div class="assetDiagHead"><div><h2>Asset Diagnostics</h2><div class="muted">Checking public GitHub assets, visible page images, planner-state image references, Supabase Storage buckets, and <code>app.asset_files</code>.</div></div><button class="closeDiag" id="assetDiagClose">Close</button></div><div id="assetDiagBody"><div class="diagBox">Running checks…</div></div></div>`;
    document.body.appendChild(modal);
    document.getElementById('assetDiagClose').onclick=()=>modal.remove();
    const body=document.getElementById('assetDiagBody');
    const tested=[];
    for(const item of candidates){
      tested.push(await testImageAsset(item));
      body.innerHTML=`<div class="diagBox">Checked ${tested.length} of ${candidates.length} assets…</div>`;
    }
    const storageRows=await inspectStorageReadiness(ctx);
    const assetTable=await inspectAssetFilesTable(ctx);
    const counts=tested.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a;},{});
    const storageCounts=storageRows.reduce((a,x)=>{a[x.status]=(a[x.status]||0)+1;return a;},{});
    if(ctx.setCloudStatus) ctx.setCloudStatus((counts.missing||storageCounts.missing)?'err':'ok',`Assets checked: ${counts.ok||0} OK, ${counts.missing||0} missing`);
    const assetHtml=tested.map(x=>`<tr><td class="${esc(x.status)}">${esc(x.status)}</td><td>${esc(x.source)}</td><td><code>${esc(x.field||'')}</code></td><td><code>${esc(x.url)}</code></td><td>${esc(x.detail||'')}</td></tr>`).join('');
    const bucketHtml=storageRows.map(x=>`<tr><td class="${esc(x.status)}">${esc(x.status)}</td><td><code>${esc(x.bucket)}</code></td><td>${esc(x.detail)}</td><td>${esc(x.note)}</td></tr>`).join('');
    const tableHtml=(assetTable.rows||[]).map(x=>`<tr><td>${esc(x.asset_kind)}</td><td><code>${esc(x.bucket)}</code></td><td><code>${esc(x.storage_path)}</code></td><td>${esc(x.display_name||'')}</td></tr>`).join('') || `<tr><td colspan="4" class="${assetTable.status==='ok'?'warn':'missing'}">${esc(assetTable.detail||'No asset records found yet.')}</td></tr>`;
    body.innerHTML=`
      <div class="diagBox"><b>Summary:</b> ${candidates.length} candidate image/file references checked. Public asset results: <b>${counts.ok||0}</b> OK, <b>${counts.warn||0}</b> warning, <b>${counts.blocked||0}</b> blocked/timeout, <b>${counts.missing||0}</b> missing. Storage: <b>${storageCounts.ok||0}</b> reachable, <b>${storageCounts.blocked||0}</b> blocked by policy, <b>${storageCounts.missing||0}</b> missing.</div>
      <h3>Supabase Storage readiness</h3><div class="diagScroll"><table><thead><tr><th>Status</th><th>Bucket</th><th>Detail</th><th>Purpose</th></tr></thead><tbody>${bucketHtml}</tbody></table></div>
      <h3>app.asset_files metadata</h3><div class="diagScroll"><table><thead><tr><th>Kind</th><th>Bucket</th><th>Path</th><th>Display name</th></tr></thead><tbody>${tableHtml}</tbody></table></div>
      <h3>Public/page image checks</h3><div class="diagScroll"><table><thead><tr><th>Status</th><th>Source</th><th>Field</th><th>URL</th><th>Detail</th></tr></thead><tbody>${assetHtml}</tbody></table></div>`;
    if(ctx.logAudit) await ctx.logAudit('asset_diagnostics','Ran asset diagnostics: '+JSON.stringify({assets:counts,storage:storageCounts,asset_files:assetTable.status}));
    return {assets:counts,storage:storageCounts,asset_files:assetTable.status};
  }
  window.KFTP_ASSETS={runAssetDiagnostics,collectAssetCandidates,EXPECTED_STORAGE_BUCKETS};
})();
