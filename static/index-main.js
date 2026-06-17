var pageMap = {
  renwu: '/system/workbench',
  '今日任务': '/system/tasks/今日任务.html',
  '提醒事项': '/system/tasks/提醒事项.html',
  '每日任务模板': '/system/tasks/每日任务模板.html'
};
var pageTitle = {
  renwu: '工作中心',
  '今日任务': '今日任务',
  '提醒事项': '提醒事项',
  '每日任务模板': '每日任务模板'
};

var _fromFileList=false;
var isNewFileMode=false;
var pendingNewFilePath='';
var mobilePreviewOpen=false;
var pageScrollLockCount=0;
var pageScrollLockFlags={};
var NEW_FILE_PLACEHOLDER='\n\n\n';

function syncPageScrollLockState(){
  var on = pageScrollLockCount > 0;
  document.documentElement.classList.toggle('page-scroll-lock', on);
  document.body.classList.toggle('page-scroll-lock', on);
}

function syncModeBodyState(activeMode){
  document.body.classList.toggle('mode-edit-active', activeMode==='modeEdit');
  document.body.classList.toggle('mode-view-active', activeMode==='modeView');
  document.body.classList.toggle('mode-list-active', activeMode==='modeList');
}

function setPageScrollLock(locked, key){
  if(key){
    var prev=!!pageScrollLockFlags[key];
    var next=!!locked;
    pageScrollLockFlags[key]=next;
    if(prev!==next){
      pageScrollLockCount += next ? 1 : -1;
      if(pageScrollLockCount < 0) pageScrollLockCount = 0;
    }
  }else{
    pageScrollLockCount += locked ? 1 : -1;
    if(pageScrollLockCount < 0) pageScrollLockCount = 0;
  }
  syncPageScrollLockState();
}

function normalizeNavPath(url){
  try{
    return decodeURIComponent(String(url||''));
  }catch(e){
    return String(url||'');
  }
}

function buildViewUrlForPath(filePath){
  var p=String(filePath||'').replace(/\\/g,'/');
  if(p.indexOf('__system__/任务管理/')===0){
    return '/system/tasks/'+encodeURIComponent(p.split('/').pop());
  }
  return '/articles/'+p.split('/').map(function(s){return encodeURIComponent(s)}).join('/');
}

// ── iframe 导航历史 ──
var navStack=['/system/workbench'];
var lastBack=0;

// 从 iframe 内部链接点击触发的导航
function navPush(url){
  var u=normalizeNavPath(url);
  if(navStack[navStack.length-1]!==u) navStack.push(u);
  document.getElementById('viewFrame').src=u;
  document.getElementById('viewTitle').textContent=(u.includes('/system/workbench')||u.includes('renwu'))?'工作中心':u.includes('今日任务')?'今日任务':u.includes('提醒事项')?'提醒事项':u.includes('每日任务模板')?'每日任务模板':decodeURIComponent(u.split('/').pop()||'-');
}

document.getElementById('viewFrame').addEventListener('load',function(){
  try{
    var s=normalizeNavPath(new URL(this.src).pathname);
    // 更新标题
    document.getElementById('viewTitle').textContent=(s.includes('/system/workbench')||s.includes('renwu'))?'工作中心':s.includes('今日任务')?'今日任务':s.includes('提醒事项')?'提醒事项':s.includes('每日任务模板')?'每日任务模板':s.split('/').pop()||'-';
    // 静默导航（返回操作）不记录到 navStack
    if(window.silent){window.silent=false}else if(navStack[navStack.length-1]!==s) navStack.push(s);
    try{
      var f=document.getElementById("viewFrame");
      if(f) f.style.height='100%';
    }catch(e){}
    // 注入导航通知脚本到 iframe，让每个页面加载时通知父窗口
    try{
      var doc=this.contentDocument||this.contentWindow.document;
      var scr=doc.createElement('script');
      scr.textContent='parent.postMessage({nav:window.location.pathname},"*")';
      doc.body.appendChild(scr);
    }catch(e){}
  }catch(e){}
});

// 接收 iframe 子页面的导航通知和高度调整
window.addEventListener("message",function(e){
  if(e.data&&e.data.nav){
    var nav=normalizeNavPath(e.data.nav);
    if(navStack[navStack.length-1]!==nav) navStack.push(nav);
  }
});
function openPage(name){
  if(pageMap[name]){
    _fromFileList=false;
    navStack=[decodeURIComponent(pageMap[name])];
    document.getElementById('viewFrame').src=pageMap[name];
    document.getElementById('viewTitle').textContent=pageTitle[name]||name;
    showMode('modeView');
  }
}

// ── 模式切换 ──
function showMode(id){
  document.querySelectorAll('.mode-view').forEach(function(e){e.classList.toggle('active',e.id===id)});
  syncModeBodyState(id);
}

function isMobileViewport(){
  return window.innerWidth<=768;
}

function syncMobilePreviewButton(){
  var btn=document.getElementById('mobilePreviewBtn');
  if(!btn) return;
  var span=btn.querySelector('span');
  var icon=btn.querySelector('i');
  if(mobilePreviewOpen){
    if(span) span.textContent='关闭预览';
    if(icon) icon.className='bi bi-eye-slash';
  }else{
    if(span) span.textContent='预览';
    if(icon) icon.className='bi bi-eye';
  }
}

function openSettingsPage(){
  _fromFileList=false;
  navStack=['/system/settings'];
  document.getElementById('viewFrame').src='/system/settings';
  document.getElementById('viewTitle').textContent='设置';
  showMode('modeView');
  if(isMobileViewport()) toggleSidebar(false);
}

async function loadThemePreference(){
  try{
    var r=await fetch('/api/settings/public');
    var d=await r.json();
    var settings=d.settings||{};
    var theme=(settings.appearance||{}).theme||'light';
    var siteTitle=(settings.profile||{}).siteTitle||'江月的笔记网站';
    document.body.classList.toggle('dark',theme==='dark');
    document.title=siteTitle;
    var brand=document.getElementById('siteBrand');
    if(brand) brand.innerHTML='<i class="bi bi-journal-text"></i> '+siteTitle;
    try{ localStorage.setItem('liruibiji_theme',theme); }catch(e){}
  }catch(e){
    try{
      var cached=localStorage.getItem('liruibiji_theme')||'light';
      document.body.classList.toggle('dark',cached==='dark');
      var cachedTitle=localStorage.getItem('liruibiji_site_title')||'江月的笔记网站';
      document.title=cachedTitle;
      var brand=document.getElementById('siteBrand');
      if(brand) brand.innerHTML='<i class="bi bi-journal-text"></i> '+cachedTitle;
    }catch(err){}
  }
}

function closeMobilePreview(){
  mobilePreviewOpen=false;
  var mode=document.getElementById('modeEdit');
  if(mode) mode.classList.remove('mobile-preview-open');
  setPageScrollLock(false,'mobilePreview');
  syncPageScrollLockState();
  syncMobilePreviewButton();
}

function openMobilePreview(){
  if(!isMobileViewport()) return;
  mobilePreviewOpen=true;
  var mode=document.getElementById('modeEdit');
  if(mode) mode.classList.add('mobile-preview-open');
  setPageScrollLock(true,'mobilePreview');
  syncMobilePreviewButton();
}

function toggleMobilePreview(){
  if(!isMobileViewport()) return;
  if(mobilePreviewOpen) closeMobilePreview();
  else openMobilePreview();
}

// ── 目录树 ──
var currentDir='',currentFile='',renameTarget='',deleteTarget='';
var dirTreeData={};
var searchMode='notes';
var blurredFileMap={};

function loadBlurredFileMap(){
  try{ blurredFileMap=JSON.parse(localStorage.getItem('liruibiji_blurred_files')||'{}')||{}; }
  catch(e){ blurredFileMap={}; }
}

function saveBlurredFileMap(){
  try{ localStorage.setItem('liruibiji_blurred_files',JSON.stringify(blurredFileMap||{})); }catch(e){}
}

function isFileBlurred(path){
  return !!blurredFileMap[String(path||'')];
}

function toggleFileBlur(path){
  var key=String(path||'');
  if(!key) return;
  if(blurredFileMap[key]) delete blurredFileMap[key];
  else blurredFileMap[key]=true;
  saveBlurredFileMap();
  loadDir(currentDir||'');
}

function toggleSidebar(forceOpen){
  var sidebar=document.querySelector('.sidebar-left');
  var overlay=document.getElementById('sidebarOverlay');
  if(!sidebar||!overlay) return;
  var willOpen=typeof forceOpen==='boolean' ? forceOpen : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open',willOpen);
  overlay.classList.toggle('show',willOpen);
  if(isMobileViewport()) setPageScrollLock(willOpen,'sidebar');
}


function toggleSearch(){
  var sa=document.getElementById("searchArea");
  var dt=document.getElementById("dirTree");
  var ds=document.getElementById("dirTreeStatus");
  if(sa.style.display!="none"){
    sa.style.display="none";
    dt.style.display="";
    if(ds)ds.style.display="";
  }else{
    sa.style.display="block";
    dt.style.display="none";
    if(ds)ds.style.display="none";
    setSearchMode('notes');
    document.getElementById("searchInput").focus();
    document.getElementById("searchResults").innerHTML="";
  }
}

function doSearch(){
  var q=document.getElementById("searchInput").value.trim();
  if(!q){
    if(searchMode==='recycle') return searchRecycle('');
    if(searchMode==='history') return searchHistory('');
    return;
  }
  if(searchMode==='notes') return searchNotes(q);
  if(searchMode==='recycle') return searchRecycle(q);
  if(searchMode==='history') return searchHistory(q);
}

function ensureSearchVisible(){
  var sa=document.getElementById("searchArea");
  var dt=document.getElementById("dirTree");
  var ds=document.getElementById("dirTreeStatus");
  sa.style.display="block";
  dt.style.display="none";
  if(ds)ds.style.display="none";
}

function setSearchMode(mode){
  searchMode=mode||'notes';
  var input=document.getElementById('searchInput');
  var results=document.getElementById('searchResults');
  ['modeBtnNotes','modeBtnRecycle','modeBtnHistory'].forEach(function(id){
    var el=document.getElementById(id);
    if(el) el.classList.remove('active');
  });
  var activeId=searchMode==='recycle'?'modeBtnRecycle':(searchMode==='history'?'modeBtnHistory':'modeBtnNotes');
  var activeBtn=document.getElementById(activeId);
  if(activeBtn) activeBtn.classList.add('active');
  if(!input||!results) return;
  var placeholderMap={
    notes:'搜索全局笔记文章...',
    recycle:'搜索回收站文件...',
    history:'搜索历史版本文件...'
  };
  input.placeholder=placeholderMap[searchMode]||placeholderMap.notes;
  results.innerHTML='';
}

function renderEmptySearch(text, icon){
  document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#999;padding:20px"><i class="bi '+(icon||'bi-search')+'" style="font-size:24px;display:block;margin-bottom:8px"></i>'+text+'</div>';
}

function createResultCard(iconHtml, titleHtml, linesHtml, clickHandler){
  var div=document.createElement('div');
  div.className='result-card';
  if(clickHandler) div.onclick=clickHandler;
  div.innerHTML='<div style="display:flex;align-items:flex-start;gap:8px">'
    + '<div class="result-card-icon">'+iconHtml+'</div>'
    + '<div style="flex:1;min-width:0">'
    +   '<div class="result-card-title">'+titleHtml+'</div>'
    +   linesHtml
    + '</div></div>';
  return div;
}

function searchNotes(q){
  document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#999;padding:10px"><i class="bi bi-hourglass-split"></i> 搜索中...</div>';
  fetch("/api/search?q="+encodeURIComponent(q)).then(function(r){return r.json()}).then(function(data){
    var el=document.getElementById("searchResults");
    el.innerHTML="";
    if(data.files&&data.files.length){
      data.files.forEach(function(f){
        var icon=f.isDir?'<i class="bi bi-folder"></i>':'<i class="bi bi-file-text"></i>';
        var hlName=highlightKw(esc(f.name),f.keyword||q);
        var lines='<div class="result-card-sub">'+esc(f.path)+'</div>';
        if(f.matchType){
          var badgeColor=f.matchType==='content'?'#477F8A':'#34a853';
          lines+='<div style="font-size:11px;color:'+badgeColor+';margin-top:5px">'+(f.matchType==='content'?'📄 内容匹配':'📁 文件名匹配')+'</div>';
        }
        if(f.snippet){
          lines+='<div class="result-card-snippet">'+highlightKw(esc(f.snippet),f.keyword||q)+'</div>';
        }
        var div=createResultCard(icon, hlName, lines, function(){
          if(f.isDir){loadDir(f.dir||'')}else{viewSearchFile(f.name,f.path)}
        });
        el.appendChild(div);
      });
    }else{
      renderEmptySearch('未找到匹配的笔记文章','bi-search');
    }
  }).catch(function(){
    document.getElementById('searchResults').innerHTML='<div style="text-align:center;color:#e74c3c;padding:10px">搜索失败</div>';
  });
}

function showRecycleBin(){
  ensureSearchVisible();
  setSearchMode('recycle');
  document.getElementById("searchInput").focus();
  return searchRecycle(document.getElementById("searchInput").value.trim());
}

function restoreRecycleItem(id){
  if(!id) return;
  fetch('/api/recycle-bin/restore',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id:id})
  }).then(function(r){return r.json()}).then(function(d){
    if(!d.success) throw new Error(d.error||'恢复失败');
    alert('已恢复：'+d.path);
    if(searchMode==='recycle') searchRecycle(document.getElementById('searchInput').value.trim());
    loadDir(currentDir||'');
    loadDirs();
  }).catch(function(e){
    alert('恢复失败：'+e.message);
  });
}

function searchRecycle(q){
  document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#999;padding:10px"><i class="bi bi-hourglass-split"></i> 搜索回收站...</div>';
  fetch('/api/recycle-bin').then(function(r){return r.json()}).then(function(data){
    var el=document.getElementById("searchResults");
    el.innerHTML='';
    var items=((data&&data.items)||[]).filter(function(it){
      var t=(it.name+' '+it.originalPath).toLowerCase();
      return t.indexOf(String(q||'').toLowerCase())!==-1;
    });
    if(!items.length){
      renderEmptySearch(q?'未找到匹配的回收站文件':'回收站为空','bi-trash3');
      return;
    }
    items.forEach(function(it){
      var div=createResultCard(
        '<i class="bi '+(it.isDir?'bi-folder':'bi-file-earmark')+'"></i>',
        highlightKw(esc(it.name),q),
        '<div class="result-card-sub">原路径：'+highlightKw(esc(it.originalPath),q)+'</div>'
        + '<div class="result-card-sub" style="margin-top:4px">删除时间：'+esc(it.deletedAt||'')+'</div>'
        + '<div style="margin-top:8px"><button type="button" style="height:28px;padding:0 10px;border-radius:8px;border:1px solid #cfe0e4;background:#eef6f7;color:#477F8A;font-size:12px;font-weight:700;cursor:pointer" onclick="event.stopPropagation();restoreRecycleItem(\''+escAttr(it.id)+'\')">恢复</button></div>'
      );
      el.appendChild(div);
    });
  }).catch(function(){
    document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#e74c3c;padding:10px">回收站加载失败</div>';
  });
}

function showHistoryVersions(){
  ensureSearchVisible();
  setSearchMode('history');
  document.getElementById("searchInput").focus();
  return searchHistory(document.getElementById("searchInput").value.trim());
}

function searchHistory(q){
  document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#999;padding:10px"><i class="bi bi-hourglass-split"></i> 搜索历史版本...</div>';
  fetch('/api/history/all').then(function(r){return r.json()}).then(function(data){
    var el=document.getElementById("searchResults");
    el.innerHTML='';
    var items=((data&&data.versions)||[]).filter(function(it){
      var t=(it.path+' '+(it.time||it.version||'')).toLowerCase();
      return t.indexOf(String(q||'').toLowerCase())!==-1;
    });
    if(!items.length){
      renderEmptySearch(q?'未找到匹配的历史版本文件':'暂无历史版本','bi-clock-history');
      return;
    }
    items.slice(0,200).forEach(function(it){
      var div=createResultCard(
        '<i class="bi bi-clock-history"></i>',
        highlightKw(esc(it.path),q),
        '<div class="result-card-sub">版本：'+highlightKw(esc(it.time||it.version||''),q)+'</div>',
        function(){
        if(it.path) viewFile(it.path.split('/').pop(), it.path);
      });
      el.appendChild(div);
    });
  }).catch(function(){
    document.getElementById("searchResults").innerHTML='<div style="text-align:center;color:#e74c3c;padding:10px">历史版本加载失败</div>';
  });
}

function highlightKw(text,kw){
  if(!kw)return text;
  var idx=text.toLowerCase().indexOf(kw.toLowerCase());
  if(idx===-1)return text;
  return text.substring(0,idx)+'<mark style="background:#fff3b0;padding:0 2px;border-radius:2px;color:#d63384;font-weight:500">'+text.substring(idx,idx+kw.length)+'</mark>'+text.substring(idx+kw.length);
}

function viewSearchFile(name,path){
  if(window.viewFile) viewFile(name,path);
}

function loadDirs(parent,path){
  fetch('/api/dirs').then(function(r){return r.json()}).then(function(data){
    dirTreeData=data;
    renderDirTree(document.getElementById('dirTree'),data,path||'',true);
  }).catch(function(e){console.error("目录树加载失败:",e)})
}

function renderDirTree(el,nodes,activePath,isRoot){
  var targetEl=el;
  if(isRoot){
    el.innerHTML='<div class="dir-item'+(activePath===''?' active':'')+'" data-path="" onclick="loadDir(\'\')"><i class="bi bi-folder"></i><span class="name">根目录</span></div>';
    var rootWrap=document.createElement('div');
    rootWrap.className='dir-children open root-dir-children';
    el.appendChild(rootWrap);
    targetEl=rootWrap;
  }else el.innerHTML='';
  var items=Array.isArray(nodes)?nodes:(nodes&&nodes.dirs?nodes.dirs:[]);
  items.forEach(function(d){
    var div=document.createElement('div');
    div.className='dir-item'+(activePath===d.path?' active':'');
    div.dataset.path=d.path;
    var hasSub=(d.children&&d.children.length>0);
    var hasFile=(d.files&&d.files.length>0);
    var expandable=hasSub||hasFile;
    var hasActiveChildDir=!!(activePath && d.path && activePath.indexOf(d.path + '/')===0);
    var hasActiveFile=!!(activePath && (d.files||[]).some(function(f){ return f.path===activePath; }));
    var shouldOpen=!!(d._open || hasActiveChildDir || hasActiveFile);
    var arrowIcon=expandable?'▶':'▷';
    var arrowCls='arrow'+(shouldOpen?' expanded':'')+(expandable?'':' no-child');
    div.innerHTML='<span class="'+arrowCls+'">'+arrowIcon+'</span><i class="bi '+(d.hasFiles?'bi-folder-fill':'bi-folder')+'"></i><span class="name">'+esc(d.name)+'</span>';
    div.onclick=function(e){
      if(e.target.classList.contains('arrow')){
        if(e.target.classList.contains('no-child'))return;
        var child=this.nextElementSibling;
        if(child&&child.classList.contains('dir-children')){
          child.classList.toggle('open');
          this.querySelector('.arrow').classList.toggle('expanded');
        }
      }else{
        loadDir(d.path);
      }
    };
    targetEl.appendChild(div);
    if(expandable){
      var childDiv=document.createElement('div');
      childDiv.className='dir-children'+(shouldOpen?' open':'');
      if(d.children&&d.children.length){
        renderDirTree(childDiv,{dirs:d.children},activePath);
      }
      (d.files||[]).forEach(function(f){
        var fileDiv=document.createElement('div');
        fileDiv.className='dir-item tree-file-item'+(activePath===f.path?' active':'');
        fileDiv.dataset.path=f.path;
        fileDiv.innerHTML='<span class="arrow no-child">&gt;</span><i class="bi bi-file-earmark-text"></i><span class="name">'+esc((f.title||f.name||'').replace(/\.html$/i,''))+'</span>';
        fileDiv.onclick=function(e){
          e.stopPropagation();
          viewFile((f.title||f.name||'').replace(/\.html$/i,''),f.path);
        };
        childDiv.appendChild(fileDiv);
      });
      targetEl.appendChild(childDiv);
    }
  });
  if(isRoot){
    var rootFiles=(nodes&&nodes.rootFiles)||[];
    if(rootFiles.length){
      rootFiles.forEach(function(f){
        var fileDiv=document.createElement('div');
        fileDiv.className='dir-item tree-file-item'+(activePath===f.path?' active':'');
        fileDiv.dataset.path=f.path;
        fileDiv.innerHTML='<span class="arrow no-child">&gt;</span><i class="bi bi-file-earmark-text"></i><span class="name">'+esc((f.title||f.name||'').replace(/\.html$/i,''))+'</span>';
        fileDiv.onclick=function(e){
          e.stopPropagation();
          viewFile((f.title||f.name||'').replace(/\.html$/i,''),f.path);
        };
        targetEl.appendChild(fileDiv);
      });
    }
  }
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── 文件列表 ──
function loadDir(dir){
  currentDir=dir||'';
  showMode('modeList');
  // 移动端点击后收起侧栏
  if(window.innerWidth<=768){document.querySelector('.sidebar-left').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('show')}
  document.getElementById('dirTree').querySelectorAll('.dir-item').forEach(function(e){e.classList.remove('active')});
  document.querySelector('#dirTree .dir-item[data-path="'+escAttr(currentDir)+'"]')&&document.querySelector('#dirTree .dir-item[data-path="'+escAttr(currentDir)+'"]').classList.add('active');
  
  fetch('/api/list?dir='+encodeURIComponent(currentDir)).then(function(r){return r.json()}).then(function(data){
    // 从 path 构建面包屑
    var parts=currentDir?currentDir.split('/'):[];
    var bc=[];
    var acc='';
    parts.forEach(function(p){
      acc=acc?(acc+'/'+p):p;
      bc.push({name:p,path:acc});
    });
    renderBreadcrumb(bc);
    if(data.error){document.getElementById('fileList').innerHTML='<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">'+esc(data.error)+'</td></tr>';return}
    renderFileList(data.files||[]);
  }).catch(function(e){console.error('文件列表加载失败:',e);document.getElementById('fileList').innerHTML='<tr><td colspan=5 style="text-align:center;color:#999;padding:20px">加载失败</td></tr>'})
}

function escAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}

function renderBreadcrumb(bc){
  var el=document.getElementById('breadcrumb');
  el.innerHTML="<li class=\"breadcrumb-item\"><a href=\"javascript:void(0)\" id=\"breadcrumbHome\" title=\"首页\" style=\"font-weight:500\">首页</a></li><li class=\"breadcrumb-item\"><a data-path=\"\">根目录</a></li>";
  document.getElementById('breadcrumbHome').onclick=function(){openPage('renwu')};
  el.querySelectorAll('a[data-path]').forEach(function(a){
    a.onclick=function(){loadDir(this.dataset.path)};
  });
  bc.forEach(function(b){
    var li=document.createElement('li');
    li.className='breadcrumb-item'+(b.active?' active':'');
    if(b.active){
      li.textContent=b.name;
    }else{
      var a=document.createElement('a');
      a.textContent=b.name;
      a.dataset.path=b.path;
      a.onclick=function(){loadDir(this.dataset.path)};
      li.appendChild(a);
    }
    el.appendChild(li);
  });
}

function renderFileList(files){
  var tbody=document.getElementById('fileList'),empty=document.getElementById('emptyState');
  var selectAll=document.getElementById('selectAllCheckbox');
  tbody.innerHTML='';
  selectedItems={};
  if(selectAll) selectAll.checked=false;
  if(!files||files.length===0){empty.style.display='flex';document.getElementById('fileTable').style.display='none';return}
  empty.style.display='none';document.getElementById('fileTable').style.display='';
  files.forEach(function(f,i){
    var tr=document.createElement('tr');
    var icon=f.isDir?'<i class="bi bi-folder"></i>':'<i class="bi bi-file-text"></i>';
    var nameClass=f.isDir?'file-name dir-name':'file-name';
    var clickAction=f.isDir?'loadDir(\''+escAttr(f.path)+'\')':'viewFile(\''+escAttr(f.name)+'\',\''+escAttr(f.path)+'\')';
    var blurOn=!f.isDir&&isFileBlurred(f.path);
    var blurClass=blurOn?'file-title-blur':'';
    var blurIcon=blurOn?'bi-eye-slash':'bi-eye';
    var blurTitle=blurOn?'恢复正常显示':'模糊显示标题';
    tr.className='file-row';
    tr.draggable=!f.isDir;
    tr.dataset.path=f.path;
    tr.dataset.name=f.name;
    tr.dataset.isdir=f.isDir?'1':'0';
    tr.innerHTML='<td class="num-col"><input type="checkbox" class="file-item-checkbox"></td>' 
      +'<td><div class="'+nameClass+'" onclick="'+clickAction+'">'+icon+' <span class="'+blurClass+'">'+esc(f.name)+'</span></div></td>'
      +'<td class="size-col">'+(f.size||'-')+'</td>'
      +'<td class="time-col">'+(f.mtime||'-')+'</td>'
      +'<td class="file-actions">'
      +'<a class="btn-link" href="javascript:void(0)" onclick="renameItem(\''+escAttr(f.name)+'\',\''+escAttr(f.path)+'\','+f.isDir+')" title="重命名"><i class="bi bi-pencil"></i></a> '
      +(f.isDir?'':'<a class="btn-link" href="javascript:void(0)" onclick="shareItem(\''+escAttr(f.name)+'\',\''+escAttr(f.path)+'\')" title="分享"><i class="bi bi-share"></i></a> '
      +'<a class="btn-link" href="javascript:void(0)" onclick="toggleFileBlur(\''+escAttr(f.path)+'\')" title="'+blurTitle+'"><i class="bi '+blurIcon+'"></i></a> ')
      +'</td>';
    var checkbox=tr.querySelector('.file-item-checkbox');
    if(checkbox){
      checkbox.onchange=function(){
        toggleFileSelect(f.path,this.checked);
        syncSelectAllCheckbox();
      };
    }
    tbody.appendChild(tr);
  });
}

function toggleFileSelect(path,checked){
  var row=document.querySelector('.file-row[data-path="'+escAttr(path)+'"]');
  if(!row) return;
  if(checked){
    selectedItems[path]={name:row.dataset.name||path.split('/').pop()||path,path:path,isDir:row.dataset.isdir==='1'};
  }else{
    delete selectedItems[path];
  }
}

function getSelectedItems(){
  var rows=document.querySelectorAll('#fileList .file-row');
  var items=[];
  rows.forEach(function(row){
    var checkbox=row.querySelector('.file-item-checkbox');
    if(!checkbox||!checkbox.checked) return;
    items.push({
      name:row.dataset.name||((row.dataset.path||'').split('/').pop()||''),
      path:row.dataset.path||'',
      isDir:row.dataset.isdir==='1'
    });
  });
  return items.filter(function(it){ return !!it.path; });
}

function syncSelectAllCheckbox(){
  var selectAll=document.getElementById('selectAllCheckbox');
  if(!selectAll) return;
  var boxes=Array.from(document.querySelectorAll('#fileList .file-item-checkbox'));
  if(!boxes.length){
    selectAll.checked=false;
    selectAll.indeterminate=false;
    return;
  }
  var checkedCount=boxes.filter(function(box){ return box.checked; }).length;
  selectAll.checked=checkedCount>0 && checkedCount===boxes.length;
  selectAll.indeterminate=checkedCount>0 && checkedCount<boxes.length;
}

function toggleSelectAll(checked){
  var boxes=document.querySelectorAll('#fileList .file-item-checkbox');
  boxes.forEach(function(box){
    box.checked=!!checked;
    var row=box.closest('.file-row');
    if(row&&row.dataset&&row.dataset.path) toggleFileSelect(row.dataset.path,!!checked);
  });
  syncSelectAllCheckbox();
}

function moveSelectedItems(){
  var items=getSelectedItems();
  if(!items.length){ alert('请先勾选要移动的文件或文件夹'); return; }
  if(items.length===1) return moveItem(items[0].name,items[0].path,items[0].isDir);
  return moveItem(items[0].name,items[0].path,items[0].isDir,items);
}

function deleteSelectedItems(){
  var items=getSelectedItems();
  if(!items.length){ alert('请先勾选要删除的文件或文件夹'); return; }
  if(items.length===1) return deleteItem(items[0].name,items[0].path,items[0].isDir);
  deleteTarget={batch:true,items:items};
  document.getElementById('deleteMsg').textContent='确定要删除选中的 '+items.length+' 项吗？';
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

async function copyTextWithFallback(text){
  if(navigator.clipboard && window.isSecureContext){
    await navigator.clipboard.writeText(text);
    return true;
  }
  var ta=document.createElement('textarea');
  ta.value=String(text||'');
  ta.setAttribute('readonly','readonly');
  ta.style.position='fixed';
  ta.style.top='0';
  ta.style.left='-9999px';
  ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0,ta.value.length);
  var ok=false;
  try{ ok=document.execCommand('copy'); }catch(e){ ok=false; }
  document.body.removeChild(ta);
  if(!ok) throw new Error('复制失败');
  return true;
}

async function shareItem(name,path){
  try{
    var r=await fetch('/api/share/create',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:path})
    });
    var d=await r.json();
    if(!d.success) throw new Error(d.error||'生成分享链接失败');
    var url=new URL(buildViewUrlForPath(path), window.location.origin);
    url.searchParams.set('share', d.token);
    await copyTextWithFallback(url.toString());
    alert('分享链接已复制');
  }catch(e){
    alert('分享失败：'+e.message);
  }
}

// ── 查看文件 ──
function viewFile(name,path){
  currentFile=path||name;
  isNewFileMode=false;
  pendingNewFilePath='';
  _fromFileList=true;
  navStack=[buildViewUrlForPath(currentFile)];
  showMode('modeView');
  document.getElementById('viewTitle').textContent=name;
  document.getElementById('viewFrame').src=buildViewUrlForPath(currentFile);
}

function openFromWorkbench(name,path){
  currentFile=path||name;
  isNewFileMode=false;
  pendingNewFilePath='';
  _fromFileList=false;
  navStack=['/system/workbench'];
  showMode('modeView');
  document.getElementById('viewTitle').textContent=name;
  document.getElementById('viewFrame').src=buildViewUrlForPath(currentFile);
}

function backToList(){
  if(Date.now()-lastBack<100)return;
  lastBack=Date.now();
  if(_fromFileList){
    _fromFileList=false;
    showMode('modeList');
    document.getElementById('viewFrame').src='/system/workbench';
  }else if(navStack.length>1){
    navStack.pop(); // 当前页
    var prev=navStack.pop(); // 上一页
    window.silent=true; // 标记为静默导航，load事件不重复记录
    document.getElementById('viewFrame').src=prev;
  }else{
    try{document.getElementById('viewFrame').contentWindow.history.back()}catch(e){}
  }
}

// ── 编辑文件 ──


function isLinePrefixAction(before, after){
  return !after && /^(# |## |### |- |1\. |- \[ \] |> )$/.test(before || '');
}

function applyLinePrefixToText(value, start, end, prefix){
  var from = start;
  var to = end;
  while(from > 0 && value[from-1] !== '\n') from--;
  while(to < value.length && value[to] !== '\n') to++;
  var block = value.slice(from, to);
  var lines = block.split('\n');
  var allHave = lines.every(function(line){ return line.indexOf(prefix) === 0; });
  var next = lines.map(function(line){
    if(!line) return allHave ? line : prefix;
    return allHave ? (line.indexOf(prefix) === 0 ? line.slice(prefix.length) : line) : prefix + line;
  }).join('\n');
  return {
    value: value.slice(0, from) + next + value.slice(to),
    start: from,
    end: from + next.length
  };
}

function getEditorInstance(){
  return window.toastEditor || null;
}

function getEditorMarkdown(){
  var editor=getEditorInstance();
  return editor ? String(editor.getMarkdown() || '') : '';
}

function getEditorSelectionRange(){
  var editor=getEditorInstance();
  if(!editor) return [[1,1],[1,1]];
  var sel=editor.getSelection();
  if(Array.isArray(sel) && Array.isArray(sel[0])) return [sel[0], sel[1] || sel[0]];
  return [[1,1],[1,1]];
}

function normalizeMdPos(pos){
  if(Array.isArray(pos)) return [Math.max(1, pos[0]||1), Math.max(1, pos[1]||1)];
  return [1,1];
}

function compareMdPos(a,b){
  var pa=normalizeMdPos(a);
  var pb=normalizeMdPos(b);
  if(pa[0]!==pb[0]) return pa[0]-pb[0];
  return pa[1]-pb[1];
}

function getOrderedEditorSelectionRange(){
  var range=getEditorSelectionRange();
  return compareMdPos(range[0], range[1])<=0 ? range : [range[1], range[0]];
}

function isCollapsedMdRange(range){
  var ordered=range||getOrderedEditorSelectionRange();
  return compareMdPos(ordered[0], ordered[1])===0;
}

function mdPosToOffset(value, pos){
  pos = normalizeMdPos(pos);
  var line = pos[0], ch = pos[1];
  var lines = String(value||'').split('\n');
  var offset = 0;
  for(var i=1;i<line && i<=lines.length;i++) offset += lines[i-1].length + 1;
  var current = lines[Math.max(0, Math.min(lines.length-1, line-1))] || '';
  offset += Math.max(0, Math.min(current.length, ch-1));
  return offset;
}

function offsetToMdPos(value, offset){
  var src = String(value||'');
  var safe = Math.max(0, Math.min(src.length, offset||0));
  var lines = src.slice(0, safe).split('\n');
  var line = lines.length;
  var ch = (lines[lines.length-1] || '').length + 1;
  return [line, ch];
}

function setEditorSelectionRange(start,end){
  var editor=getEditorInstance();
  if(!editor) return;
  editor.setSelection(normalizeMdPos(start), normalizeMdPos(typeof end!=='undefined' ? end : start));
}

function focusEditor(){
  var editor=getEditorInstance();
  if(!editor) return;
  var host=document.getElementById('cmEditor');
  var active=document.activeElement;
  if(host && active && (host===active || host.contains(active))) return;
  editor.focus();
}

function refreshEditPreview(){
  var preview=document.getElementById('editPreview');
  if(!preview) return;
  var titleInput=document.getElementById('editDocTitle');
  preview.innerHTML=renderEditPreview((titleInput&&titleInput.value)||'', getEditorMarkdown());
}

function createTuiEditor(markdown){
  destroyEditor();
  var host=document.getElementById('cmEditor');
  if(!host) return null;
  host.innerHTML='';
  if(!(window.toastui && window.toastui.Editor)){
    host.innerHTML='<div style="padding:16px;color:#d93025">编辑器加载失败</div>';
    return null;
  }
  var editor=new window.toastui.Editor({
    el: host,
    height: '100%',
    minHeight: '0px',
    initialEditType: 'markdown',
    previewStyle: 'tab',
    initialValue: String(markdown || ''),
    hideModeSwitch: true,
    usageStatistics: false,
    autofocus: false,
    toolbarItems: []
  });
  editor.changeMode('markdown', true);
  editor.on('change', function(){
    refreshEditPreview();
  });
  bindToastEditorKeyboard(editor);
  bindToastEditorPaste(editor);
  window.toastEditor=editor;
  refreshEditPreview();
  return editor;
}

function destroyEditor(){
  if(window.toastEditor && typeof window.toastEditor.destroy==='function'){
    try{ window.toastEditor.destroy(); }catch(e){}
  }
  window.toastEditor=null;
  var host=document.getElementById('cmEditor');
  if(host) host.innerHTML='';
}

function getLineBoundaryOffsets(value, startOffset, endOffset){
  var src=String(value||'');
  var from=Math.max(0, Math.min(src.length, startOffset||0));
  var to=Math.max(0, Math.min(src.length, typeof endOffset==='number' ? endOffset : from));
  while(from > 0 && src[from-1] !== '\n') from--;
  while(to < src.length && src[to] !== '\n') to++;
  return {start:from,end:to};
}

function handleContinuePrefix(line){
  var src=String(line||'');
  var taskMatch=src.match(/^(\s*-\s+\[(?: |x|X)\]\s+)(.*)$/);
  if(taskMatch) return taskMatch[2].trim() ? taskMatch[1].replace(/\[[xX]\]/,'[ ]') : '';
  var bulletMatch=src.match(/^(\s*[-*+]\s+)(.*)$/);
  if(bulletMatch) return bulletMatch[2].trim() ? bulletMatch[1] : '';
  var orderedMatch=src.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if(orderedMatch) return orderedMatch[3].trim() ? (orderedMatch[1] + (Number(orderedMatch[2]||'1') + 1) + '. ') : '';
  var quoteMatch=src.match(/^(\s*>\s?)(.*)$/);
  if(quoteMatch) return quoteMatch[2].trim() ? quoteMatch[1] : '';
  return null;
}

function getPrefixFamily(prefix){
  if(/^#{1,6} $/.test(prefix||'')) return 'heading';
  if(prefix==='- ') return 'bullet';
  if(prefix==='1. ') return 'ordered';
  if(prefix==='- [ ] ') return 'task';
  if(prefix==='> ') return 'quote';
  return '';
}

function stripLinePrefixByFamily(line, family){
  if(!line) return line;
  if(family==='heading') return line.replace(/^#{1,6}\s+/, '');
  if(family==='bullet') return line.replace(/^[-*+]\s+/, '');
  if(family==='ordered') return line.replace(/^\d+\.\s+/, '');
  if(family==='task') return line.replace(/^-\s+\[(?: |x|X)\]\s+/, '');
  if(family==='quote') return line.replace(/^>\s?/, '');
  return line;
}

function transformPrefixedLine(line, prefix, shouldRemove){
  if(!line) return shouldRemove ? '' : prefix;
  if(shouldRemove && line.indexOf(prefix)===0) return line.slice(prefix.length);
  var family=getPrefixFamily(prefix);
  var cleaned=family ? stripLinePrefixByFamily(line, family) : line;
  return shouldRemove ? cleaned : prefix + cleaned;
}

function handleEditorContinueEnter(ev){
  var editor=getEditorInstance();
  if(!editor) return;
  var sel=getOrderedEditorSelectionRange();
  if(!isCollapsedMdRange(sel)) return;
  var value=getEditorMarkdown();
  var startPos=sel[0];
  var startOffset=mdPosToOffset(value, startPos);
  var bounds=getLineBoundaryOffsets(value, startOffset, startOffset);
  var lineStart=bounds.start;
  var lineEnd=bounds.end;
  var line=value.slice(lineStart,lineEnd);
  var prefix=handleContinuePrefix(line);
  if(prefix===null) return false;
  if(ev && ev.preventDefault) ev.preventDefault();
  if(ev && ev.stopPropagation) ev.stopPropagation();
  if(ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
  var insert='\n'+prefix;
  editor.replaceSelection(insert, startPos, startPos);
  var nextValue=getEditorMarkdown();
  setEditorSelectionRange(offsetToMdPos(nextValue, startOffset+insert.length));
  refreshEditPreview();
  focusEditor();
  return true;
}

function applyEditorLinePrefix(prefix){
  var editor=getEditorInstance();
  if(!editor) return false;
  var range=getOrderedEditorSelectionRange();
  var value=getEditorMarkdown();
  var start=mdPosToOffset(value, range[0]);
  var end=mdPosToOffset(value, range[1]);
  var bounds=getLineBoundaryOffsets(value, start, end);
  var block=value.slice(bounds.start, bounds.end);
  var lines=block.split('\n');
  var allHave=lines.length>0 && lines.every(function(line){ return line.indexOf(prefix)===0; });
  var nextBlock=lines.map(function(line){
    return transformPrefixedLine(line, prefix, allHave);
  }).join('\n');
  editor.replaceSelection(nextBlock, offsetToMdPos(value, bounds.start), offsetToMdPos(value, bounds.end));
  var nextValue=getEditorMarkdown();
  setEditorSelectionRange(offsetToMdPos(nextValue, bounds.start), offsetToMdPos(nextValue, bounds.start+nextBlock.length));
  refreshEditPreview();
  focusEditor();
  return true;
}

function wrapMd(before,after){
  if(isLinePrefixAction(before, after) && applyEditorLinePrefix(before)) return;
  var editor=getEditorInstance();
  if(!editor) return;
  var range=getOrderedEditorSelectionRange();
  var originalValue=getEditorMarkdown();
  var startOffset=mdPosToOffset(originalValue, range[0]);
  var selected=editor.getSelectedText(range[0], range[1]) || '';
  var inserted=before + selected + after;
  editor.replaceSelection(inserted, range[0], range[1]);
  var value=getEditorMarkdown();
  if(selected){
    setEditorSelectionRange(offsetToMdPos(value, startOffset + before.length), offsetToMdPos(value, startOffset + before.length + selected.length));
  }else{
    setEditorSelectionRange(offsetToMdPos(value, startOffset + before.length));
  }
  focusEditor();
  refreshEditPreview();
}

function insertMd(text){
  var editor=getEditorInstance();
  if(!editor) return;
  var range=getOrderedEditorSelectionRange();
  var startOffset=mdPosToOffset(getEditorMarkdown(), range[0]);
  editor.replaceSelection(text, range[0], range[1]);
  var value=getEditorMarkdown();
  setEditorSelectionRange(offsetToMdPos(value, startOffset + text.length));
  focusEditor();
  refreshEditPreview();
}

function setEditorMarkdown(markdown){
  var editor=getEditorInstance();
  if(!editor) return;
  editor.setMarkdown(String(markdown||''), false);
  refreshEditPreview();
}

function bindTitlePreview(){
  var titleInput=document.getElementById('editDocTitle');
  if(!titleInput) return;
  titleInput.oninput=function(){
    refreshEditPreview();
  };
}

function openEditorWithContent(title, markdown){
  var titleInput=document.getElementById('editDocTitle');
  if(titleInput) titleInput.value=title||'';
  document.getElementById('editTitle').textContent=title||'编辑文件';
  showMode('modeEdit');
  if(typeof window.startAutoSave==='function'){
    try{ window.startAutoSave(); }catch(e){}
  }
  closeMobilePreview();
  try{ window.scrollTo(0,0); }catch(e){}
  bindTitlePreview();
  createTuiEditor(markdown||'');
  setTimeout(function(){
    if(isNewFileMode){
      if(titleInput) titleInput.focus();
      var editor=getEditorInstance();
      if(editor) editor.moveCursorToStart(false);
    }else{
      focusEditor();
      var editor=getEditorInstance();
      if(editor) editor.moveCursorToStart(true);
    }
  },30);
}

function editFromView(){
  var iframeSrc=document.getElementById('viewFrame').src;
  var m=iframeSrc.match(/\/articles\/([^?#]+\.html)/i);
  var isSystemTask=false;
  if(!m){
    m=iframeSrc.match(/\/system\/tasks\/([^?#]+\.html)/i);
    if(m) isSystemTask=true;
  }
  if(!m){
    var title=document.getElementById('viewTitle').textContent;
    if(title==='工作中心') alert('当前页面是任务面板，无可编辑的文件');
    else alert('当前页面不是可编辑的文件');
    return;
  }
  currentFile=isSystemTask?('__system__/任务管理/'+decodeURIComponent(m[1])):decodeURIComponent(m[1]);
  isNewFileMode=false;
  pendingNewFilePath='';
  fetch('/api/read?path='+encodeURIComponent(currentFile)).then(function(r){return r.json()}).then(function(data){
    var md=data.markdown||'';
    var title=((currentFile||'').split('/').pop()||'').replace(/\.html$/i,'');
    openEditorWithContent(title, md);
  }).catch(function(e){console.error('读取失败:',e);alert('读取失败')})
}

function backToView(){
  if(confirm('放弃编辑？')){
    if(typeof window.stopAutoSave==='function'){
      try{ window.stopAutoSave(); }catch(e){}
    }
    destroyEditor();
    closeMobilePreview();
    if(isNewFileMode){
      isNewFileMode=false;
      pendingNewFilePath='';
      showMode('modeList');
    }else{
      showMode('modeView');
    }
  }
}

function stripLeadingTitle(md){
  return String(md||'').replace(/^#\s+.+?\r?\n(\r?\n)?/, '');
}

function renderEditPreview(name, body){
  var safeName=String(name||'').trim();
  var content=String(body||'');
  var header=safeName?'<div style="margin-bottom:16px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;color:#475569;font-size:13px"><strong>文件名：</strong>'+esc(safeName)+(safeName.endsWith('.html')?'':'.html')+'</div>':'';
  if(typeof marked!=='undefined'&&marked.parse) return header+marked.parse(content);
  return header+content;
}

async function uploadPastedImageFile(file){
  if(!file) throw new Error('未找到图片');
  if(file.size>5*1024*1024) throw new Error('图片不能超过 5MB');
  var dataUrl = await new Promise(function(resolve,reject){
    var reader=new FileReader();
    reader.onload=function(){ resolve(String(reader.result||'')); };
    reader.onerror=function(){ reject(new Error('读取图片失败')); };
    reader.readAsDataURL(file);
  });
  var size = await new Promise(function(resolve){
    var img = new Image();
    img.onload = function(){ resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 }); };
    img.onerror = function(){ resolve({ width: 0, height: 0 }); };
    img.src = dataUrl;
  });
  var base64 = dataUrl.split(',').pop() || '';
  var ext=(file.name&&/\.[^.]+$/.test(file.name))?file.name.match(/\.[^.]+$/)[0]:((file.type||'image/png').split('/')[1] ? '.'+(file.type||'image/png').split('/')[1] : '.png');
  var name=(file.name&&file.name.trim())?file.name:('pasted_'+Date.now()+ext);
  var articlePath=currentFile || ((currentDir||'') ? (String(currentDir).replace(/\\/g,'/')+'/未命名文章.html') : '未命名文章.html');
  var r=await fetch('/api/upload-asset',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ name:name, contentBase64:base64, articlePath:articlePath, dir:currentDir||'' })
  });
  var d=await r.json();
  if(!d.success) throw new Error(d.error||'上传失败');
  var alt = d.originalName || d.name || '图片';
  if(size.width > 0 && size.height > 0){
    return '\n\n<img src="'+d.url+'" alt="'+alt.replace(/"/g,'&quot;')+'" width="'+size.width+'" height="'+size.height+'">\n\n';
  }
  return '\n\n!['+alt+']('+d.url+')\n\n';
}

function bindToastEditorPaste(editor){
  if(!editor || !editor.getEditorElements) return;
  var els=editor.getEditorElements();
  var target=(els && els.mdEditor) || document.querySelector('#cmEditor');
  if(!target || target.__pasteBound) return;
  target.__pasteBound=true;
  target.addEventListener('paste', async function(e){
    try{
      var items=(e.clipboardData&&e.clipboardData.items)?Array.from(e.clipboardData.items):[];
      var imgItem=items.find(function(it){ return it && it.type && /^image\//i.test(it.type); });
      if(!imgItem) return;
      e.preventDefault();
      var file=imgItem.getAsFile();
      if(!file) return;
      var md=await uploadPastedImageFile(file);
      insertMd(md);
    }catch(err){
      alert('粘贴图片失败：'+err.message);
      console.error('TOAST UI 粘贴图片失败:', err);
    }
  });
}

function bindToastEditorKeyboard(editor){
  if(!editor || !editor.getEditorElements) return;
  var els=editor.getEditorElements();
  var target=(els && els.mdEditor) || document.querySelector('#cmEditor');
  if(!target || target.__keyboardBound) return;
  target.__keyboardBound=true;
  target.addEventListener('keydown', function(ev){
    if(!ev) return;
    if(ev.isComposing || ev.keyCode===229) return;
    if(ev.key==='Tab'){
      ev.preventDefault();
      if(ev.stopPropagation) ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      insertMd('  ');
      return;
    }
    if(ev.key==='Enter'){
      if(handleEditorContinueEnter(ev)) return false;
    }
  }, true);
}

function saveEdit(opts){
  opts=opts||{};
  var silent=!!opts.silent;
  var stayInEditor=!!opts.stayInEditor;
  var title=(document.getElementById('editDocTitle').value||'').trim();
  var body=getEditorMarkdown();
  if(!title){
    if(!silent){alert('请输入文件名');document.getElementById('editDocTitle').focus();}
    return Promise.resolve(false);
  }
  var markdown=String(body||'').replace(/\r\n/g,'\n');
  if(isNewFileMode){
    if(markdown==='') markdown=NEW_FILE_PLACEHOLDER;
  }else{
    markdown=markdown.replace(/\s+$/,'');
    if(markdown) markdown+='\n';
  }
  var fileName=title.replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim();
  if(!fileName){
    if(!silent) alert('文件名无效，请重新输入');
    return Promise.resolve(false);
  }
  if(isNewFileMode){
    return fetch('/api/create-file',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:fileName,dir:currentDir,content:markdown})
    }).then(function(r){return r.json()}).then(function(data){
      if(data.success){
        currentFile=data.path;
        isNewFileMode=false;
        pendingNewFilePath='';
        if(stayInEditor){
          document.getElementById('editTitle').textContent=fileName;
          loadDirs();
          if(silent) console.log('[AutoSave] 新文件已自动创建:', currentFile);
          return true;
        }
        if(typeof window.stopAutoSave==='function'){
          try{ window.stopAutoSave(); }catch(e){}
        }
        loadDir(currentDir);
        destroyEditor();
        showMode('modeView');viewFile(currentFile,currentFile);
        return true;
      }
      if(!silent) alert('创建失败: '+(data.error||'未知错误'));
      else console.error('自动创建失败:', data.error||'未知错误');
      return false;
    }).catch(function(e){console.error('创建失败:',e);if(!silent) alert('创建失败');return false});
  }
  var oldName=(currentFile.split('/').pop()||'').replace(/\.html$/i,'');
  var doSave=function(targetPath){
    return fetch('/api/save',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:targetPath,markdown:markdown})
    }).then(function(r){return r.json()}).then(function(data){
      if(data.success){
        if(stayInEditor){
          if(silent) console.log('[AutoSave] 已保存:', targetPath);
          return true;
        }
        if(typeof window.stopAutoSave==='function'){
          try{ window.stopAutoSave(); }catch(e){}
        }
        destroyEditor();
        showMode('modeView');viewFile(targetPath.split('/').pop(),targetPath);
        return true;
      }
      if(!silent) alert('保存失败: '+(data.error||'未知错误'));
      else console.error('自动保存失败:', data.error||'未知错误');
      return false;
    }).catch(function(e){console.error('保存失败:',e);if(!silent) alert('保存失败');return false});
  };
  if(fileName!==oldName){
    return fetch('/api/rename',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:currentFile,newName:fileName+'.html'})
    }).then(function(r){return r.json()}).then(function(d){
      if(d.success){
        currentFile=(currentFile.split('/').slice(0,-1).concat([fileName+'.html'])).join('/');
        return doSave(currentFile);
      }
      if(!silent) alert('重命名失败: '+(d.error||'未知错误'));
      else console.error('自动重命名失败:', d.error||'未知错误');
      return false;
    }).catch(function(e){console.error('重命名失败:',e);if(!silent) alert('重命名失败');return false});
  }
  return doSave(currentFile);
}

function newFile(targetDir){
  isNewFileMode=true;
  pendingNewFilePath='';
  currentDir=typeof targetDir==='string'?targetDir:(currentDir||'');
  currentFile='';
  openEditorWithContent('', NEW_FILE_PLACEHOLDER);
}

function initEditorToolbarBehavior(){
  var toolbar=document.getElementById('mdToolbar');
  if(!toolbar || toolbar.__bound) return;
  toolbar.__bound=true;
  toolbar.addEventListener('mousedown', function(e){
    var btn=e.target && e.target.closest ? e.target.closest('.btn-tb') : null;
    if(btn) e.preventDefault();
  });
}

function isEditingToastMarkdown(){
  var mode=document.getElementById('modeEdit');
  if(!mode || !mode.classList.contains('active')) return false;
  var host=document.getElementById('cmEditor');
  var active=document.activeElement;
  return !!(host && active && (host===active || host.contains(active)));
}

function initEditorKeyboardCapture(){
  if(document.__editorKeyboardCaptureBound) return;
  document.__editorKeyboardCaptureBound=true;
  document.addEventListener('keydown', function(ev){
    if(!isEditingToastMarkdown()) return;
    if(!ev || ev.defaultPrevented || ev.isComposing || ev.keyCode===229) return;
    // 主处理逻辑已绑定在编辑器真实输入层，这里只兜底，不重复处理。
  }, true);
}

function closeAppDialog(id){
  var el=document.getElementById(id);
  if(el) el.remove();
  setPageScrollLock(false, id);
}

function openAppDialog(id, title, bodyHtml, options){
  closeAppDialog(id);
  options=options||{};
  var overlay=document.createElement('div');
  overlay.id=id;
  overlay.className='app-overlay';
  overlay.style.display='flex';
  overlay.innerHTML=''
    + '<div class="app-dialog" style="'+(options.dialogStyle||'')+'">'
    +   '<div class="app-dialog-head">'
    +     '<div class="app-dialog-title">'+esc(title)+'</div>'
    +     '<button type="button" class="app-dialog-close" aria-label="关闭">×</button>'
    +   '</div>'
    +   bodyHtml
    + '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('.app-dialog-close').onclick=function(){ closeAppDialog(id); };
  overlay.onclick=function(e){ if(e.target===overlay) closeAppDialog(id); };
  setPageScrollLock(true, id);
  return overlay;
}

function getFileExtension(path){
  var m=String(path||'').match(/\.([^.\/\\]+)$/);
  return m ? m[1].toLowerCase() : '';
}

function isImagePath(path){
  return /^(png|jpe?g|gif|webp|bmp|svg)$/i.test(getFileExtension(path));
}

function normalizeRelativeLink(pathValue){
  var value=String(pathValue||'').trim().replace(/\\/g,'/');
  if(!value) return '';
  if(/^https?:\/\//i.test(value)) return value;
  if(value.charAt(0)==='/') return value;
  return value.split('/').map(encodeURIComponent).join('/').replace(/%2F/g,'/');
}

function resolveInternalLinkPath(raw, fromPath){
  var target=String(raw||'').trim().replace(/\\/g,'/');
  if(!target) return '';
  if(!/\.html$/i.test(target)) target+='.html';
  if(target.indexOf('/')===-1) return target;
  var stack=((fromPath||'').split('/').slice(0,-1)).filter(Boolean);
  target.split('/').forEach(function(part){
    if(!part || part==='.') return;
    if(part==='..'){ if(stack.length) stack.pop(); return; }
    stack.push(part);
  });
  return stack.join('/');
}

function buildRelativeInternalLink(targetPath, fromPath){
  var targetParts=String(targetPath||'').replace(/\\/g,'/').split('/').filter(Boolean);
  var fromParts=String(fromPath||'').replace(/\\/g,'/').split('/').filter(Boolean);
  if(fromParts.length) fromParts.pop();
  var i=0;
  while(i<targetParts.length && i<fromParts.length && targetParts[i]===fromParts[i]) i++;
  var rel=[];
  for(var j=i;j<fromParts.length;j++) rel.push('..');
  rel=rel.concat(targetParts.slice(i));
  return rel.length ? rel.join('/') : (targetParts[targetParts.length-1] || '');
}

function openLinkDialog(){
  var overlay=openAppDialog('editorLinkDialog','插入外部链接',
    '<div class="app-field">'
    + '<label class="app-label">链接文字</label><input id="extLinkText" class="app-input" type="text" placeholder="例如：OpenAI 官网">'
    + '<label class="app-label">链接地址</label><input id="extLinkUrl" class="app-input" type="url" placeholder="https://">'
    + '<div class="app-actions"><button type="button" class="app-btn" id="extLinkCancel">取消</button><button type="button" class="app-btn app-btn-primary" id="extLinkSubmit">插入</button></div>'
    + '</div>');
  document.getElementById('extLinkCancel').onclick=function(){ closeAppDialog('editorLinkDialog'); };
  document.getElementById('extLinkSubmit').onclick=function(){
    var text=(document.getElementById('extLinkText').value||'').trim();
    var url=(document.getElementById('extLinkUrl').value||'').trim();
    if(!url){ alert('请输入链接地址'); return; }
    if(!/^(https?:\/\/|mailto:|tel:)/i.test(url)){
      url='https://'+url.replace(/^\/+/,'');
    }
    var label=text||url;
    insertMd('['+label+']('+url+')');
    closeAppDialog('editorLinkDialog');
  };
  setTimeout(function(){ var el=document.getElementById('extLinkUrl'); if(el) el.focus(); }, 20);
  return overlay;
}

function openImageDialog(){
  var overlay=openAppDialog('editorImageDialog','插入图片',
    '<div class="app-field">'
    + '<label class="app-label">图片描述</label><input id="imageAltText" class="app-input" type="text" placeholder="例如：流程图">'
    + '<label class="app-label">图片地址</label><input id="imageUrlInput" class="app-input" type="text" placeholder="/fujian/... 或 https://...">'
    + '<label class="app-label">宽度（可选）</label><input id="imageWidthInput" class="app-input" type="number" min="1" placeholder="例如：640">'
    + '<label class="app-label">高度（可选）</label><input id="imageHeightInput" class="app-input" type="number" min="1" placeholder="例如：480">'
    + '<div class="app-actions"><button type="button" class="app-btn" id="imageDialogCancel">取消</button><button type="button" class="app-btn app-btn-primary" id="imageDialogSubmit">插入</button></div>'
    + '</div>');
  document.getElementById('imageDialogCancel').onclick=function(){ closeAppDialog('editorImageDialog'); };
  document.getElementById('imageDialogSubmit').onclick=function(){
    var alt=(document.getElementById('imageAltText').value||'').trim() || '图片';
    var url=(document.getElementById('imageUrlInput').value||'').trim();
    var width=(document.getElementById('imageWidthInput').value||'').trim();
    var height=(document.getElementById('imageHeightInput').value||'').trim();
    if(!url){ alert('请输入图片地址'); return; }
    if(width || height){
      var attrs=' src="'+url+'" alt="'+alt.replace(/"/g,'&quot;')+'"';
      if(width) attrs+=' width="'+width+'"';
      if(height) attrs+=' height="'+height+'"';
      insertMd('\n\n<img'+attrs+'>\n\n');
    }else{
      insertMd('\n\n!['+alt+']('+url+')\n\n');
    }
    closeAppDialog('editorImageDialog');
  };
  setTimeout(function(){ var el=document.getElementById('imageUrlInput'); if(el) el.focus(); }, 20);
  return overlay;
}

function collectAllFilesFromTree(nodes, list){
  list=list||[];
  (Array.isArray(nodes)?nodes:[]).forEach(function(node){
    (node.files||[]).forEach(function(file){
      if(file && file.path) list.push(file);
    });
    if(node.children && node.children.length) collectAllFilesFromTree(node.children, list);
  });
  return list;
}

function collectAllDirPaths(nodes, list){
  list=list||[''];
  (Array.isArray(nodes)?nodes:[]).forEach(function(node){
    if(node && typeof node.path==='string') list.push(node.path);
    if(node && node.children && node.children.length) collectAllDirPaths(node.children, list);
  });
  return list;
}

function showInternalLinkList(list, selectedPath){
  return list.map(function(file){
    var active=selectedPath===file.path?' active':'';
    return '<div class="app-list-item'+active+'" data-path="'+escAttr(file.path)+'">'
      + '<div class="app-list-title">'+esc(file.name||file.path.split('/').pop())+'</div>'
      + '<div class="app-list-path">'+esc(file.path)+'</div>'
      + '</div>';
  }).join('');
}

function attachFilesToDirTree(tree, fileGroups){
  function walk(nodes){
    return (nodes||[]).map(function(node){
      var next={
        type:'dir',
        name:node.name,
        path:node.path,
        children:walk(node.children||[]),
        files:(fileGroups[node.path]||[]).slice().sort(function(a,b){
          return String(a.name||a.path).localeCompare(String(b.name||b.path),'zh-CN');
        }),
        _open:false
      };
      return next;
    });
  }
  return walk(tree||[]);
}

function filterInternalLinkTree(nodes, keyword){
  var kw=String(keyword||'').trim().toLowerCase();
  if(!kw) return JSON.parse(JSON.stringify(nodes||[]));
  function walk(items){
    var out=[];
    (items||[]).forEach(function(node){
      var childNodes=walk(node.children||[]);
      var files=(node.files||[]).filter(function(file){
        var text=((file.name||'')+' '+(file.path||'')).toLowerCase();
        return text.indexOf(kw)!==-1;
      });
      var selfMatch=((node.name||'')+' '+(node.path||'')).toLowerCase().indexOf(kw)!==-1;
      if(selfMatch || childNodes.length || files.length){
        out.push({
          type:'dir',
          name:node.name,
          path:node.path,
          children:childNodes,
          files:files,
          _open:true
        });
      }
    });
    return out;
  }
  return walk(nodes||[]);
}

function renderInternalLinkTreeHtml(nodes, selectedPath, depth){
  depth=depth||0;
  return (nodes||[]).map(function(node){
    var hasChildren=(node.children&&node.children.length)||(node.files&&node.files.length);
    var open=node._open!==false;
    var pad=12 + depth*18;
    var dirHtml='<div class="dir-item internal-dir-item" data-dir="'+escAttr(node.path)+'" style="padding-left:'+pad+'px">'
      + '<span class="arrow'+(open?' expanded':'')+(hasChildren?'':' no-child')+'">'+(hasChildren?'▶':'▷')+'</span>'
      + '<i class="bi bi-folder"></i><span class="name">'+esc(node.name)+'</span>'
      + '</div>';
    var fileHtml=(node.files||[]).map(function(file){
      var active=selectedPath===file.path?' selected':'';
      return '<div class="dir-item internal-file-item'+active+'" data-path="'+escAttr(file.path)+'" style="padding-left:'+(pad+24)+'px">'
        + '<span class="arrow no-child">•</span><i class="bi bi-file-earmark-text"></i><span class="name">'+esc((file.name||'').replace(/\.html$/i,''))+'</span>'
        + '</div>';
    }).join('');
    var childHtml=renderInternalLinkTreeHtml(node.children||[], selectedPath, depth+1);
    return dirHtml + '<div class="dir-children'+(open?' open':'')+'">'+fileHtml+childHtml+'</div>';
  }).join('');
}

function bindInternalLinkTree(container, treeState){
  if(!container) return;
  container.querySelectorAll('.internal-dir-item').forEach(function(item){
    item.onclick=function(){
      var child=this.nextElementSibling;
      var arrow=this.querySelector('.arrow');
      if(!child || !child.classList.contains('dir-children') || (arrow && arrow.classList.contains('no-child'))) return;
      child.classList.toggle('open');
      if(arrow) arrow.classList.toggle('expanded');
    };
  });
  container.querySelectorAll('.internal-file-item').forEach(function(item){
    item.onclick=function(e){
      e.stopPropagation();
      treeState.selectedPath=this.getAttribute('data-path')||'';
      container.querySelectorAll('.internal-file-item').forEach(function(x){ x.classList.remove('selected'); });
      this.classList.add('selected');
    };
  });
}

function openInternalLinkDialog(){
  fetch('/api/dirs').then(function(r){ return r.json(); }).then(function(tree){
      var dirPaths=collectAllDirPaths(tree, []);
      var requests=dirPaths.map(function(dirPath){
        return fetch('/api/list?dir='+encodeURIComponent(dirPath)).then(function(r){ return r.json(); }).then(function(data){
          return ((data&&data.files)||[]).filter(function(f){ return f && !f.isDir && /\.html$/i.test(f.path||''); });
        }).catch(function(){ return []; });
      });
      return Promise.all(requests).then(function(groups){
        var map={};
        groups.forEach(function(group){
          group.forEach(function(f){
            if(f && f.path && !map[f.path]) map[f.path]=f;
          });
        });
        var fileGroups={};
        Object.keys(map).forEach(function(k){
          var file=map[k];
          var dir=(file.path||'').split('/').slice(0,-1).join('/');
          if(!fileGroups[dir]) fileGroups[dir]=[];
          fileGroups[dir].push(file);
        });
        return { tree: attachFilesToDirTree(tree, fileGroups) };
      });
    }).then(function(payload){
      var baseTree=payload.tree||[];
      var treeState={ selectedPath:'', tree: baseTree };
      var overlay=openAppDialog('editorInternalLinkDialog','插入内部链接',
        '<div class="app-field">'
        + '<label class="app-label">显示文字（可选）</label><input id="internalLinkText" class="app-input" type="text" placeholder="默认使用文件名">'
        + '<label class="app-label">搜索文件</label><input id="internalLinkSearch" class="app-input" type="text" placeholder="输入关键词筛选">'
        + '<div class="app-list" id="internalLinkList" style="min-height:360px;max-height:420px">'+renderInternalLinkTreeHtml(baseTree, '', 0)+'</div>'
        + '<div class="app-actions"><button type="button" class="app-btn" id="internalLinkCancel">取消</button><button type="button" class="app-btn app-btn-primary" id="internalLinkSubmit">插入</button></div>'
        + '</div>',
        { dialogStyle:'max-width:680px;' });
      var listEl=document.getElementById('internalLinkList');
      bindInternalLinkTree(listEl, treeState);
      document.getElementById('internalLinkSearch').oninput=function(){
        treeState.tree=filterInternalLinkTree(baseTree, this.value||'');
        listEl.innerHTML=renderInternalLinkTreeHtml(treeState.tree, treeState.selectedPath, 0);
        bindInternalLinkTree(listEl, treeState);
      };
      document.getElementById('internalLinkCancel').onclick=function(){ closeAppDialog('editorInternalLinkDialog'); };
      document.getElementById('internalLinkSubmit').onclick=function(){
        if(!treeState.selectedPath){ alert('请选择一个文件'); return; }
        var text=(document.getElementById('internalLinkText').value||'').trim() || treeState.selectedPath.split('/').pop().replace(/\.html$/i,'');
        var relative=buildRelativeInternalLink(treeState.selectedPath, currentFile||'');
        insertMd('['+text+']('+relative+')');
        closeAppDialog('editorInternalLinkDialog');
      };
      setTimeout(function(){ var el=document.getElementById('internalLinkSearch'); if(el) el.focus(); }, 20);
      return overlay;
  }).catch(function(e){
    alert('读取文件列表失败：'+e.message);
  });
}

function openAssetDialog(){
  var overlay=openAppDialog('editorAssetDialog','插入图片和附件',
    '<div class="app-field">'
    + '<label class="app-label">选择文件（单个，最大 5MB）</label><input id="assetFileInput" class="app-input" type="file">'
    + '<div class="app-actions"><button type="button" class="app-btn" id="assetDialogCancel">取消</button><button type="button" class="app-btn app-btn-primary" id="assetDialogSubmit">上传并插入</button></div>'
    + '</div>');
  document.getElementById('assetDialogCancel').onclick=function(){ closeAppDialog('editorAssetDialog'); };
  document.getElementById('assetDialogSubmit').onclick=async function(){
    var input=document.getElementById('assetFileInput');
    var file=input && input.files && input.files[0];
    if(!file){ alert('请选择文件'); return; }
    if(file.size>5*1024*1024){ alert('文件不能超过 5MB'); return; }
    try{
      var reader=new FileReader();
      reader.onload=async function(){
        try{
          var dataUrl=String(reader.result||'');
          var base64=dataUrl.split(',').pop()||'';
          var articlePath=currentFile || ((currentDir||'') ? (String(currentDir).replace(/\\/g,'/')+'/未命名文章.html') : '未命名文章.html');
          var r=await fetch('/api/upload-asset',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({ name:file.name, contentBase64:base64, articlePath:articlePath, dir:currentDir||'' })
          });
          var d=await r.json();
          if(!d.success) throw new Error(d.error||'上传失败');
          var label=d.originalName || file.name || '附件';
          var md=isImagePath(label)
            ? '\n\n!['+label+']('+d.url+')\n\n'
            : '\n\n['+label+']('+d.url+')\n\n';
          insertMd(md);
          closeAppDialog('editorAssetDialog');
        }catch(err){
          alert('上传失败：'+err.message);
        }
      };
      reader.onerror=function(){ alert('读取文件失败'); };
      reader.readAsDataURL(file);
    }catch(e){
      alert('上传失败：'+e.message);
    }
  };
  return overlay;
}
// ── 新建文件夹 ──
function newFolder(){document.getElementById('newFolderName').value='';var m=new bootstrap.Modal(document.getElementById('newFolderModal'));m.show()}
function doNewFolder(){
  var name=document.getElementById('newFolderName').value.trim();
  if(!name){alert('请输入文件夹名称');return}
  fetch('/api/create-dir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,dir:currentDir})})
  .then(function(r){return r.json()}).then(function(d){
    if(d.success){bootstrap.Modal.getInstance(document.getElementById('newFolderModal')).hide();loadDir(currentDir);loadDirs()}
    else alert('创建失败: '+(d.error||''));
  }).catch(function(e){console.error('创建目录失败:',e);alert('创建失败')})
}

// ── 重命名 ──
function renameItem(name,path,isDir){
  renameTarget={name:name,path:path,isDir:isDir};
  document.getElementById('renameInput').value=name;
  new bootstrap.Modal(document.getElementById('renameModal')).show();
}
function doRename(){
  var newName=document.getElementById('renameInput').value.trim();
  if(!newName){alert('请输入新名称');return}
  fetch('/api/rename',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:renameTarget.path,newName:newName})})
  .then(function(r){return r.json()}).then(function(d){
    if(d.success){bootstrap.Modal.getInstance(document.getElementById('renameModal')).hide();loadDir(currentDir);loadDirs()}
    else alert('重命名失败: '+(d.error||''));
  }).catch(function(e){console.error('重命名失败:',e);alert('重命名失败')})
}


// ── 移动 ──
var moveTarget=null;
var moveSelectedDir='';
function moveItem(name,path,isDir,batchItems){
  moveTarget={name:name,path:path,isDir:!!isDir,items:Array.isArray(batchItems)?batchItems:null};
  moveSelectedDir='';
  document.getElementById('moveMsg').textContent=(moveTarget.items&&moveTarget.items.length>1)?('选择目标文件夹（将移动 '+moveTarget.items.length+' 项）：'):'选择目标文件夹：';
  document.getElementById('moveBtn').disabled=true;
  renderMoveDirTree();
  new bootstrap.Modal(document.getElementById('moveModal')).show();
}

function renderMoveDirTree(){
  var box=document.getElementById('moveDirTree');
  if(!box) return;
  box.innerHTML='<div style="color:#999;padding:8px">加载中...</div>';
  fetch('/api/dirs').then(function(r){return r.json()}).then(function(data){
    box.innerHTML='';
    var items=[{name:'根目录',path:''}];
    function walk(arr,prefix){
      (arr||[]).forEach(function(it){
        items.push({name:(prefix?prefix+' / ':'')+it.name,path:it.path});
        if(it.children&&it.children.length) walk(it.children,(prefix?prefix+' / ':'')+it.name);
      });
    }
    walk(data,'');
    items.forEach(function(it){
      var div=document.createElement('div');
      div.className='move-dir-item';
      div.innerHTML='<div class="move-dir-name"><i class="bi bi-folder" style="margin-right:8px"></i>'+esc(it.name)+'</div><div class="move-dir-path">'+esc(it.path||'/')+'</div>';
      div.onclick=function(){
        Array.from(box.children).forEach(function(x){x.classList.remove('active');});
        div.classList.add('active');
        moveSelectedDir=it.path||'';
        document.getElementById('moveBtn').disabled=false;
      };
      box.appendChild(div);
    });
  }).catch(function(){
    box.innerHTML='<div style="color:#e74c3c;padding:8px">目录加载失败</div>';
  });
}

function doMove(){
  if(!moveTarget) return;
  var items=(moveTarget.items&&moveTarget.items.length)?moveTarget.items:[moveTarget];
  var req;
  if(items.length>1){
    req=fetch('/api/move-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:items,targetDir:moveSelectedDir})}).then(function(r){return r.json()});
  }else{
    req=fetch('/api/move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:items[0].path,targetDir:moveSelectedDir})}).then(function(r){return r.json()});
  }
  req.then(function(result){
    if(!result.success){ alert('移动失败: '+(result.error||'')); return; }
    bootstrap.Modal.getInstance(document.getElementById('moveModal')).hide();
    selectedItems={};
    moveTarget=null;
    moveSelectedDir='';
    loadDir(currentDir);loadDirs();
  }).catch(function(e){console.error('移动失败:',e);alert('移动失败')});
}

// ── 删除 ──
function deleteItem(name,path,isDir){
  deleteTarget={name:name,path:path,isDir:isDir};
  document.getElementById('deleteMsg').textContent='确定要删除'+(isDir?'文件夹':'文件')+'「'+name+'」吗？';
  new bootstrap.Modal(document.getElementById('deleteModal')).show();
}
function doDelete(){
  if(deleteTarget&&deleteTarget.batch&&Array.isArray(deleteTarget.items)){
    Promise.all(deleteTarget.items.map(function(it){
      return fetch('/api/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:it.path,isDir:it.isDir})}).then(function(r){return r.json()});
    })).then(function(){
      bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
      selectedItems={};
      loadDir(currentDir);loadDirs();
    }).catch(function(e){console.error('删除失败:',e);alert('删除失败')});
    return;
  }
  fetch('/api/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:deleteTarget.path,isDir:deleteTarget.isDir})})
  .then(function(r){return r.json()}).then(function(d){
    if(d.success){bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();selectedItems={};loadDir(currentDir);loadDirs()}
    else alert('删除失败: '+(d.error||''));
  }).catch(function(e){console.error('删除失败:',e);alert('删除失败')})
}

// ── 上传 ──
function uploadFile(){document.getElementById('uploadInput').value='';new bootstrap.Modal(document.getElementById('uploadModal')).show()}
function doUpload(){
  var input=document.getElementById('uploadInput');
  if(!input.files||input.files.length===0){alert('请选择文件');return}
  var files=[];
  var names=[];
  for(var i=0;i<input.files.length;i++){
    var name=input.files[i].name;
    if(!name.endsWith('.html')&&!name.endsWith('.md')){
      alert('只允许上传 HTML 文件（.html/.md）\n非法文件: '+name);
      return;
    }
    names.push(name);
  }
  var loaded=0;
  for(var i=0;i<input.files.length;i++){
    (function(file){
      var reader=new FileReader();
      reader.onload=function(e){
        files.push({name:file.name,content:e.target.result});
        loaded++;
        if(loaded===input.files.length)sendUpload(files);
      };
      reader.readAsText(file);
    })(input.files[i]);
  }
}
function sendUpload(files){
  fetch('/api/upload',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({files:files,dir:currentDir})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.success){bootstrap.Modal.getInstance(document.getElementById('uploadModal')).hide();loadDir(currentDir)}
    else alert('上传失败: '+(d.error||''));
  }).catch(function(e){console.error('上传失败:',e);alert('上传失败')})
}



// ── 撤销/重做 ──
function undoEdit(){
  var editor=getEditorInstance();
  if(editor){ editor.exec('undo'); focusEditor(); refreshEditPreview(); }
}

function redoEdit(){
  var editor=getEditorInstance();
  if(editor){ editor.exec('redo'); focusEditor(); refreshEditPreview(); }
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded',function(){
  loadBlurredFileMap();
  document.getElementById('headerDate').textContent=new Date().toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric',weekday:'long'});
  loadThemePreference();
  loadDirs();
  // loadDir('');
  // 检查 ?view= 参数
  var p=new URLSearchParams(location.search);
  var view=p.get('view');
  if(view){var pn=pageTitle[view];if(pn){document.getElementById('viewFrame').src=pageMap[view];document.getElementById('viewTitle').textContent=pn;showMode('modeView')}else viewFile(view,view)}
  else{openPage('renwu')}
  var selectAll=document.getElementById('selectAllCheckbox');
  if(selectAll){
    selectAll.addEventListener('change',function(){
      toggleSelectAll(this.checked);
    });
  }
  initEditorToolbarBehavior();
  initEditorKeyboardCapture();
});

window.navPush = navPush;
window.loadDir = loadDir;
window.viewFile = viewFile;
window.openFromWorkbench = openFromWorkbench;
window.newFile = newFile;
window.backToList = backToList;
window.editFromView = editFromView;
window.backToView = backToView;
window.wrapMd = wrapMd;
window.insertMd = insertMd;
window.saveEdit = saveEdit;
window.undoEdit = undoEdit;
window.redoEdit = redoEdit;
window.openLinkDialog = openLinkDialog;
window.openInternalLinkDialog = openInternalLinkDialog;
window.openImageDialog = openImageDialog;
window.openAssetDialog = openAssetDialog;
window.resolveInternalLinkPath = resolveInternalLinkPath;

window.addEventListener('resize',function(){
  if(!isMobileViewport()){
    closeMobilePreview();
    toggleSidebar(false);
  }
});
