async function loadSettings(){
  const r = await fetch('/api/settings');
  const d = await r.json();
  if(!d.success) throw new Error(d.error||'加载设置失败');
  return d.settings||{};
}

function setText(id,text,isError){
  const el=document.getElementById(id);
  if(!el) return;
  el.textContent=text||'';
  el.style.color=isError?'#d93025':'#477F8A';
}

function syncThemeButtons(theme){
  document.querySelectorAll('.theme-btn').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.theme===theme);
  });
}

function applyTheme(theme){
  var localBody=document.body;
  if(localBody) localBody.classList.toggle('dark',theme==='dark');
  try{
    var parentBody=window.parent&&window.parent.document?window.parent.document.body:null;
    if(parentBody) parentBody.classList.toggle('dark',theme==='dark');
  }catch(e){}
}

function applySiteProfile(settings){
  var profile=(settings&&settings.profile)||{};
  var username=profile.username||'江月';
  var siteTitle=profile.siteTitle||(username+'的笔记网站');
  var input=document.getElementById('usernameInput');
  if(input) input.value=username;
  document.title='设置 - '+siteTitle;
  try{
    var parentDoc=window.parent&&window.parent.document;
    if(parentDoc){
      parentDoc.title=siteTitle;
      var brand=parentDoc.getElementById('siteBrand');
      if(brand){
        brand.innerHTML='<i class="bi bi-journal-text"></i> '+siteTitle;
      }
    }
  }catch(e){}
}

function escapeHtml(s){
  return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatReportList(items, mapper){
  if(!items||!items.length) return '';
  return '<div style="margin-top:10px;display:grid;gap:8px">'+items.map(mapper).join('')+'</div>';
}

async function initSettingsPage(){
  try{
    const settings=await loadSettings();
    applySiteProfile(settings);
    document.getElementById('authEnabled').checked=!!(settings.auth&&settings.auth.enabled);
    var theme=(settings.appearance&&settings.appearance.theme)||'light';
    syncThemeButtons(theme);
    applyTheme(theme);
    if(settings.auth&&settings.auth.updatedAt){
      setText('authResult','上次更新：'+settings.auth.updatedAt.replace('T',' ').replace(/\.\d+Z?$/,''));
    }
  }catch(e){
    setText('authResult',e.message,true);
  }

  document.getElementById('saveUsernameBtn').onclick=async function(){
    const username=(document.getElementById('usernameInput').value||'').trim();
    try{
      const r=await fetch('/api/settings/profile',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username})
      });
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'保存失败');
      applySiteProfile(d.settings||{});
      setText('profileResult','用户名已更新');
      try{ localStorage.setItem('liruibiji_site_title',((d.settings||{}).profile||{}).siteTitle||''); }catch(e){}
    }catch(e){
      setText('profileResult',e.message,true);
    }
  };

  document.getElementById('savePasswordBtn').onclick=async function(){
    const enabled=document.getElementById('authEnabled').checked;
    const password=document.getElementById('authPassword').value||'';
    const confirmPassword=document.getElementById('authPassword2').value||'';
    try{
      const r=await fetch('/api/settings/password',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({enabled,password,confirmPassword})
      });
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'保存失败');
      document.getElementById('authPassword').value='';
      document.getElementById('authPassword2').value='';
      setText('authResult',enabled?'访问密码已保存并启用':'访问密码已关闭');
    }catch(e){
      setText('authResult',e.message,true);
    }
  };

  document.getElementById('logoutBtn').onclick=async function(){
    try{
      await fetch('/api/auth/logout',{method:'POST'});
      setText('authResult','已退出登录');
    }catch(e){
      setText('authResult',e.message,true);
    }
  };

  document.querySelectorAll('.theme-btn').forEach(btn=>{
    btn.onclick=async function(){
      try{
        const theme=this.dataset.theme||'light';
        const r=await fetch('/api/settings/appearance',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({theme})
        });
        const d=await r.json();
        if(!d.success) throw new Error(d.error||'保存失败');
        syncThemeButtons(theme);
        applyTheme(theme);
        try{ localStorage.setItem('liruibiji_theme',theme); }catch(e){}
        setText('themeResult','已切换为：'+(theme==='dark'?'深色':'浅色'));
      }catch(e){
        setText('themeResult',e.message,true);
      }
    };
  });

  document.getElementById('scanLinksBtn').onclick=async function(){
    const box=document.getElementById('wikiLinksResult');
    box.textContent='检查中...';
    try{
      const r=await fetch('/api/settings/wiki-links/check');
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'检查失败');
      const report=d.report||{};
      box.innerHTML='失效双链：'+(report.total||0)+' 项；可自动修复：'+(report.repairable||0)+' 项；需人工处理：'+(report.missing||0)+' 项'
        + formatReportList((report.issues||[]).slice(0,50), function(it){
          return '<div style="padding:8px 10px;border:1px solid #dbe2ea;border-radius:8px;background:rgba(255,255,255,.55)">'
            + '<div style="font-weight:700;color:#0f172a">'+escapeHtml(it.source)+'</div>'
            + '<div style="margin-top:4px;color:#64748b">链接：'+escapeHtml(it.raw)+'</div>'
            + '<div style="margin-top:4px;color:'+(it.candidate?'#0969da':'#d93025')+'">'+escapeHtml(it.candidate?('建议修复为：'+it.candidate):'未找到唯一目标')+'</div>'
            + '</div>';
        });
    }catch(e){
      box.textContent=e.message;
    }
  };

  document.getElementById('repairLinksBtn').onclick=async function(){
    const box=document.getElementById('wikiLinksResult');
    box.textContent='修复中...';
    try{
      const r=await fetch('/api/settings/wiki-links/repair',{method:'POST'});
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'修复失败');
      box.textContent='已自动修复 '+(d.fixed||0)+' 处双链。剩余失效：'+(((d.report||{}).total)||0)+' 项';
    }catch(e){
      box.textContent=e.message;
    }
  };

  document.getElementById('scanAssetsBtn').onclick=async function(){
    const box=document.getElementById('assetsResult');
    box.textContent='扫描中...';
    try{
      const r=await fetch('/api/settings/assets/scan');
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'扫描失败');
      box.innerHTML='附件总数：'+(d.totalAssets||0)+'；已引用：'+(d.referencedAssets||0)+'；无引用：'+(d.unusedCount||0)
        + formatReportList((d.unused||[]).slice(0,80), function(it){
          return '<div style="padding:7px 10px;border:1px solid #dbe2ea;border-radius:8px;background:rgba(255,255,255,.55);word-break:break-word">'+escapeHtml(it.relativePath)+'</div>';
        });
    }catch(e){
      box.textContent=e.message;
    }
  };

  document.getElementById('cleanAssetsBtn').onclick=async function(){
    const box=document.getElementById('assetsResult');
    box.textContent='清理中...';
    try{
      const r=await fetch('/api/settings/assets/cleanup',{method:'POST'});
      const d=await r.json();
      if(!d.success) throw new Error(d.error||'清理失败');
      box.textContent='已移入回收站：'+(d.moved||0)+' 个附件；当前剩余无引用附件：'+((((d.report||{}).unusedCount)||0));
    }catch(e){
      box.textContent=e.message;
    }
  };
}

document.addEventListener('DOMContentLoaded',initSettingsPage);
