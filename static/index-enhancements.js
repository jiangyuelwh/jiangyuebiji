// ── 快捷键 ──
document.addEventListener("keydown", function(e) {
  // Ctrl+S 保存
  if ((e.ctrlKey||e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (document.getElementById("modeEdit").classList.contains("active")) saveEdit();
  }
  // Ctrl+F 搜索
  if ((e.ctrlKey||e.metaKey) && e.key === "f") {
    e.preventDefault();
    var sb = document.getElementById("searchBox");
    if (sb) { sb.focus(); sb.select(); }
  }
  // Ctrl+E 编辑
  if ((e.ctrlKey||e.metaKey) && e.key === "e") {
    e.preventDefault();
    if (document.getElementById("modeView").classList.contains("active") && document.getElementById("viewEditBtn").style.display !== "none")
      editFromView();
  }
});

// ── 自动保存 ──
var autoSaveTimer = null;
function startAutoSave() {
  stopAutoSave();
  autoSaveTimer = setInterval(function() {
    if (document.getElementById("modeEdit").classList.contains("active")) {
      console.log("[AutoSave] 自动保存...");
      saveEdit();
    }
  }, 120000); // 2分钟
}
function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

// ── 最近打开列表 ──
var RECENT_KEY = "liruibiji_recent";
function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch(e) { return []; }
}
function addRecent(path, title) {
  var list = getRecent().filter(function(x) { return x.path !== path; });
  list.unshift({ path: path, title: title || path, time: Date.now() });
  if (list.length > 20) list = list.slice(0, 20);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch(e) {}
  renderRecent();
}
function renderRecent() {
  var el = document.getElementById("recentList");
  if (!el) return;
  var list = getRecent().slice(0, 10);
  el.innerHTML = list.length ? "" : '<div class="recent-item" style="cursor:default;color:#ccc;">暂无记录</div>';
  list.forEach(function(item) {
    var d = document.createElement("div");
    d.className = "recent-item";
    d.innerHTML = '<i class="bi bi-clock-history"></i> ' + esc(item.title);
    d.onclick = function() { viewFile(item.title, item.path); };
    el.appendChild(d);
  });
}

// ── 拖拽移动 ──
var dragFile = null;
function initDrag() {
  document.addEventListener("dragstart", function(e) {
    var row = e.target.closest(".file-row");
    if (row && row.dataset && row.dataset.path) {
      dragFile = row.dataset.path;
      e.dataTransfer.effectAllowed = "move";
      row.classList.add("dragging");
    }
  });
  document.addEventListener("dragend", function(e) {
    document.querySelectorAll(".file-row.dragging").forEach(function(x) { x.classList.remove("dragging"); });
    document.querySelectorAll(".dir-item.drag-over").forEach(function(x) { x.classList.remove("drag-over"); });
  });
  document.addEventListener("dragover", function(e) {
    var dir = e.target.closest(".dir-item");
    if (dir) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; dir.classList.add("drag-over"); }
  });
  document.addEventListener("dragleave", function(e) {
    var dir = e.target.closest(".dir-item");
    if (dir) dir.classList.remove("drag-over");
  });
  document.addEventListener("drop", function(e) {
    var dir = e.target.closest(".dir-item");
    if (dir && dragFile) {
      e.preventDefault();
      dir.classList.remove("drag-over");
      var targetPath = dir.dataset.path || "";
      fetch("/api/move", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:dragFile,targetDir:targetPath})})
      .then(function(r){return r.json()}).then(function(d){
        if(d.success) { loadDir(currentDir); loadDirs(); }
        else alert("移动失败: "+(d.error||""));
      });
      dragFile = null;
    }
  });
}

// ── 右键菜单 ──
var contextMenu = null;
function showContextMenu(e, path, isDir) {
  e.preventDefault();
  hideContextMenu();
  contextMenu = document.createElement("div");
  contextMenu.className = "context-menu";
  contextMenu.style.left = e.clientX + "px";
  contextMenu.style.top = e.clientY + "px";
  var items = [];
  if (isDir) {
    items.push({ icon: "bi-file-plus", text: "新建文件", action: function() { currentDir = path; newFile(); } });
    items.push({ icon: "bi-folder-plus", text: "新建文件夹", action: function() { currentDir = path; newFolder(); } });
    items.push({ icon: "bi-arrow-down-up", text: "展开/聚合", action: function() { toggleExpandDir(path); } });
    items.push({ icon: "bi-pencil", text: "重命名", action: function() { renameItem(path.split("/").pop(), path, true); } });
  } else {
    items.push({ icon: "bi-pencil", text: "重命名", action: function() { renameItem(path.split("/").pop(), path, false); } });
    items.push({ icon: "bi-arrow-right", text: "移动到", action: function() { moveItem(path.split("/").pop(), path); } });
    items.push({ icon: "bi-trash", text: "删除", danger: true, action: function() { deleteItem(path.split("/").pop(), path, false); } });
  }
  items.forEach(function(item) {
    var div = document.createElement("div");
    div.className = "context-menu-item" + (item.danger ? " danger" : "");
    div.innerHTML = '<i class="bi ' + item.icon + '"></i> ' + item.text;
    div.onclick = function() { hideContextMenu(); item.action(); };
    contextMenu.appendChild(div);
  });
  document.body.appendChild(contextMenu);
  // Adjust if off-screen
  var rect = contextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth) contextMenu.style.left = (window.innerWidth - rect.width - 10) + "px";
  if (rect.bottom > window.innerHeight) contextMenu.style.top = (window.innerHeight - rect.height - 10) + "px";
}
function hideContextMenu() {
  if (contextMenu) { contextMenu.remove(); contextMenu = null; }
}
document.addEventListener("click", hideContextMenu);
document.addEventListener("scroll", hideContextMenu, true);


// expand/collapse toggle
function toggleExpandDir(path) {
  hideContextMenu();
  var firstChild = null;
  if (path === "") {
    firstChild = document.querySelector("#dirTree > .dir-children");
  } else {
    var items = document.querySelectorAll("#dirTree .dir-item");
    for (var i = 0; i < items.length; i++) {
      if (items[i].dataset.path === path) {
        firstChild = items[i].nextElementSibling;
        break;
      }
    }
  }
  if (!firstChild || !firstChild.classList.contains("dir-children")) return;
  var anyCollapsed = false;
  var allChildren = firstChild.querySelectorAll(":scope > .dir-children");
  for (var i = 0; i < allChildren.length; i++) {
    if (!allChildren[i].classList.contains("open")) { anyCollapsed = true; break; }
  }
  var expand = anyCollapsed || !firstChild.classList.contains("open");
  toggleDeep(firstChild, expand);
}
function toggleDeep(el, expand) {
  if (expand) el.classList.add("open"); else el.classList.remove("open");
  var arrows = el.querySelectorAll(".dir-item > .arrow");
  for (var i = 0; i < arrows.length; i++) {
    if (expand) arrows[i].classList.add("expanded"); else arrows[i].classList.remove("expanded");
  }
  var children = el.querySelectorAll(":scope > .dir-children");
  for (var i = 0; i < children.length; i++) toggleDeep(children[i], expand);
}
// ── Wiki 引用链接解析 ──
function parseWikiLinks(html) {
  return html.replace(/\[\[([^\]]+)\]\]/g, function(m, name) {
    var raw = String(name || '').trim();
    var displayName = raw.replace(/\.html$/i, '').split('/').pop();
    var filePath = raw;
    if (typeof resolveInternalLinkPath === 'function') {
      filePath = resolveInternalLinkPath(raw, currentFile || '');
    } else {
      if (!/\.html$/i.test(filePath)) filePath += '.html';
    }
    return '<a class="wiki-link" href="javascript:void(0)" onclick="event.stopPropagation();viewFile(\''
      + escAttr(displayName)
      + '\',\''
      + escAttr(filePath)
      + '\')">'
      + esc(displayName)
      + '</a>';
  });
}

// Hook into marked parse
var origMarkedParse = null;
if (typeof marked !== "undefined" && marked.parse) {
  origMarkedParse = marked.parse;
  marked.parse = function(src, opts) {
    var html = origMarkedParse(src, opts);
    return parseWikiLinks(html);
  };
}

// ── 暗色模式 ──
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  try { localStorage.setItem("liruibiji_dark", document.body.classList.contains("dark") ? "1" : "0"); } catch(e) {}
}
// 恢复暗色模式状态
try { if (localStorage.getItem("liruibiji_dark") === "1") document.body.classList.add("dark"); } catch(e) {}

// 页面加载完成后初始化
(function() {
  renderRecent();
  initDrag();
  // viewFile already tracks recent from the file row onclick
  // Patch editFromView to start auto-save
  var origEdit = window.editFromView;
  if (origEdit) {
    window.editFromView = function() {
      startAutoSave();
      return origEdit.apply(this, arguments);
    };
  }
  // Patch backToView to stop auto-save
  var origBack = window.backToView || window.cancelEdit;
  if (origBack) {
    window.backToView = function() {
      stopAutoSave();
      return origBack.apply(this, arguments);
    };
  }
  
  // Add right-click on dir tree items
  document.getElementById("dirTree").addEventListener("contextmenu", function(e) {
    var dir = e.target.closest(".dir-item");
    if (dir) {
      var path = dir.dataset.path;
      var isDir = true;
      showContextMenu(e, path, isDir);
    }
  });
})();


// ── 工具栏排序功能 ──
var toolbarReorderActive = false;

function getToolbar() {
  return document.getElementById('mdToolbar');
}

function getToolbarButtons() {
  var toolbar = getToolbar();
  if (!toolbar) return [];
  return Array.from(toolbar.querySelectorAll('.btn-tb')).filter(function(btn) {
    return btn.id !== 'reorderBtn';
  });
}

function getToolbarButtonKey(btn) {
  return btn.getAttribute('title') || btn.textContent.trim();
}

function applyToolbarOrder(order) {
  var toolbar = getToolbar();
  if (!toolbar) return;
  var reorderBtn = document.getElementById('reorderBtn');
  var buttons = getToolbarButtons();
  var map = {};
  buttons.forEach(function(btn) { map[getToolbarButtonKey(btn)] = btn; });

  Array.from(toolbar.querySelectorAll('.tb-divider')).forEach(function(el) { el.remove(); });
  buttons.forEach(function(btn) { btn.remove(); });
  if (reorderBtn) reorderBtn.remove();

  var appended = {};
  (order || []).forEach(function(key) {
    if (map[key] && !appended[key]) {
      toolbar.appendChild(map[key]);
      appended[key] = true;
    }
  });

  buttons.forEach(function(btn) {
    var key = getToolbarButtonKey(btn);
    if (!appended[key]) toolbar.appendChild(btn);
  });

  var divider = document.createElement('span');
  divider.className = 'tb-divider';
  toolbar.appendChild(divider);
  if (reorderBtn) toolbar.appendChild(reorderBtn);
}

function saveToolbarOrder(order) {
  try { localStorage.setItem('liruibiji_toolbar_order', JSON.stringify(order)); } catch(e) {}
}

function loadToolbarOrder() {
  try {
    var raw = localStorage.getItem('liruibiji_toolbar_order');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function restoreToolbarOrder() {
  var order = loadToolbarOrder();
  if (order && Array.isArray(order) && order.length) applyToolbarOrder(order);
}

function toggleReorder() {
  toolbarReorderActive = !toolbarReorderActive;
  var btn = document.getElementById('reorderBtn');
  if (!btn) return;
  if (toolbarReorderActive) {
    btn.style.background = '#477F8A';
    btn.style.color = '#fff';
    btn.style.borderRadius = '4px';
    showToolbarReorderDialog();
  } else {
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderRadius = '';
    closeToolbarReorderDialog();
  }
}

function showToolbarReorderDialog() {
  closeToolbarReorderDialog();
  var buttons = getToolbarButtons();
  if (buttons.length < 2) {
    alert('工具栏按钮太少，无需排序');
    toolbarReorderActive = false;
    var btn = document.getElementById('reorderBtn');
    if (btn) { btn.style.background = ''; btn.style.color = ''; btn.style.borderRadius = ''; }
    return;
  }

  var overlay = document.createElement('div');
  overlay.id = 'toolbarReorderOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:3000;display:flex;align-items:flex-start;justify-content:center;padding-top:40px';

  var box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:12px;width:90%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,0.15)';

  var header = document.createElement('div');
  header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #e8e8e8;font-size:16px;font-weight:600;display:flex;justify-content:space-between;align-items:center';
  header.innerHTML = '<span>工具栏按钮排序</span><button id="toolbarReorderClose" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#888">✕</button>';

  var tips = document.createElement('div');
  tips.style.cssText = 'padding:10px 20px;font-size:12px;color:#666;border-bottom:1px solid #f0f0f0';
  tips.textContent = '拖拽下面的项目调整工具栏按钮顺序';

  var listWrap = document.createElement('div');
  listWrap.style.cssText = 'flex:1;overflow-y:auto;padding:10px 12px';
  var list = document.createElement('div');
  list.id = 'toolbarReorderList';
  list.style.cssText = 'display:flex;flex-direction:column;gap:6px';

  buttons.forEach(function(btn, idx) {
    var key = getToolbarButtonKey(btn);
    var item = document.createElement('div');
    item.draggable = true;
    item.dataset.key = key;
    item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;cursor:grab;font-size:14px';
    item.innerHTML = '<span style="width:24px;text-align:right;color:#999;flex-shrink:0">' + (idx + 1) + '</span><span style="flex:1">' + key + '</span><span style="color:#bbb;flex-shrink:0">⠿</span>';

    item.addEventListener('dragstart', function(e) {
      e.dataTransfer.setData('text/plain', this.dataset.key);
      this.style.opacity = '0.5';
    });
    item.addEventListener('dragend', function() {
      this.style.opacity = '';
      Array.from(list.children).forEach(function(el) { el.style.border = '1px solid #e5e7eb'; });
    });
    item.addEventListener('dragover', function(e) {
      e.preventDefault();
      Array.from(list.children).forEach(function(el) { el.style.border = '1px solid #e5e7eb'; });
      this.style.border = '2px solid #477F8A';
    });
    item.addEventListener('drop', function(e) {
      e.preventDefault();
      var fromKey = e.dataTransfer.getData('text/plain');
      var fromEl = Array.from(list.children).find(function(el) { return el.dataset.key === fromKey; });
      var toEl = this;
      if (!fromEl || fromEl === toEl) return;
      var children = Array.from(list.children);
      var fromIdx = children.indexOf(fromEl);
      var toIdx = children.indexOf(toEl);
      if (fromIdx < toIdx) list.insertBefore(fromEl, toEl.nextSibling);
      else list.insertBefore(fromEl, toEl);
      Array.from(list.children).forEach(function(el, i) {
        el.querySelector('span').textContent = i + 1;
        el.style.border = '1px solid #e5e7eb';
      });
    });

    list.appendChild(item);
  });

  listWrap.appendChild(list);

  var footer = document.createElement('div');
  footer.style.cssText = 'padding:12px 20px;border-top:1px solid #e8e8e8;display:flex;gap:8px;justify-content:flex-end';
  footer.innerHTML = '<button id="toolbarReorderCancel" style="padding:8px 20px;border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;cursor:pointer;font-size:14px">取消</button><button id="toolbarReorderConfirm" style="padding:8px 20px;background:#477F8A;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500">确认排序</button>';

  box.appendChild(header);
  box.appendChild(tips);
  box.appendChild(listWrap);
  box.appendChild(footer);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('toolbarReorderClose').onclick = function() { closeToolbarReorderDialog(); toggleReorder(); };
  document.getElementById('toolbarReorderCancel').onclick = function() { closeToolbarReorderDialog(); toggleReorder(); };
  document.getElementById('toolbarReorderConfirm').onclick = function() {
    var order = Array.from(document.querySelectorAll('#toolbarReorderList > div')).map(function(el) { return el.dataset.key; });
    applyToolbarOrder(order);
    saveToolbarOrder(order);
    closeToolbarReorderDialog();
    toggleReorder();
  };

  overlay.onclick = function(e) { if (e.target === this) { closeToolbarReorderDialog(); toggleReorder(); } };
}

function closeToolbarReorderDialog() {
  var el = document.getElementById('toolbarReorderOverlay');
  if (el) el.remove();
}

setTimeout(restoreToolbarOrder, 0);
