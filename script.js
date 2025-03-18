/* Global variables */
let files = {};
let activeFile = 'index.html';
let maximizedPanel = null;
let fileOrder = [];
let dropCounter = 0;
let currentFileToRename = null;
let currentFileToDelete = null;
let currentFileToDownload = null;

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

/* Load file content into the editor */
function loadFile(fileName) {
  const file = files[fileName];
  const codeEditor = document.getElementById('codeEditor');
  codeEditor.value = file.content;
  updateLineNumbers();
}

/* Save the current file content */
function saveCurrentFile() {
  const codeEditor = document.getElementById('codeEditor');
  if (activeFile in files) {
    files[activeFile].content = codeEditor.value;
    saveFiles();
  }
}

/* Update line numbers based on the code editor */
function updateLineNumbers() {
  const codeEditor = document.getElementById('codeEditor');
  const lineNumbers = document.getElementById('lineNumbers');
  const lines = codeEditor.value.split("\n").length;
  let numbersHtml = "";
  for (let i = 1; i <= lines; i++) {
    numbersHtml += i + "<br>";
  }
  lineNumbers.innerHTML = numbersHtml;
}

/* Editor events */
document.getElementById('codeEditor').addEventListener('input', function() {
  updateLineNumbers();
  if (activeFile in files) {
    files[activeFile].content = this.value;
    saveFiles();
    if (activeFile === 'index.html' || activeFile === 'style.css' || activeFile === 'script.js') {
      updatePreview();
    }
  }
});
document.getElementById('codeEditor').addEventListener('scroll', function() {
  document.getElementById('lineNumbers').scrollTop = this.scrollTop;
});

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
  const editorPane = document.getElementById('editorPane');
  const previewPane = document.getElementById('previewPane');
  const maximizeLeftBtn = document.getElementById('maximizeLeftBtn');
  const maximizeRightBtn = document.getElementById('maximizeRightBtn');
  if (maximizedPanel === panel) {
    editorPane.style.flex = "1";
    previewPane.style.flex = "1";
    maximizedPanel = null;
    maximizeLeftBtn.textContent = "Maximize Editor";
    maximizeRightBtn.textContent = "Maximize Preview";
  } else {
    if (panel === 'left') {
      editorPane.style.flex = "1 1 100%";
      previewPane.style.flex = "0";
      maximizedPanel = panel;
      maximizeLeftBtn.textContent = "Minimize Editor";
      maximizeRightBtn.textContent = "Maximize Preview";
    } else if (panel === 'right') {
      previewPane.style.flex = "1 1 100%";
      editorPane.style.flex = "0";
      maximizedPanel = panel;
      maximizeRightBtn.textContent = "Minimize Preview";
      maximizeLeftBtn.textContent = "Maximize Editor";
    }
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
document.addEventListener('dragenter', function(e) {
  e.preventDefault();
  dropCounter++;
  let dropOverlay = document.getElementById('dropOverlay');
  dropOverlay.classList.remove('hidden');
  dropOverlay.classList.add('active');
});
document.addEventListener('dragover', function(e) {
  e.preventDefault();
});
document.addEventListener('dragleave', function(e) {
  dropCounter--;
  if (dropCounter <= 0) {
    let dropOverlay = document.getElementById('dropOverlay');
    dropOverlay.classList.remove('active');
    dropOverlay.classList.add('hidden');
    dropCounter = 0;
  }
});
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
