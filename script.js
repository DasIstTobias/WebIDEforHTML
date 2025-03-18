/* Global variables */
let files = {};
let activeFile = 'index.html';
let maximizedPanel = null;
let fileOrder = [];
let dropCounter = 0;

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

/* Save files object and file order to localStorage */
function saveFiles() {
  localStorage.setItem('webIDE_files', JSON.stringify(files));
  localStorage.setItem('webIDE_fileOrder', JSON.stringify(fileOrder));
}

/* Update file tabs in the left navigation bar */
function updateTabs() {
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';
  // Render tabs based on fileOrder
  fileOrder.forEach(fileName => {
    if (files[fileName]) {
      createTabElement(fileName);
    }
  });
  // Add any files not in fileOrder
  for (const fileName in files) {
    if (!fileOrder.includes(fileName)) {
      fileOrder.push(fileName);
      createTabElement(fileName);
    }
  }
}

/* Create a tab element for a given file */
function createTabElement(fileName) {
  const tabsContainer = document.getElementById('tabs');
  const tab = document.createElement('span');
  tab.className = 'tab';
  tab.textContent = fileName;
  if (fileName === activeFile) {
    tab.classList.add('active');
  }
  tab.setAttribute('draggable', true);
  
  tab.addEventListener('click', () => {
    saveCurrentFile();
    activeFile = fileName;
    loadFile(activeFile);
    updateTabs();
  });
  
  // Export button for single file
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '⤓';
  exportBtn.className = 'export-btn';
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportFile(fileName);
  });
  tab.appendChild(exportBtn);
  
  // Delete button for file
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '✖';
  deleteBtn.className = 'delete-btn';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${fileName}"?`)) {
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
    }
  });
  tab.appendChild(deleteBtn);
  
  /* Drag and drop events for reordering tabs */
  tab.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', fileName);
    tab.classList.add('dragging');
  });
  tab.addEventListener('dragend', (e) => {
    tab.classList.remove('dragging');
  });
  tab.addEventListener('dragover', (e) => {
    e.preventDefault();
    tab.classList.add('dragover');
  });
  tab.addEventListener('dragleave', (e) => {
    tab.classList.remove('dragover');
  });
  tab.addEventListener('drop', (e) => {
    e.preventDefault();
    tab.classList.remove('dragover');
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
  
  tabsContainer.appendChild(tab);
}

/* Load file content into the editor */
function loadFile(fileName) {
  const file = files[fileName];
  const codeEditor = document.getElementById('codeEditor');
  codeEditor.value = file.content;
  updateLineNumbers();
}

/* Save the current file content from the editor */
function saveCurrentFile() {
  const codeEditor = document.getElementById('codeEditor');
  if (activeFile in files) {
    files[activeFile].content = codeEditor.value;
    saveFiles();
  }
}

/* Update line numbers based on the number of lines in the editor */
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

/* Event listener: update line numbers, save file, and refresh preview if needed */
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

/* Sync scrolling for line numbers and code editor */
document.getElementById('codeEditor').addEventListener('scroll', function() {
  document.getElementById('lineNumbers').scrollTop = this.scrollTop;
});

/* Update the live preview iframe by creating Blob URLs for dependencies */
function updatePreview() {
  saveCurrentFile();
  let blobUrls = {};
  // Create Blob URLs for all files except index.html
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
  // Replace href and src references in index.html with the corresponding Blob URLs
  let htmlContent = files['index.html'].content;
  htmlContent = htmlContent.replace(/href="([^"]+)"/g, function(match, p1) {
    if (blobUrls[p1]) {
      return 'href="' + blobUrls[p1] + '"';
    }
    return match;
  });
  htmlContent = htmlContent.replace(/src="([^"]+)"/g, function(match, p1) {
    if (blobUrls[p1]) {
      return 'src="' + blobUrls[p1] + '"';
    }
    return match;
  });
  
  // Inject a script to override console.log so logs are passed to the parent window
  const injection = `<script>(function(){var oldLog = console.log; console.log = function(){oldLog.apply(console, arguments); window.parent.postMessage({type:'console', data:Array.from(arguments)}, '*');};})()<\/script>`;
  htmlContent = htmlContent.replace("<head>", "<head>" + injection);
  
  // Write the updated HTML content into the preview iframe's document
  const iframe = document.getElementById('previewFrame');
  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlContent);
  iframe.contentDocument.close();
}

/* New File: prompt for file name and create a new empty file */
document.getElementById('newFileBtn').addEventListener('click', function() {
  const fileName = prompt('Enter new file name (with extension):');
  if (fileName) {
    if (files[fileName]) {
      alert('File already exists.');
    } else {
      files[fileName] = { name: fileName, content: '' };
      fileOrder.push(fileName);
      activeFile = fileName;
      updateTabs();
      loadFile(activeFile);
      saveFiles();
    }
  }
});

/* Import Files via button: trigger hidden file input */
document.getElementById('importBtn').addEventListener('click', function() {
  document.getElementById('importInput').click();
});

/* Handle file import from file input */
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

/* Drag-and-Drop File Import */
const dropOverlay = document.getElementById('dropOverlay');
document.addEventListener('dragenter', function(e) {
  // Only show overlay if files are being dragged (not internal tabs)
  if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
    dropCounter++;
    dropOverlay.classList.add('active');
  }
});
document.addEventListener('dragleave', function(e) {
  if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
    dropCounter--;
    if (dropCounter === 0) {
      dropOverlay.classList.remove('active');
    }
  }
});
document.addEventListener('dragover', function(e) {
  // Only prevent default for file drags
  if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
    e.preventDefault();
  }
});
document.addEventListener('drop', function(e) {
  if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) {
    e.preventDefault();
    dropCounter = 0;
    dropOverlay.classList.remove('active');
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
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
    }
  }
});

/* Export a single file by creating a Blob download link */
function exportFile(fileName) {
  const file = files[fileName];
  const blob = new Blob([file.content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
}

/* Export all files as a ZIP file using JSZip */
document.getElementById('exportAllBtn').addEventListener('click', function() {
  const zip = new JSZip();
  for (const fileName in files) {
    zip.file(fileName, files[fileName].content);
  }
  zip.generateAsync({ type: "blob" })
    .then(function(content) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = "project.zip";
      a.click();
    });
});

/* Maximize panel buttons: toggle the chosen panel to full width with animations */
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
    // Restore normal view
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

/* Toggle Console Panel with text change to 'Show Console' / 'Hide Console' */
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

/* Clear Console using bottom toolbar button */
document.getElementById('clearConsoleBtn').addEventListener('click', function() {
  document.getElementById('consoleOutput').innerHTML = '';
});

/* Manual Refresh Preview Button */
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

/* Save the current file before the window unloads */
window.addEventListener('beforeunload', saveCurrentFile);
window.addEventListener('load', init);
