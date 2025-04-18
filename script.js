/* Global variables */
let files = {};
let activeFile = 'index.html';
let maximizedPanel = null;
let fileOrder = [];
let dropCounter = 0;
let currentFileToRename = null;
let currentFileToDelete = null;
let currentFileToDownload = null;
let editor; // CodeMirror editor instance
let prevEditorSize = null;
let prevPreviewSize = null;
let prevConsoleSize = null;
let dragOverlay = null;


/* Initialization: load from localStorage or create defaults */
function init() {
  const saved = localStorage.getItem('webIDE_files');
  if (saved) {
    files = JSON.parse(saved);
  } else {
    files = {
      "index.html": {
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Web Studio</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, World!</h1>
  <script src="script.js"></script>
</body>
</html>`
      },
      "style.css": {
        name: "style.css",
        content: `body {
  font-family: Arial, sans-serif;
  background-color: #f0f0f0;
  margin: 0;
  padding: 20px;
}`
      },
      "script.js": {
        name: "script.js",
        content: `console.log('Hello, World!');`
      }
    };
    saveFiles();
  }
  const order = localStorage.getItem('webIDE_fileOrder');
  if (order) {
    fileOrder = JSON.parse(order);
  } else {
    fileOrder = Object.keys(files);
  }
  
  // Initialize CodeMirror on the textarea
  editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
    lineNumbers: true,
    mode: "htmlmixed",
    theme: "dracula", // You can change or remove the theme if desired
    indentUnit: 2,
    tabSize: 2,
    autoIndent: true
  });
  
  // Ensure CodeMirror fills its container
  editor.setSize("100%", "100%");
  
  // Update file on change
  editor.on('change', function(cm, change) {
    if (activeFile in files) {
      files[activeFile].content = editor.getValue();
      saveFiles();
      // Update preview for primary files
      if (activeFile === 'index.html' || activeFile === 'style.css' || activeFile === 'script.js') {
        updatePreview();
      }
    }
  });
  
  updateTabs();
  loadFile(activeFile);
  updatePreview();
}

/* Save files and order to localStorage */
function saveFiles() {
  localStorage.setItem('webIDE_files', JSON.stringify(files));
  localStorage.setItem('webIDE_fileOrder', JSON.stringify(fileOrder));
}

/* Update file tabs in the left navigation bar */
function updateTabs() {
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';
  fileOrder.forEach(fileName => {
    if (files[fileName]) {
      createTabElement(fileName);
    }
  });
  for (const fileName in files) {
    if (!fileOrder.includes(fileName)) {
      fileOrder.push(fileName);
      createTabElement(fileName);
    }
  }
}

/* Create a tab element with dropdown menu */
function createTabElement(fileName) {
  const tabsContainer = document.getElementById('tabs');
  
  const tabContainer = document.createElement('div');
  tabContainer.className = 'tab-container';
  if (fileName === activeFile) {
    tabContainer.classList.add('active');
  }
  
  // Clicking the file name loads the file
  const tabFilename = document.createElement('span');
  tabFilename.className = 'tab-filename';
  tabFilename.textContent = fileName;
  tabFilename.addEventListener('click', function(e) {
    saveCurrentFile();
    activeFile = fileName;
    loadFile(activeFile);
    updateTabs();
  });
  tabContainer.appendChild(tabFilename);
  
  // Menu toggle button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'tab-menu-btn';
  menuBtn.textContent = '⋮';
  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = tabContainer.querySelector('.dropdown-menu');
    dropdown.classList.toggle('show');
  });
  tabContainer.appendChild(menuBtn);
  
  // Dropdown menu container
  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'dropdown-menu';
  
  // Delete action using custom delete modal
  const deleteItem = document.createElement('div');
  deleteItem.className = 'dropdown-item';
  deleteItem.textContent = 'Delete';
  deleteItem.addEventListener('click', function(e) {
    e.stopPropagation();
    openDeleteModal(fileName);
    dropdownMenu.classList.remove('show');
  });
  dropdownMenu.appendChild(deleteItem);
  
  // Download action using custom download modal
  const downloadItem = document.createElement('div');
  downloadItem.className = 'dropdown-item';
  downloadItem.textContent = 'Download';
  downloadItem.addEventListener('click', function(e) {
    e.stopPropagation();
    openDownloadModal(fileName);
    dropdownMenu.classList.remove('show');
  });
  dropdownMenu.appendChild(downloadItem);
  
  // Rename action using custom rename modal
  const renameItem = document.createElement('div');
  renameItem.className = 'dropdown-item';
  renameItem.textContent = 'Rename';
  renameItem.addEventListener('click', function(e) {
    e.stopPropagation();
    openRenameModal(fileName);
    dropdownMenu.classList.remove('show');
  });
  dropdownMenu.appendChild(renameItem);
  
  tabContainer.appendChild(dropdownMenu);
  
  /* Drag and drop events for reordering tabs */
  tabContainer.setAttribute('draggable', true);
  tabContainer.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/plain', fileName);
    tabContainer.classList.add('dragging');
  });
  tabContainer.addEventListener('dragend', function(e) {
    tabContainer.classList.remove('dragging');
  });
  tabContainer.addEventListener('dragover', function(e) {
    e.preventDefault();
    tabContainer.classList.add('dragover');
  });
  tabContainer.addEventListener('dragleave', function(e) {
    tabContainer.classList.remove('dragover');
  });
  tabContainer.addEventListener('drop', function(e) {
    e.preventDefault();
    tabContainer.classList.remove('dragover');
    const draggedFile = e.dataTransfer.getData('text/plain');
    if (draggedFile && draggedFile !== fileName) {
      const draggedIndex = fileOrder.indexOf(draggedFile);
      const targetIndex = fileOrder.indexOf(fileName);
      if (draggedIndex > -1 && targetIndex > -1) {
        fileOrder.splice(draggedIndex, 1);
        fileOrder.splice(targetIndex, 0, draggedFile);
        updateTabs();
        saveFiles();
      }
    }
  });
  
  tabsContainer.appendChild(tabContainer);
}

/* Close any open dropdown menus when clicking outside */
document.addEventListener('click', function(e) {
  document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
    menu.classList.remove('show');
  });
});

/* Load file content into the CodeMirror editor */
function loadFile(fileName) {
  const file = files[fileName];
  editor.setValue(file.content);
  // Update CodeMirror mode based on file extension
  let mode = "text/plain";
  if (fileName.endsWith(".html")) mode = "htmlmixed";
  else if (fileName.endsWith(".css")) mode = "css";
  else if (fileName.endsWith(".js")) mode = "javascript";
  editor.setOption("mode", mode);
}

/* Save the current file content */
function saveCurrentFile() {
  if (activeFile in files) {
    files[activeFile].content = editor.getValue();
    saveFiles();
  }
}

/* Update the live preview iframe */
function updatePreview() {
  saveCurrentFile();
  let blobUrls = {};
  for (const fileName in files) {
    if (fileName !== 'index.html') {
      let mime;
      if (fileName.endsWith('.css')) mime = 'text/css';
      else if (fileName.endsWith('.js')) mime = 'text/javascript';
      else if (fileName.endsWith('.html')) mime = 'text/html';
      else mime = 'text/plain';
      const blob = new Blob([files[fileName].content], { type: mime });
      blobUrls[fileName] = URL.createObjectURL(blob);
    }
  }
  let htmlContent = files['index.html'].content;
  htmlContent = htmlContent.replace(/href="([^"]+)"/g, function(match, p1) {
    return blobUrls[p1] ? 'href="' + blobUrls[p1] + '"' : match;
  });
  htmlContent = htmlContent.replace(/src="([^"]+)"/g, function(match, p1) {
    return blobUrls[p1] ? 'src="' + blobUrls[p1] + '"' : match;
  });
  
  const injection = `<script>(function(){var oldLog = console.log; console.log = function(){oldLog.apply(console, arguments); window.parent.postMessage({type:'console', data:Array.from(arguments)}, '*');};})()<\/script>`;
  htmlContent = htmlContent.replace("<head>", "<head>" + injection);
  
  const iframe = document.getElementById('previewFrame');
  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlContent);
  iframe.contentDocument.close();
}

/* Open Create File Modal */
function openCreateFileModal() {
  const modal = document.getElementById('createFileModal');
  const input = document.getElementById('createFileInput');
  input.value = "";
  modal.classList.remove('hidden');
  input.focus();
}

/* Open Download File Modal */
function openDownloadModal(fileName) {
  currentFileToDownload = fileName;
  const modal = document.getElementById('downloadModal');
  const input = document.getElementById('downloadInput');
  input.value = fileName;
  modal.classList.remove('hidden');
  input.focus();
}

/* Open Zip Export Modal */
function openZipModal() {
  const modal = document.getElementById('zipModal');
  const input = document.getElementById('zipInput');
  if (!input.value) {
    input.value = "project.zip";
  }
  modal.classList.remove('hidden');
  input.focus();
}

/* Open Rename Modal */
function openRenameModal(fileName) {
  currentFileToRename = fileName;
  const modal = document.getElementById('renameModal');
  const input = document.getElementById('renameInput');
  input.value = fileName;
  modal.classList.remove('hidden');
  input.focus();
}

/* Open Delete Confirmation Modal */
function openDeleteModal(fileName) {
  currentFileToDelete = fileName;
  const modal = document.getElementById('deleteModal');
  const msg = document.getElementById('deleteModalMessage');
  msg.textContent = `Are you sure you want to delete "${fileName}"?`;
  modal.classList.remove('hidden');
}

/* Export a single file with an optional download name */
function exportFile(fileName, downloadName) {
  const file = files[fileName];
  const blob = new Blob([file.content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = downloadName || fileName;
  a.click();
}

/* Export all files as a ZIP file */
function exportZipFile(zipName) {
  const zip = new JSZip();
  for (const fileName in files) {
    zip.file(fileName, files[fileName].content);
  }
  zip.generateAsync({ type: "blob" })
    .then(function(content) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = zipName;
      a.click();
    });
}

/* Event listeners for New File, Import, and Export All */
document.getElementById('newFileBtn').addEventListener('click', openCreateFileModal);
document.getElementById('importBtn').addEventListener('click', function() {
  document.getElementById('importInput').click();
});
document.getElementById('importInput').addEventListener('change', function(event) {
  const fileList = event.target.files;
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const reader = new FileReader();
    reader.onload = function(e) {
      files[file.name] = { name: file.name, content: e.target.result };
      if (!fileOrder.includes(file.name)) {
        fileOrder.push(file.name);
      }
      updateTabs();
      saveFiles();
      if (file.name === 'index.html' || file.name === 'style.css' || file.name === 'script.js') {
        updatePreview();
      }
    };
    reader.readAsText(file);
  }
});
document.getElementById('exportAllBtn').addEventListener('click', openZipModal);

/* Event listeners for Create File Modal */
document.getElementById('createFileCancelBtn').addEventListener('click', function() {
  document.getElementById('createFileModal').classList.add('hidden');
});
document.getElementById('createFileConfirmBtn').addEventListener('click', function() {
  const input = document.getElementById('createFileInput');
  const fileName = input.value.trim();
  if (!fileName) {
    alert("File name cannot be empty.");
    return;
  }
  if (files[fileName]) {
    alert("File already exists.");
    return;
  }
  files[fileName] = { name: fileName, content: "" };
  fileOrder.push(fileName);
  activeFile = fileName;
  updateTabs();
  loadFile(activeFile);
  saveFiles();
  document.getElementById('createFileModal').classList.add('hidden');
});

/* Event listeners for Download File Modal */
document.getElementById('downloadCancelBtn').addEventListener('click', function() {
  document.getElementById('downloadModal').classList.add('hidden');
});
document.getElementById('downloadConfirmBtn').addEventListener('click', function() {
  const input = document.getElementById('downloadInput');
  const newName = input.value.trim();
  if (!newName) {
    alert("File name cannot be empty.");
    return;
  }
  exportFile(currentFileToDownload, newName);
  document.getElementById('downloadModal').classList.add('hidden');
});

/* Event listeners for Export ZIP Modal */
document.getElementById('zipCancelBtn').addEventListener('click', function() {
  document.getElementById('zipModal').classList.add('hidden');
});
document.getElementById('zipConfirmBtn').addEventListener('click', function() {
  const input = document.getElementById('zipInput');
  let zipName = input.value.trim();
  if (!zipName) {
    alert("ZIP file name cannot be empty.");
    return;
  }
  if (!zipName.toLowerCase().endsWith('.zip')) {
    zipName += '.zip';
  }
  exportZipFile(zipName);
  document.getElementById('zipModal').classList.add('hidden');
});

/* Event listeners for Rename Modal */
document.getElementById('renameCancelBtn').addEventListener('click', function() {
  document.getElementById('renameModal').classList.add('hidden');
});
document.getElementById('renameSaveBtn').addEventListener('click', function() {
  const input = document.getElementById('renameInput');
  const newName = input.value.trim();
  if (!newName) {
    alert("File name cannot be empty.");
    return;
  }
  if (newName === currentFileToRename) {
    document.getElementById('renameModal').classList.add('hidden');
    return;
  }
  if (files[newName]) {
    alert("A file with that name already exists.");
    return;
  }
  files[newName] = { name: newName, content: files[currentFileToRename].content };
  delete files[currentFileToRename];
  const index = fileOrder.indexOf(currentFileToRename);
  if (index > -1) {
    fileOrder[index] = newName;
  }
  if (activeFile === currentFileToRename) {
    activeFile = newName;
  }
  updateTabs();
  loadFile(activeFile);
  saveFiles();
  if (
    newName === 'index.html' || newName === 'style.css' || newName === 'script.js' ||
    currentFileToRename === 'index.html' || currentFileToRename === 'style.css' || currentFileToRename === 'script.js'
  ) {
    updatePreview();
  }
  document.getElementById('renameModal').classList.add('hidden');
});

/* Event listeners for Delete Confirmation Modal */
document.getElementById('deleteCancelBtn').addEventListener('click', function() {
  document.getElementById('deleteModal').classList.add('hidden');
});
document.getElementById('deleteConfirmBtn').addEventListener('click', function() {
  if (currentFileToDelete) {
    let fileName = currentFileToDelete;
    delete files[fileName];
    const index = fileOrder.indexOf(fileName);
    if (index > -1) {
      fileOrder.splice(index, 1);
    }
    if (activeFile === fileName) {
      const fileNames = Object.keys(files);
      activeFile = fileNames.length ? fileNames[0] : 'index.html';
      if (!files[activeFile]) {
        files[activeFile] = { name: activeFile, content: '' };
        fileOrder.push(activeFile);
      }
      loadFile(activeFile);
    }
    updateTabs();
    saveFiles();
    if (fileName === 'index.html' || fileName === 'style.css' || fileName === 'script.js') {
      updatePreview();
    }
    document.getElementById('deleteModal').classList.add('hidden');
  }
});

/* Maximize panel buttons */
document.getElementById('maximizeLeftBtn').addEventListener('click', function() {
  toggleMaximize('left');
});
document.getElementById('maximizeRightBtn').addEventListener('click', function() {
  toggleMaximize('right');
});

function toggleMaximize(panel) {
  const ed = document.getElementById('editorPane');
  const pr = document.getElementById('previewPane');
  const btnL = document.getElementById('maximizeLeftBtn');
  const btnR = document.getElementById('maximizeRightBtn');
  const bar  = document.getElementById('verticalResizer');

  if (maximizedPanel === panel) {
    // un-maximize: restore last drag sizes, show bar
    ed.style.flex      = prevEditorSize  || '1';
    pr.style.flex      = prevPreviewSize || '1';
    bar.style.display  = 'block';
    btnL.textContent   = 'Maximize Editor';
    btnR.textContent   = 'Maximize Preview';
    maximizedPanel     = null;

  } else if (panel === 'left') {
    // maximize editor
    prevEditorSize     = ed.style.flex;
    prevPreviewSize    = pr.style.flex;
    ed.style.flex      = '1 1 100%';
    pr.style.flex      = '0';
    bar.style.display  = 'none';
    btnL.textContent   = 'Minimize Editor';
    btnR.textContent   = 'Maximize Preview';
    maximizedPanel     = 'left';

  } else if (panel === 'right') {
    // maximize preview
    prevEditorSize     = ed.style.flex;
    prevPreviewSize    = pr.style.flex;
    pr.style.flex      = '1 1 100%';
    ed.style.flex      = '0';
    bar.style.display  = 'none';
    btnR.textContent   = 'Minimize Preview';
    btnL.textContent   = 'Maximize Editor';
    maximizedPanel     = 'right';
  }
}

/* Toggle Console Panel */
document.getElementById('toggleConsoleBtn').addEventListener('click', function() {
  const consolePanel = document.getElementById('consolePanel');
  const toggleConsoleBtn = document.getElementById('toggleConsoleBtn');
  if (consolePanel.classList.contains('hidden')) {
    consolePanel.classList.remove('hidden');
    toggleConsoleBtn.textContent = "Hide Console";
  } else {
    consolePanel.classList.add('hidden');
    toggleConsoleBtn.textContent = "Show Console";
  }
});
document.getElementById('clearConsoleBtn').addEventListener('click', function() {
  document.getElementById('consoleOutput').innerHTML = '';
});
document.getElementById('refreshPreviewBtn').addEventListener('click', function() {
  updatePreview();
});

/* Listen for console messages from the preview iframe */
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'console') {
    const output = document.getElementById('consoleOutput');
    let text = event.data.data.join(' ');
    output.innerHTML += text + "\n";
    output.scrollTop = output.scrollHeight;
  }
});

/* Drag-and-Drop File Import */
// When a file is dragged into the document, increase the counter and show overlay
document.addEventListener('dragenter', function(e) {
  e.preventDefault();
  dropCounter++;
  let dropOverlay = document.getElementById('dropOverlay');
  dropOverlay.classList.remove('hidden');
  dropOverlay.classList.add('active');
});

// Prevent default dragover behavior
document.addEventListener('dragover', function(e) {
  e.preventDefault();
});

// Use a small timeout on dragleave so that the overlay is not hidden prematurely
document.addEventListener('dragleave', function(e) {
  dropCounter--;
  setTimeout(() => {
    if (dropCounter <= 0) {
      dropCounter = 0;
      let dropOverlay = document.getElementById('dropOverlay');
      dropOverlay.classList.remove('active');
      dropOverlay.classList.add('hidden');
    }
  }, 50);
});

// On drop, reset counter and hide overlay, then process files
document.addEventListener('drop', function(e) {
  e.preventDefault();
  dropCounter = 0;
  let dropOverlay = document.getElementById('dropOverlay');
  dropOverlay.classList.remove('active');
  dropOverlay.classList.add('hidden');
  const fileList = e.dataTransfer.files;
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const reader = new FileReader();
    reader.onload = function(e) {
      files[file.name] = { name: file.name, content: e.target.result };
      if (!fileOrder.includes(file.name)) {
        fileOrder.push(file.name);
      }
      updateTabs();
      saveFiles();
      if (file.name === 'index.html' || file.name === 'style.css' || file.name === 'script.js') {
        updatePreview();
      }
    };
    reader.readAsText(file);
  }
});

/* Save current file before the window unloads */
window.addEventListener('beforeunload', saveCurrentFile);
window.addEventListener('load', init);

// ─── Horizontal resizing for console ────────────────────────────────────────
const horizontalResizer = document.getElementById('horizontalResizer');
let isResizingHoriz = false;

horizontalResizer.addEventListener('mousedown', () => {
  isResizingHoriz = true;
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', e => {
  if (!isResizingHoriz) return;
  const btHeight = document.getElementById('bottomToolbar').offsetHeight;
  let consolePx = window.innerHeight - e.clientY - btHeight;
  let pct = consolePx / window.innerHeight * 100;
  pct = Math.min(Math.max(pct, 20), 70);
  if (Math.abs(pct - 33.33) < 2) pct = 33.33;  // snap to default
  document.getElementById('consolePanel').style.height = `${pct}vh`;
});

document.addEventListener('mouseup', () => {
  if (isResizingHoriz) {
    isResizingHoriz = false;
    document.body.style.userSelect = '';
  }
});

// ─── Enhanced vertical splitter with overlay & gentler snap ────────────────
const verticalResizer = document.getElementById('verticalResizer');
let isResizingVert = false;

verticalResizer.addEventListener('mousedown', e => {
  isResizingVert = true;
  document.body.style.userSelect = 'none';

  // disable pane flex-transitions for instant response
  const ed = document.getElementById('editorPane');
  const pr = document.getElementById('previewPane');
  ed.style.transition = 'none';
  pr.style.transition = 'none';

  // create a full-page transparent overlay so the iframe won't swallow events
  dragOverlay = document.createElement('div');
  Object.assign(dragOverlay.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100%', height: '100%',
    cursor: 'col-resize',
    zIndex: '999'
  });
  document.body.appendChild(dragOverlay);
});

document.addEventListener('mousemove', e => {
  if (!isResizingVert) return;
  const container = document.getElementById('container');
  const rect = container.getBoundingClientRect();
  let pct = (e.clientX - rect.left) / rect.width * 100;
  pct = Math.min(Math.max(pct, 20), 80);
  // gentler snapping: only within 1% of center
  if (Math.abs(pct - 50) < 1) pct = 50;

  // apply new sizes and move the bar
  const ed = document.getElementById('editorPane');
  const pr = document.getElementById('previewPane');
  ed.style.flex = `0 0 ${pct}%`;
  pr.style.flex = `0 0 ${100 - pct}%`;
  verticalResizer.style.left = `${pct}%`;
});

document.addEventListener('mouseup', () => {
  if (!isResizingVert) return;
  isResizingVert = false;
  document.body.style.userSelect = '';

  // restore pane transitions
  const ed = document.getElementById('editorPane');
  const pr = document.getElementById('previewPane');
  ed.style.transition = '';
  pr.style.transition = '';

  // remove the overlay
  if (dragOverlay) {
    document.body.removeChild(dragOverlay);
    dragOverlay = null;
  }
});

// position the bar at 50% on load
window.addEventListener('load', () => {
  verticalResizer.style.left = '50%';
});
