var esc=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
var curToday=[],curOther=[],curRem=[],todayFilter='undone',otherFilter='undone',remFilter='undone'
var todayToggling=false,otherToggling=false,remToggling=false
var wbScrollLockCount=0
async function loadWorkbenchTheme(){
  try{
    var r=await fetch('/api/settings/public');
    var d=await r.json();
    var theme=((d.settings||{}).appearance||{}).theme||'light';
    document.body.classList.toggle('dark',theme==='dark');
    try{
      if(window.parent&&window.parent!==window&&window.parent.document&&window.parent.document.body){
        window.parent.document.body.classList.toggle('dark',theme==='dark');
      }
    }catch(e){}
  }catch(e){}
}
function setWorkbenchScrollLock(locked){
  wbScrollLockCount += locked ? 1 : -1
  if(wbScrollLockCount<0) wbScrollLockCount=0
  var on=wbScrollLockCount>0
  document.documentElement.classList.toggle('page-scroll-lock',on)
  document.body.classList.toggle('page-scroll-lock',on)
  try{
    if(window.parent&&window.parent!==window&&typeof window.parent.setPageScrollLock==='function'){
      window.parent.setPageScrollLock(!!on,'workbenchModal')
    }
  }catch(e){}
}
function openTaskFile(file){
  var rel=String(file||'');
  var url='/system/tasks/'+encodeURIComponent(rel.split('/').pop()||rel);
  try{
    if(window.parent&&window.parent!==window&&typeof window.parent.openFromWorkbench==='function'){
      var name=rel.split('/').pop()||rel;
      window.parent.openFromWorkbench(name,rel);
      return false;
    }
    if(window.parent&&window.parent!==window&&typeof window.parent.viewFile==='function'){
      var name=rel.split('/').pop()||rel;
      window.parent.viewFile(name,rel);
      return false;
    }
    if(window.parent&&window.parent!==window&&typeof window.parent.navPush==='function'){
      window.parent.navPush(url);
      return false;
    }
  }catch(e){}
  try{
    if(window.top&&window.top!==window){
      window.top.location.href='/?view='+encodeURIComponent(rel);
      return false;
    }
  }catch(e){}
  location.href='/?view='+encodeURIComponent(rel);
  return false;
}

function escAttr(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatTaskFileLabel(file){
  var rel=String(file||'').replace(/\\/g,'/');
  if(rel.indexOf('__system__/任务管理/')===0){
    return '系统/' + (rel.split('/').pop()||rel);
  }
  return rel;
}

function callParent(fnName){
  try{
    if(window.parent&&window.parent!==window&&typeof window.parent[fnName]==='function') return window.parent[fnName].bind(window.parent);
  }catch(e){}
  return null;
}

async function ensureTaskPage(kind){
  var api = kind==='today' ? '/api/tasks/today/ensure' : '/api/tasks/reminders/ensure';
  var res = await fetch(api,{method:'POST'});
  var data = await res.json();
  if(!data.success) throw new Error(data.error||'创建失败');
  return data.path;
}

function openArticlePath(file){
  var openNav = callParent('navPush');
  var url='/system/tasks/'+encodeURIComponent(file.split('/').pop()||file);
  if(openNav){ openNav(url); return; }
  try{
    if(window.top&&window.top!==window){
      window.top.location.href='/?view='+encodeURIComponent(file);
      return;
    }
  }catch(e){}
  location.href='/?view='+encodeURIComponent(file);
}

function openRootList(){
  var openDir = callParent('loadDir');
  if(openDir){ openDir(''); return; }
  location.href='/?list=root';
}

function openClipArticle(){
  var modal=document.getElementById('clipArticleModal');
  var list=document.getElementById('clipDirList');
  var saveBtn=document.getElementById('clipSaveBtn');
  if(!modal||!list||!saveBtn) return;
  modal.style.display='flex';
  setWorkbenchScrollLock(true);
  document.getElementById('clipUrlInput').value='';
  document.getElementById('clipPreviewBox').innerHTML='请输入链接并点击“预览内容”';
  saveBtn.disabled=true;
  window._clipSelectedDir=null;
  window._clipPreviewData=null;
  list.innerHTML='<div class="wb-dir-item">加载中...</div>';
  fetch('/api/dirs').then(function(r){return r.json()}).then(function(dirs){
    list.innerHTML='';
    var items=[{name:'根目录',path:''}];
    function walk(arr,prefix){
      (arr||[]).forEach(function(it){
        items.push({name:(prefix?prefix+' / ':'')+it.name,path:it.path});
        if(it.children&&it.children.length) walk(it.children,(prefix?prefix+' / ':'')+it.name);
      });
    }
    walk(dirs,'');
    items.forEach(function(it){
      var div=document.createElement('div');
      div.className='wb-dir-item';
      div.innerHTML='<div>'+esc(it.name)+'</div><div class="wb-dir-path">'+esc(it.path||'/')+'</div>';
      div.onclick=function(){
        Array.from(list.children).forEach(function(x){x.classList.remove('active');});
        div.classList.add('active');
        window._clipSelectedDir=it.path||'';
        saveBtn.disabled=!window._clipPreviewData;
      };
      list.appendChild(div);
    });
  }).catch(function(){
    list.innerHTML='<div class="wb-dir-item">目录加载失败</div>';
  });
}

function closeClipArticleModal(){
  var modal=document.getElementById('clipArticleModal');
  if(modal) modal.style.display='none';
  setWorkbenchScrollLock(false);
}

function renderClipPreview(data){
  var box=document.getElementById('clipPreviewBox');
  if(!box) return;
  if(!data){
    box.innerHTML='请输入链接并点击“预览内容”';
    return;
  }
  box.innerHTML=''
    + '<div class="wb-preview-meta">'
    +   '<div class="wb-preview-title">'+esc(data.title||'未命名文章')+'</div>'
    +   '<div>来源：'+esc(data.siteName||'未知来源')+'</div>'
    +   (data.author?'<div>作者：'+esc(data.author)+'</div>':'')
    +   (data.publishedAt?'<div>发布时间：'+esc(data.publishedAt)+'</div>':'')
    +   '<div style="margin-top:6px;color:#477F8A;word-break:break-all">'+esc(data.url||'')+'</div>'
    + '</div>'
    + '<div class="wb-preview-content">'+esc((data.markdown||'').slice(0,3000))+(data.markdown&&data.markdown.length>3000?'\n\n……':'' )+'</div>';
}

function previewClipArticle(){
  var url=(document.getElementById('clipUrlInput').value||'').trim();
  var box=document.getElementById('clipPreviewBox');
  if(!url){ alert('请输入文章链接'); return; }
  box.innerHTML='正在提取内容，请稍候...';
  fetch('/api/clip/preview',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url:url})
  }).then(function(r){return r.json()}).then(function(d){
    if(!d.success){ throw new Error(d.error||'提取失败'); }
    window._clipPreviewData=d;
    renderClipPreview(d);
    document.getElementById('clipSaveBtn').disabled=!window._clipPreviewData || window._clipSelectedDir===null;
  }).catch(function(e){
    window._clipPreviewData=null;
    box.innerHTML='<div style="color:#dc2626">提取失败：'+esc(e.message)+'</div>';
    document.getElementById('clipSaveBtn').disabled=true;
  });
}

function saveClipArticle(){
  var url=(document.getElementById('clipUrlInput').value||'').trim();
  if(!url){ alert('请输入文章链接'); return; }
  if(window._clipSelectedDir===undefined||window._clipSelectedDir===null){ alert('请选择目录'); return; }
  var btn=document.getElementById('clipSaveBtn');
  btn.disabled=true;
  btn.textContent='收录中...';
  fetch('/api/clip/save',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({url:url,dir:window._clipSelectedDir||''})
  }).then(function(r){return r.json()}).then(function(d){
    if(!d.success) throw new Error(d.error||'收录失败');
    closeClipArticleModal();
    try{
      if(window.parent&&window.parent!==window&&typeof window.parent.loadDir==='function'){
        window.parent.loadDir(window._clipSelectedDir||'');
      }
      if(window.parent&&window.parent!==window&&typeof window.parent.viewFile==='function'){
        window.parent.viewFile(d.title,d.path);
      }
    }catch(e){}
    alert('收录成功：'+d.title);
  }).catch(function(e){
    alert('收录失败：'+e.message);
  }).finally(function(){
    btn.textContent='收录到此';
    btn.disabled=!window._clipPreviewData;
  });
}

function openNewNote(){
  openNewNoteDirPicker();
}

function openNewNoteDirPicker(){
  var modal=document.getElementById('newNoteModal');
  var list=document.getElementById('newNoteDirList');
  var confirm=document.getElementById('newNoteConfirm');
  if(!modal||!list||!confirm) return;
  modal.style.display='flex';
  setWorkbenchScrollLock(true);
  list.innerHTML='<div class="wb-dir-item">加载中...</div>';
  confirm.disabled=true;
  window._selectedNewNoteDir='';
  fetch('/api/dirs').then(function(r){return r.json()}).then(function(dirs){
    list.innerHTML='';
    var items=[{name:'根目录',path:''}];
    function walk(arr,prefix){
      (arr||[]).forEach(function(it){
        items.push({name:(prefix?prefix+' / ':'')+it.name,path:it.path});
        if(it.children&&it.children.length) walk(it.children,(prefix?prefix+' / ':'')+it.name);
      });
    }
    walk(dirs,'');
    items.forEach(function(it){
      var div=document.createElement('div');
      div.className='wb-dir-item';
      div.innerHTML='<div>'+esc(it.name)+'</div><div class="wb-dir-path">'+esc(it.path||'/')+'</div>';
      div.onclick=function(){
        Array.from(list.children).forEach(function(x){x.classList.remove('active');});
        div.classList.add('active');
        window._selectedNewNoteDir=it.path||'';
        confirm.disabled=false;
      };
      list.appendChild(div);
    });
  }).catch(function(){
    list.innerHTML='<div class="wb-dir-item">目录加载失败</div>';
  });
}
function notifyResize(){
  try{}catch(e){}
}

function syncBadges(){
  fetch('/api/tasks/reminders').then(function(d){return d.json()}).then(function(d){
    var count=d.tasks.filter(function(t){return!t.done}).length
    document.getElementById('remBadge').textContent=count
  }).catch(function(e){console.error("提醒角标加载失败:",e)})
  fetch('/api/tasks/other').then(function(d){return d.json()}).then(function(d){
    document.getElementById('otherBadge').textContent=d.tasks.filter(function(t){return!t.done}).length
  }).catch(function(e){console.error("其他待办角标加载失败:",e)})
}

var syncChannel=new BroadcastChannel('task-sync')
syncChannel.onmessage=function(e){if(e.data==='refresh'){loadToday();loadOther();loadRem()}}

document.addEventListener('DOMContentLoaded',function(){
  loadWorkbenchTheme();
  var btnNewNote=document.getElementById('btnNewNote');
  var btnClipArticle=document.getElementById('btnClipArticle');
  var btnTodayTasks=document.getElementById('btnTodayTasks');
  var btnReminders=document.getElementById('btnReminders');
  var newNoteModal=document.getElementById('newNoteModal');
  var newNoteClose=document.getElementById('newNoteModalClose');
  var newNoteCancel=document.getElementById('newNoteCancel');
  var newNoteConfirm=document.getElementById('newNoteConfirm');
  var clipArticleModal=document.getElementById('clipArticleModal');
  var clipArticleClose=document.getElementById('clipArticleClose');
  var clipCancelBtn=document.getElementById('clipCancelBtn');
  var clipPreviewBtn=document.getElementById('clipPreviewBtn');
  var clipSaveBtn=document.getElementById('clipSaveBtn');
  if(btnNewNote) btnNewNote.onclick=function(){ openNewNote(); };
  if(btnClipArticle) btnClipArticle.onclick=function(){ openClipArticle(); };
  if(btnTodayTasks) btnTodayTasks.onclick=async function(){
    try{ var p=await ensureTaskPage('today'); openArticlePath(p); }catch(e){ alert('打开今日任务失败: '+e.message); }
  };
  if(btnReminders) btnReminders.onclick=async function(){
    try{ var p=await ensureTaskPage('reminders'); openArticlePath(p); }catch(e){ alert('打开提醒事项失败: '+e.message); }
  };
  function closeNewNoteModal(){ if(newNoteModal) newNoteModal.style.display='none'; setWorkbenchScrollLock(false); }
  if(newNoteClose) newNoteClose.onclick=closeNewNoteModal;
  if(newNoteCancel) newNoteCancel.onclick=closeNewNoteModal;
  if(newNoteModal) newNoteModal.onclick=function(e){ if(e.target===newNoteModal) closeNewNoteModal(); };
  if(clipArticleClose) clipArticleClose.onclick=closeClipArticleModal;
  if(clipCancelBtn) clipCancelBtn.onclick=closeClipArticleModal;
  if(clipPreviewBtn) clipPreviewBtn.onclick=previewClipArticle;
  if(clipSaveBtn) clipSaveBtn.onclick=saveClipArticle;
  if(clipArticleModal) clipArticleModal.onclick=function(e){ if(e.target===clipArticleModal) closeClipArticleModal(); };
  if(newNoteConfirm) newNoteConfirm.onclick=function(){
    var fn = callParent('newFile');
    if(fn){ fn(window._selectedNewNoteDir||''); closeNewNoteModal(); return; }
  };
  loadToday();loadOther();loadRem()
  document.getElementById('todayTabs').addEventListener('click',function(e){
    if(!e.target.classList.contains('tab'))return
    todayFilter=e.target.dataset.filter
    document.querySelectorAll('#todayTabs .tab').forEach(function(t){t.classList.toggle('active',t.dataset.filter===todayFilter)})
    renderToday()
  })
  document.getElementById('otherTabs').addEventListener('click',function(e){
    if(!e.target.classList.contains('tab'))return
    otherFilter=e.target.dataset.filter
    document.querySelectorAll('#otherTabs .tab').forEach(function(t){t.classList.toggle('active',t.dataset.filter===otherFilter)})
    renderOther()
  })
  document.getElementById('remTabs').addEventListener('click',function(e){
    if(!e.target.classList.contains('tab'))return
    remFilter=e.target.dataset.filter
    document.querySelectorAll('#remTabs .tab').forEach(function(t){t.classList.toggle('active',t.dataset.filter===remFilter)})
    renderRem()
  })
})

async function loadToday(){try{var d=await(await fetch('/api/tasks/today')).json();curToday=d.tasks||[];renderToday();notifyResize()}catch(e){document.getElementById('todayList').innerHTML='<div class="empty-s">加载失败</div>'}}

function renderToday(){
  var L=document.getElementById('todayList'),B=document.getElementById('todayBadge')
  var all=curToday,undone=all.filter(function(t){return!t.done}),done=all.filter(function(t){return t.done})
  B.textContent=undone.length
  var list=todayFilter==='done'?done:undone
  if(list.length===0){L.innerHTML='<div class="empty-s">'+(todayFilter==='done'?'暂无已完成任务':'今日任务全部完成 🎉')+'</div>';return}
  L.innerHTML=''
  list.forEach(function(t){
    var div=document.createElement('div');div.className='task-row'
    div.dataset.raw64=btoa(encodeURIComponent(t.raw));div.dataset.file=t.file
    div.innerHTML='<div class="tc'+(t.done?' chk':'')+'"></div><div class="tt'+(t.done?' done':'')+'">'+esc(t.text)+' <a class="tf task-file-link" data-file="'+escAttr(t.file)+'" href="javascript:void(0)">📋'+esc(formatTaskFileLabel(t.file))+'</a></div>'
    div.addEventListener('click',function(e){
      if(e.target.tagName==='A')return
      var fn={today:toggleToday,other:toggleOther,rem:toggleRem}[this.closest('[id$=List]').id.replace('List','')]
      if(fn)fn.call(this,e)
    })
    var link=div.querySelector('.task-file-link');
    if(link) link.addEventListener('click',function(e){ e.stopPropagation(); openTaskFile(this.dataset.file); });
    L.appendChild(div)
  })
}

async function toggleToday(e){
  if(todayToggling)return;todayToggling=true
  var row=e.currentTarget,file=row.dataset.file,raw64=row.dataset.raw64,raw=decodeURIComponent(atob(raw64))
  var newRaw=/\[x\]/i.test(raw)?raw.replace(/\[x\]/i,'[ ]'):raw.replace('[ ]','[x]')
  try{
    var r=await fetch('/api/tasks/today/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:file,raw:newRaw})})
    if(r.ok){
      for(var i=0;i<curToday.length;i++){if(curToday[i].file===file&&curToday[i].raw===raw){curToday[i].done=newRaw.includes('[x]');curToday[i].raw=newRaw;break}}
      if(newRaw.includes('[x]')&&i<curToday.length){var item=curToday.splice(i,1)[0];curToday.unshift(item)}
      renderToday();notifyResize();syncBadges();syncChannel.postMessage('refresh')
    }
  }catch(e){console.error("今日任务保存失败:",e)}
  todayToggling=false
}

async function loadOther(){try{var d=await(await fetch('/api/tasks/other')).json();curOther=d.tasks||[];renderOther();notifyResize()}catch(e){document.getElementById('otherList').innerHTML='<div class="empty-s">加载失败</div>'}}

function renderOther(){
  var L=document.getElementById('otherList'),B=document.getElementById('otherBadge')
  var all=curOther,undone=all.filter(function(t){return!t.done}),done=all.filter(function(t){return t.done})
  B.textContent=undone.length
  var list=otherFilter==='done'?done:undone
  if(list.length===0){L.innerHTML='<div class="empty-s">'+(otherFilter==='done'?'暂无已完成任务':'没有其他待办')+'</div>';return}
  L.innerHTML=''
  list.slice(0,30).forEach(function(t){
    var due=t.due?'<span class="td">📅 '+t.due+'</span>':''
    var div=document.createElement('div');div.className='task-row'
    div.dataset.raw64=btoa(encodeURIComponent(t.raw));div.dataset.file=t.file
    div.innerHTML='<div class="tc'+(t.done?' chk':'')+'"></div><div class="tt'+(t.done?' done':'')+'">'+esc(t.text)+' <a class="tf task-file-link" data-file="'+escAttr(t.file)+'" href="javascript:void(0)">📋'+esc(formatTaskFileLabel(t.file))+'</a></div>'+due
    div.addEventListener('click',function(e){
      if(e.target.tagName==='A')return
      var fn={today:toggleToday,other:toggleOther,rem:toggleRem}[this.closest('[id$=List]').id.replace('List','')]
      if(fn)fn.call(this,e)
    })
    var link=div.querySelector('.task-file-link');
    if(link) link.addEventListener('click',function(e){ e.stopPropagation(); openTaskFile(this.dataset.file); });
    L.appendChild(div)
  })
  if(list.length>30)L.innerHTML+='<div style="padding:10px 16px;text-align:center;font-size:12px;color:#999;border-top:1px solid #f0f0f0;">还有 '+(list.length-30)+' 项未显示</div>'
}

async function toggleOther(e){
  if(otherToggling)return;otherToggling=true
  var row=e.currentTarget,file=row.dataset.file,raw64=row.dataset.raw64,raw=decodeURIComponent(atob(raw64))
  var newRaw=/\[x\]/i.test(raw)?raw.replace(/\[x\]/i,'[ ]'):raw.replace('[ ]','[x]')
  try{
    var r=await fetch('/api/tasks/other/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:file,raw:newRaw})})
    if(r.ok){
      for(var i=0;i<curOther.length;i++){if(curOther[i].file===file&&curOther[i].raw===raw){curOther[i].done=newRaw.includes('[x]');curOther[i].raw=newRaw;break}}
      if(newRaw.includes('[x]')&&i<curOther.length){var item=curOther.splice(i,1)[0];curOther.unshift(item)}
      renderOther();notifyResize();syncBadges();syncChannel.postMessage('refresh')
    }
  }catch(e){console.error("其他待办保存失败:",e)}
  otherToggling=false
}

async function loadRem(){try{var d=await(await fetch('/api/tasks/reminders')).json();curRem=d.tasks||[];renderRem();notifyResize()}catch(e){document.getElementById('remList').innerHTML='<div class="empty-s">加载失败</div>'}}

function renderRem(){
  var L=document.getElementById('remList'),B=document.getElementById('remBadge')
  var all=curRem,undone=all.filter(function(t){return!t.done}),done=all.filter(function(t){return t.done})
  B.textContent=undone.length
  var list=remFilter==='done'?done:undone
  if(list.length===0){L.innerHTML='<div class="empty-s">'+(remFilter==='done'?'暂无已完成提醒':'没有待处理的提醒')+'</div>';return}
  L.innerHTML=''
  list.forEach(function(t){
    var due=t.due?'<span class="td">📅 '+(t.time?t.due+' '+t.time:t.due)+'</span>':''
    var div=document.createElement('div');div.className='task-row'
    div.dataset.raw64=btoa(encodeURIComponent(t.raw));div.dataset.file=t.file
    div.innerHTML='<div class="tc'+(t.done?' chk':'')+'"></div><div class="tt'+(t.done?' done':'')+'">'+esc(t.text)+' <a class="tf task-file-link" data-file="'+escAttr(t.file)+'" href="javascript:void(0)">📋'+esc(formatTaskFileLabel(t.file))+'</a></div>'+due
    div.addEventListener('click',function(e){
      if(e.target.tagName==='A')return
      var fn={today:toggleToday,other:toggleOther,rem:toggleRem}[this.closest('[id$=List]').id.replace('List','')]
      if(fn)fn.call(this,e)
    })
    var link=div.querySelector('.task-file-link');
    if(link) link.addEventListener('click',function(e){ e.stopPropagation(); openTaskFile(this.dataset.file); });
    L.appendChild(div)
  })
}

var remToggling=false
async function toggleRem(e){
  if(remToggling)return;remToggling=true
  var row=e.currentTarget,file=row.dataset.file,raw64=row.dataset.raw64,raw=decodeURIComponent(atob(raw64))
  var newRaw=/\[x\]/i.test(raw)?raw.replace(/\[x\]/i,'[ ]'):raw.replace('[ ]','[x]')
  try{
    var r=await fetch('/api/tasks/reminders/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:file,raw:newRaw})})
    if(r.ok){
      for(var i=0;i<curRem.length;i++){if(curRem[i].file===file&&curRem[i].raw===raw){curRem[i].done=newRaw.includes('[x]');curRem[i].raw=newRaw;break}}
      if(newRaw.includes('[x]')&&i<curRem.length){var item=curRem.splice(i,1)[0];curRem.unshift(item)}
      renderRem();notifyResize();syncBadges();syncChannel.postMessage('refresh')
    }
  }catch(e){console.error("提醒事项保存失败:",e)}
  remToggling=false
}
