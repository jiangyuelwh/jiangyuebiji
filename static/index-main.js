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
  if(isRoot) el.innerHTML='<div class="dir-item'+(activePath===''?' active':'')+'" data-path="" onclick="loadDir(\'\')"><i class="bi bi-folder"></i><span class="name">根目录</span></div>';
  else el.innerHTML='';
  var items=Array.isArray(nodes)?nodes:(nodes&&nodes.dirs?nodes.dirs:[]);
  items.forEach(function(d){
    var div=document.createElement('div');
    div.className='dir-item'+(activePath===d.path?' active':'');
    div.dataset.path=d.path;
    var hasSub=(d.children&&d.children.length>0);var arrowIcon=hasSub?'▶':'▷';var arrowCls='arrow'+(d._open?' expanded':'')+(hasSub?'':' no-child');div.innerHTML='<span class="'+arrowCls+'">'+arrowIcon+'</span><i class="bi '+(d.hasFiles?'bi-folder-fill':'bi-folder')+'"></i><span class="name">'+esc(d.name)+'</span>';
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
    el.appendChild(div);
    if(d.children&&d.children.length){
      var childDiv=document.createElement('div');
      childDiv.className='dir-children'+(d._open?' open':'');
      renderDirTree(childDiv,{dirs:d.children},activePath);
      el.appendChild(childDiv);
    }
  });
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
function wrapMd(before,after){
  if(cmEditor){
    cmEditor.focus();
    var sel=cmEditor.state.selection.main;
    var text=cmEditor.state.doc.sliceString(sel.from,sel.to);
    cmEditor.dispatch({
      changes:{from:sel.from,to:sel.to,insert:before+text+after},
      selection:{anchor:sel.from+before.length,head:sel.from+before.length+text.length}
    });
  }else{
    var ta=document.getElementById('editTextarea');
    if(!ta)return;
    var start=ta.selectionStart,end=ta.selectionEnd;
    var selected=ta.value.substring(start,end);
    ta.value=ta.value.substring(0,start)+before+selected+after+ta.value.substring(end);
    ta.focus();ta.selectionStart=start+before.length;ta.selectionEnd=start+before.length+selected.length;
    if(document.getElementById('editPreview')&&typeof marked!=='undefined'&&marked.parse)
      document.getElementById('editPreview').innerHTML=marked.parse(ta.value);
  }
}
function insertMd(text){
  if(cmEditor){
    cmEditor.focus();
    var sel=cmEditor.state.selection.main;
    cmEditor.dispatch({
      changes:{from:sel.from,to:sel.to,insert:text},
      selection:{anchor:sel.from+text.length}
    });
  }else{
    var ta=document.getElementById('editTextarea');
    if(!ta)return;
    var pos=ta.selectionStart;
    ta.value=ta.value.substring(0,pos)+text+ta.value.substring(ta.selectionEnd);
    ta.focus();ta.selectionStart=ta.selectionEnd=pos+text.length;
    if(document.getElementById('editPreview')&&typeof marked!=='undefined'&&marked.parse)
      document.getElementById('editPreview').innerHTML=marked.parse(ta.value);
  }
}


function ensureImageDialog(){
  if(document.getElementById('imageInsertOverlay')) return;
  var overlay=document.createElement('div');
  overlay.id='imageInsertOverlay';
  overlay.className='app-overlay';
  overlay.innerHTML=''
    + '<div class="app-dialog" style="max-width:460px">'
    +   '<div class="app-dialog-head">'
    +     '<div class="app-dialog-title">插入图片</div>'
    +     '<button id="imageInsertClose" class="app-dialog-close">×</button>'
    +   '</div>'
    +   '<div class="app-field">'
    +     '<div>'
    +       '<div class="app-label">图片地址</div>'
    +       '<input id="imageInsertUrl" type="text" placeholder="https://example.com/image.png" class="app-input">'
    +     '</div>'
    +     '<div>'
    +       '<div class="app-label">说明文字（可选）</div>'
    +       '<input id="imageInsertAlt" type="text" placeholder="图片说明" class="app-input">'
    +     '</div>'
    +   '</div>'
    +   '<div class="app-actions">'
    +     '<button id="imageInsertCancel" class="app-btn">取消</button>'
    +     '<button id="imageInsertConfirm" class="app-btn app-btn-primary">插入</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  function closeDialog(){ overlay.style.display='none'; }
  document.getElementById('imageInsertClose').onclick=closeDialog;
  document.getElementById('imageInsertCancel').onclick=closeDialog;
  overlay.onclick=function(e){ if(e.target===overlay) closeDialog(); };
  document.getElementById('imageInsertConfirm').onclick=function(){
    var url=document.getElementById('imageInsertUrl').value.trim();
    var alt=document.getElementById('imageInsertAlt').value.trim();
    if(!url){ alert('请输入图片地址'); return; }
    insertMd('![' + alt + '](' + url + ')');
    closeDialog();
  };
}


function ensureLinkDialog(){
  if(document.getElementById('linkInsertOverlay')) return;
  var overlay=document.createElement('div');
  overlay.id='linkInsertOverlay';
  overlay.className='app-overlay';
  overlay.innerHTML=''
    + '<div class="app-dialog" style="max-width:460px">'
    +   '<div class="app-dialog-head">'
    +     '<div class="app-dialog-title">插入链接</div>'
    +     '<button id="linkInsertClose" class="app-dialog-close">×</button>'
    +   '</div>'
    +   '<div class="app-field" style="overflow:hidden">'
    +     '<div>'
    +       '<div class="app-label">链接地址</div>'
    +       '<input id="linkInsertUrl" type="text" placeholder="https://example.com" class="app-input">'
    +     '</div>'
    +     '<div>'
    +       '<div class="app-label">显示文字（可选）</div>'
    +       '<input id="linkInsertText" type="text" placeholder="链接文字" class="app-input">'
    +     '</div>'
    +   '</div>'
    +   '<div class="app-actions" style="padding-top:12px;border-top:1px solid #f0f0f0">'
    +     '<button id="linkInsertCancel" class="app-btn">取消</button>'
    +     '<button id="linkInsertConfirm" class="app-btn app-btn-primary">插入</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  function closeDialog(){ overlay.style.display='none'; }
  document.getElementById('linkInsertClose').onclick=closeDialog;
  document.getElementById('linkInsertCancel').onclick=closeDialog;
  overlay.onclick=function(e){ if(e.target===overlay) closeDialog(); };
  document.getElementById('linkInsertConfirm').onclick=function(){
    var url=document.getElementById('linkInsertUrl').value.trim();
    var text=document.getElementById('linkInsertText').value.trim();
    if(!url){ alert('请输入链接地址'); return; }
    insertMd('[' + (text || url) + '](' + url + ')');
    closeDialog();
  };
}

function openLinkDialog(){
  ensureLinkDialog();
  var overlay=document.getElementById('linkInsertOverlay');
  document.getElementById('linkInsertUrl').value='';
  document.getElementById('linkInsertText').value='';
  overlay.style.display='flex';
  setTimeout(function(){ document.getElementById('linkInsertUrl').focus(); }, 30);
}


function ensureInternalLinkDialog(){
  if(document.getElementById('internalLinkOverlay')) return;
  var overlay=document.createElement('div');
  overlay.id='internalLinkOverlay';
  overlay.className='app-overlay';
  overlay.innerHTML=''
    + '<div class="app-dialog" style="width:100%;max-width:520px;max-height:calc(100vh - 84px);display:flex;flex-direction:column;overflow:hidden">'
    +   '<div class="app-dialog-head">'
    +     '<div class="app-dialog-title">插入内部链接</div>'
    +     '<button id="internalLinkClose" class="app-dialog-close">×</button>'
    +   '</div>'
    +   '<div class="app-field" style="overflow:hidden">'
    +     '<div>'
    +       '<div class="app-label">搜索文件</div>'
    +       '<input id="internalLinkSearch" type="text" placeholder="输入文件名筛选" class="app-input">'
    +     '</div>'
    +     '<div style="display:flex;flex-direction:column;min-height:0;flex:1">'
    +       '<div class="app-label">选择文件</div>'
    +       '<div id="internalLinkList" class="app-list"></div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="app-actions">'
    +     '<button id="internalLinkCancel" class="app-btn">取消</button>'
    +     '<button id="internalLinkConfirm" class="app-btn app-btn-primary" disabled>插入</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  function closeDialog(){ overlay.style.display='none'; }
  document.getElementById('internalLinkClose').onclick=closeDialog;
  document.getElementById('internalLinkCancel').onclick=closeDialog;
  overlay.onclick=function(e){ if(e.target===overlay) closeDialog(); };
}

function renderInternalLinkList(files, keyword){
  var list=document.getElementById('internalLinkList');
  var confirmBtn=document.getElementById('internalLinkConfirm');
  if(!list) return;
  list.innerHTML='';
  confirmBtn.disabled=true;
  window._internalLinkSelected='';

  var filtered=(files||[]).filter(function(f){
    if(!f || f.isDir) return false;
    var name=(f.name||'').replace(/.html$/i,'');
    if(!keyword) return true;
    return name.toLowerCase().includes(keyword.toLowerCase()) || (f.path||'').toLowerCase().includes(keyword.toLowerCase());
  });

  if(!filtered.length){
    list.innerHTML='<div style="padding:14px;color:#999;font-size:13px;text-align:center">没有匹配文件</div>';
    return;
  }

  filtered.forEach(function(f){
    var baseName=(f.name||'').replace(/.html$/i,'');
    var relPath=(typeof getRelativeArticlePath==='function' ? getRelativeArticlePath(currentFile||'', f.path||f.name||'') : (f.path||f.name||''));
    relPath=String(relPath||'').replace(/.html$/i,'');
    var item=document.createElement('div');
    item.dataset.name=baseName;
    item.dataset.rel=relPath;
    item.className='app-list-item';
    item.innerHTML='<div class="app-list-title">'+esc(baseName)+'</div><div class="app-list-path">'+esc(relPath)+' → '+esc(f.path||f.name||'')+'</div>';
    item.onclick=function(){
      Array.from(list.children).forEach(function(el){ el.classList.remove('active'); });
      this.classList.add('active');
      window._internalLinkSelected=this.dataset.rel || baseName;
      confirmBtn.disabled=false;
    };
    list.appendChild(item);
  });
}

function loadInternalLinkFiles(callback){
  fetch('/api/list?dir=' + encodeURIComponent('')).then(function(r){return r.json()}).then(function(data){
    var files=[];
    function walkDir(dir, done){
      fetch('/api/list?dir=' + encodeURIComponent(dir||'')).then(function(r){return r.json()}).then(function(d){
        var entries=(d.files||[]);
        var subdirs=entries.filter(function(x){return x.isDir;});
        entries.filter(function(x){return !x.isDir && /.html$/i.test(x.name||'');}).forEach(function(x){ files.push(x); });
        if(!subdirs.length){ done(); return; }
        var left=subdirs.length;
        subdirs.forEach(function(sd){ walkDir(sd.path,function(){ left--; if(left===0) done(); }); });
      }).catch(function(){ done(); });
    }
    walkDir('', function(){ callback(files); });
  }).catch(function(){ callback([]); });
}

function openInternalLinkDialog(){
  ensureInternalLinkDialog();
  var overlay=document.getElementById('internalLinkOverlay');
  var input=document.getElementById('internalLinkSearch');
  var confirmBtn=document.getElementById('internalLinkConfirm');
  overlay.style.display='flex';
  input.value='';
  confirmBtn.disabled=true;
  window._internalLinkSelected='';
  loadInternalLinkFiles(function(files){
    window._internalLinkFiles=files||[];
    renderInternalLinkList(window._internalLinkFiles,'');
  });
  input.oninput=function(){ renderInternalLinkList(window._internalLinkFiles||[], this.value.trim()); };
  confirmBtn.onclick=function(){
    if(!window._internalLinkSelected) return;
    insertMd('[[' + window._internalLinkSelected + ']]');
    overlay.style.display='none';
  };
  setTimeout(function(){ input.focus(); }, 30);
}

function openImageDialog(){
  ensureImageDialog();
  var overlay=document.getElementById('imageInsertOverlay');
  document.getElementById('imageInsertUrl').value='';
  document.getElementById('imageInsertAlt').value='';
  overlay.style.display='flex';
  setTimeout(function(){ document.getElementById('imageInsertUrl').focus(); }, 30);
}

function ensureAssetDialog(){
  if(document.getElementById('assetInsertOverlay')) return;
  var overlay=document.createElement('div');
  overlay.id='assetInsertOverlay';
  overlay.className='app-overlay';
  overlay.innerHTML=''
    + '<div class="app-dialog" style="max-width:520px">'
    +   '<div class="app-dialog-head">'
    +     '<div class="app-dialog-title">上传图片和附件</div>'
    +     '<button id="assetInsertClose" class="app-dialog-close">×</button>'
    +   '</div>'
    +   '<div class="app-label" style="margin-bottom:8px">支持任意格式，大小不超过 5MB，会按当前文章或目录自动归档</div>'
    +   '<input id="assetInsertFile" type="file" style="display:block;width:100%;margin-bottom:12px">'
    +   '<div id="assetInsertInfo" style="font-size:12px;color:#666;margin-bottom:12px"></div>'
    +   '<div class="app-actions">'
    +     '<button id="assetInsertCancel" class="app-btn">取消</button>'
    +     '<button id="assetInsertConfirm" class="app-btn app-btn-primary">上传并插入</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  function closeDialog(){ overlay.style.display='none'; }
  document.getElementById('assetInsertClose').onclick=closeDialog;
  document.getElementById('assetInsertCancel').onclick=closeDialog;
  overlay.onclick=function(e){ if(e.target===overlay) closeDialog(); };
  document.getElementById('assetInsertFile').onchange=function(){
    var f=this.files&&this.files[0];
    document.getElementById('assetInsertInfo').textContent=f?('已选择：'+f.name+'（'+Math.round(f.size/1024)+' KB）'):'';
  };
  document.getElementById('assetInsertConfirm').onclick=async function(){
    var input=document.getElementById('assetInsertFile');
    var f=input.files&&input.files[0];
    if(!f){ alert('请选择文件'); return; }
    if(f.size>5*1024*1024){ alert('文件不能超过 5MB'); return; }
    try{
      var buf=await f.arrayBuffer();
      var bytes=new Uint8Array(buf);
      var binary='';
      for(var i=0;i<bytes.length;i++) binary+=String.fromCharCode(bytes[i]);
      var base64=btoa(binary);
      var r=await fetch('/api/upload-asset',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:f.name,contentBase64:base64,articlePath:currentFile||'',dir:currentDir||''})
      });
      var d=await r.json();
      if(!d.success){ alert('上传失败: '+(d.error||'')); return; }
      var displayName=d.originalName||f.name||d.name||'附件';
      if(d.isImage) insertMd('!['+displayName+']('+d.url+')');
      else insertMd('['+displayName+']('+d.url+')');
      closeDialog();
    }catch(e){ alert('上传失败: '+e.message); }
  };
}

function openAssetDialog(){
  ensureAssetDialog();
  var overlay=document.getElementById('assetInsertOverlay');
  document.getElementById('assetInsertFile').value='';
  document.getElementById('assetInsertInfo').textContent='';
  overlay.style.display='flex';
}

var cmEditor=null;

function editFromView(){
  var iframeSrc=document.getElementById('viewFrame').src;
  // 只允许编辑 /articles/ 下的 .html 文件
  var m=iframeSrc.match(/\/articles\/([^?#]+\.html)/i);
  var isSystemTask=false;
  if(!m){
    m=iframeSrc.match(/\/system\/tasks\/([^?#]+\.html)/i);
    if(m) isSystemTask=true;
  }
  if(!m){
    var title=document.getElementById('viewTitle').textContent;
    if(title==='工作中心')
      alert('当前页面是任务面板，无可编辑的文件');
    else
      alert('当前页面不是可编辑的文件');
    return;
  }
  currentFile=isSystemTask?('__system__/任务管理/'+decodeURIComponent(m[1])):decodeURIComponent(m[1]);
  isNewFileMode=false;
  pendingNewFilePath='';
  document.getElementById('editTitle').textContent=document.getElementById('viewTitle').textContent;
  fetch('/api/read?path='+encodeURIComponent(currentFile)).then(function(r){return r.json()}).then(function(data){
    var md=data.markdown||'';
    var titleInput=document.getElementById('editDocTitle');
    if(titleInput) titleInput.value=((currentFile||'').split('/').pop()||'').replace(/\.html$/i,'');
    // 实时预览
    var preview=document.getElementById('editPreview');
    if(typeof marked!=='undefined'&&marked.parse){preview.innerHTML=renderEditPreview((titleInput&&titleInput.value)||'',md)}
    else{preview.innerHTML='<div class="empty-state"><p>预览加载中...</p></div>'}
    // 初始化 CodeMirror 编辑器
    var parent=document.getElementById('cmEditor');
    parent.innerHTML='';
    var oldTa=document.getElementById('editTextarea');
    if(oldTa) oldTa.remove();
    if(typeof CodeMirrorEditor!=='undefined'){
      cmEditor=CodeMirrorEditor.createEditor(parent,md,function(val){
        if(typeof marked!=='undefined'&&marked.parse)
          document.getElementById('editPreview').innerHTML=renderEditPreview(document.getElementById('editDocTitle').value,val);
      });
    }
    showMode('modeEdit');
    closeMobilePreview();
    try{ window.scrollTo(0,0); }catch(e){}
    bindTitlePreview();
    // 非 CodeMirror 回退：用 textarea
    if(!cmEditor){
      var ta=document.createElement('textarea');
      ta.id='editTextarea';
      ta.style.cssText='flex:1;border:none;padding:12px;font-family:monospace;font-size:13px;line-height:1.6;resize:none;outline:none';
      ta.value=md;
      ta.onkeyup=function(){
        if(typeof marked!=='undefined'&&marked.parse)
          document.getElementById('editPreview').innerHTML=renderEditPreview(document.getElementById('editDocTitle').value,this.value);
      };
      parent.parentNode.insertBefore(ta,parent.nextSibling);
    }
  }).catch(function(e){console.error('读取失败:',e);alert('读取失败')})
}

function backToView(){
  if(confirm('放弃编辑？')){
    if(cmEditor){cmEditor.destroy();cmEditor=null;}
    var oldTa=document.getElementById('editTextarea');
    if(oldTa) oldTa.remove();
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

function bindTitlePreview(){
  var titleInput=document.getElementById('editDocTitle');
  if(!titleInput) return;
  titleInput.oninput=function(){
    var body=cmEditor?CodeMirrorEditor.getContent(cmEditor):(document.getElementById('editTextarea')?document.getElementById('editTextarea').value:'');
    if(typeof marked!=='undefined'&&marked.parse)
      document.getElementById('editPreview').innerHTML=renderEditPreview(this.value,body);
  };
}

function saveEdit(){
  var title=(document.getElementById('editDocTitle').value||'').trim();
  var body;
  if(cmEditor){body=CodeMirrorEditor.getContent(cmEditor);}
  else{body=document.getElementById('editTextarea').value;}
  if(!title){alert('请输入文件名');document.getElementById('editDocTitle').focus();return}
  var markdown=String(body||'').replace(/\r\n/g,'\n');
  if(isNewFileMode){
    if(markdown==='') markdown=NEW_FILE_PLACEHOLDER;
  }else{
    markdown=markdown.replace(/\s+$/,'');
    if(markdown) markdown+='\n';
  }
  var fileName=title.replace(/[\\/:*?"<>|]/g,' ').replace(/\s+/g,' ').trim();
  if(!fileName){alert('文件名无效，请重新输入');return}
  if(isNewFileMode){
    fetch('/api/create-file',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:fileName,dir:currentDir,content:markdown})
    }).then(function(r){return r.json()}).then(function(data){
      if(data.success){
        currentFile=data.path;
        isNewFileMode=false;
        pendingNewFilePath='';
        if(cmEditor){cmEditor.destroy();cmEditor=null;}
        loadDir(currentDir);
        showMode('modeView');viewFile(currentFile,currentFile);
      }else alert('创建失败: '+(data.error||'未知错误'));
    }).catch(function(e){console.error('创建失败:',e);alert('创建失败')});
    return;
  }
  var oldName=(currentFile.split('/').pop()||'').replace(/.html$/i,'');
  var doSave=function(targetPath){
    fetch('/api/save',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:targetPath,markdown:markdown})
    }).then(function(r){return r.json()}).then(function(data){
      if(data.success){
        if(cmEditor){cmEditor.destroy();cmEditor=null;}
        var oldTa=document.getElementById('editTextarea');
        if(oldTa) oldTa.remove();
        showMode('modeView');viewFile(targetPath.split('/').pop(),targetPath);
      }
      else alert('保存失败: '+(data.error||'未知错误'));
    }).catch(function(e){console.error('保存失败:',e);alert('保存失败')})
  };
  if(fileName!==oldName){
    fetch('/api/rename',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({path:currentFile,newName:fileName+'.html'})
    }).then(function(r){return r.json()}).then(function(d){
      if(d.success){
        currentFile=(currentFile.split('/').slice(0,-1).concat([fileName+'.html'])).join('/');
        doSave(currentFile);
      }else alert('重命名失败: '+(d.error||'未知错误'));
    }).catch(function(e){console.error('重命名失败:',e);alert('重命名失败')});
  }else{
    doSave(currentFile);
  }
}

// ── 新建文件 ──
function newFile(targetDir){
  isNewFileMode=true;
  pendingNewFilePath='';
  currentDir=typeof targetDir==='string'?targetDir:(currentDir||'');
  currentFile='';
  document.getElementById('editTitle').textContent='新建文件';
  var titleInput=document.getElementById('editDocTitle');
  if(titleInput) titleInput.value='';
  var preview=document.getElementById('editPreview');
  if(preview) preview.innerHTML=renderEditPreview('',NEW_FILE_PLACEHOLDER);
  var parent=document.getElementById('cmEditor');
  parent.innerHTML='';
  var oldTa=document.getElementById('editTextarea');
  if(oldTa) oldTa.remove();
  if(cmEditor){cmEditor.destroy();cmEditor=null;}
  if(typeof CodeMirrorEditor!=='undefined'){
    cmEditor=CodeMirrorEditor.createEditor(parent,NEW_FILE_PLACEHOLDER,function(val){
      if(typeof marked!=='undefined'&&marked.parse)
        document.getElementById('editPreview').innerHTML=renderEditPreview(document.getElementById('editDocTitle').value,val);
    });
  }
  if(!cmEditor){
    var ta=document.createElement('textarea');
    ta.id='editTextarea';
    ta.style.cssText='flex:1;border:none;padding:12px;font-family:monospace;font-size:13px;line-height:1.6;resize:none;outline:none';
    ta.value=NEW_FILE_PLACEHOLDER;
    ta.onkeyup=function(){
      if(typeof marked!=='undefined'&&marked.parse)
        document.getElementById('editPreview').innerHTML=renderEditPreview(document.getElementById('editDocTitle').value,this.value);
    };
    parent.parentNode.insertBefore(ta,parent.nextSibling);
  }
  bindTitlePreview();
  showMode('modeEdit');
  closeMobilePreview();
  try{ window.scrollTo(0,0); }catch(e){}
  setTimeout(function(){
    if(titleInput) titleInput.focus();
    try{
      if(cmEditor&&typeof CodeMirrorEditor.setSelection==='function'){
        CodeMirrorEditor.setSelection(cmEditor,0,0);
      }
    }catch(e){}
  },30);
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
var editHistory=[];
var editHistoryIdx=-1;
var editHistoryMax=100;
var editIgnoreChange=false;

function initEditHistory(){
  editHistory=[];
  editHistoryIdx=-1;
  var ta=document.getElementById("editTextarea");
  if(ta)saveEditState();
}

function saveEditState(){
  var ta=document.getElementById("editTextarea");
  if(!ta)return;
  var val=ta.value;
  // 如果当前状态和最后一个相同，不重复记录
  if(editHistory.length>0&&editHistory[editHistory.length-1]===val)return;
  // 删除当前位置之后的历史
  if(editHistoryIdx<editHistory.length-1)editHistory=editHistory.slice(0,editHistoryIdx+1);
  editHistory.push(val);
  if(editHistory.length>editHistoryMax)editHistory.shift();
  editHistoryIdx=editHistory.length-1;
}

function undoEdit(){
  if(cmEditor){CodeMirrorEditor.undoEdit(cmEditor);}
}

function redoEdit(){
  if(cmEditor){CodeMirrorEditor.redoEdit(cmEditor);}
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
});

window.navPush = navPush;
window.loadDir = loadDir;
window.viewFile = viewFile;
window.openFromWorkbench = openFromWorkbench;
window.newFile = newFile;
window.backToList = backToList;

window.addEventListener('resize',function(){
  if(!isMobileViewport()){
    closeMobilePreview();
    toggleSidebar(false);
  }
});
