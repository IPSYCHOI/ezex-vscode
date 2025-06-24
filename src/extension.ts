import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';


export function activate(context: vscode.ExtensionContext) {
  
  
    const terminal = vscode.window.createTerminal('ezex Installer');
    terminal.show();
    terminal.sendText('npm install -g ezex');
    vscode.window.showInformationMessage('Installing ezex CLI globally... Check terminal for progress.');
  

  const provider = new EzexViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ezexView', provider)
  );
}

class EzexViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
  this._view = webviewView;

  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [this._extensionUri]
  };

  webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

  function sendProgress(webview: vscode.Webview, percentage: number, message: string) {
  webview.postMessage({
    type: 'progress',
    percentage,
    message
  });
}
webviewView.webview.onDidReceiveMessage(async message => {
  if (message.type === 'scaffold') {
    const options = message.options;
    
    // 1. Starting
    sendProgress(webviewView.webview, 5, 'Starting scaffold process');

    // 2. Prompt for project name
    sendProgress(webviewView.webview, 10, 'Validating project name');
    const projectName = await vscode.window.showInputBox({
      prompt: 'Enter project name',
      placeHolder: 'my-express-app',
      validateInput: (value) => {
        if (!value) return 'Project name is required';
        if(value==".")return null 
        if (!/^[a-zA-Z0-9 _-]+$/.test(value)) {
      return 'Invalid name (use letters, numbers, spaces, hyphens, or underscores)';
    }
        return null;
      }
    });
    if (!projectName) return;

    // 3. Resolve project path
    sendProgress(webviewView.webview, 20, 'Resolving project path');
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    let projectPath
    if(projectName=="."){

      projectPath = path.join(cwd);
    }else{
      projectPath = path.join(cwd, projectName);
      if (fs.existsSync(projectPath)) {
        vscode.window.showErrorMessage(`A folder named "${projectName}" already exists in this workspace.`);
        return;
      }
    }
    

    // 4. Building command
    sendProgress(webviewView.webview, 30, 'Building command');
    let cmd = 'ezex';
    if (options.full) cmd += ' --all';
    if (options.crud) cmd += ' --crud';
    if (options.crud && options.resources) {
      cmd += ' ' + options.resources.split(',').map((r: string) => r.trim()).filter(Boolean).join(' ');
    }
    if (options.packages) cmd += ' -i ' + options.packages.split(',').map((p: string) => p.trim()).filter(Boolean).join(' ');
    if (options.directories) cmd += ' -d ' + options.directories.split(',').map((d: string) => d.trim()).filter(Boolean).join(' ');
    if (options.files) cmd += ' -f ' + options.files.split(',').map((f: string) => f.trim()).filter(Boolean).join(' ');

    // 5. Preparing key sequences for prompts
    sendProgress(webviewView.webview, 40, 'Preparing interactive responses');
    const keySequences: string[] = [];
    keySequences.push(`${projectName}\r`);
    if (options.basic) {
      if(projectName!="."){
        keySequences.push(options.addFeatures ? '\x1B[B \r' : '\r')
      keySequences.push(options.git ? '\x1B[B \r' : '\r')
      }
      if (options.addFeatures) {
        
        
        
        keySequences.push(
          options.addMongo ? '\x1B[B \r' : '\r',
          options.addAppFiles ? '\x1B[B \r' : '\r',
          options.addCors ? '\x1B[B \r' : '\r',
          options.addErrorHandling ? '\x1B[B \r' : '\r'
        );
      }
      
      else {
        if(projectName!="."){
          keySequences.push('\r');
        }
      }
    }
    if(projectName!="."){
      keySequences.push('\x1B[A\r');
    }else{
      keySequences.push('\r');
    }
    // 6. Running scaffold command
    sendProgress(webviewView.webview, 50, 'Launching terminal & executing command');
    const terminal = vscode.window.createTerminal('ezex Scaffold');
    terminal.show();
    terminal.sendText(cmd);

    // 7. Simulating key input
    keySequences.forEach((keys, index) => {
      setTimeout(() => {
        if (index === 0) {
          sendProgress(webviewView.webview, 60, 'Generating project structure');
        } else if (index === 1) {
          sendProgress(webviewView.webview, 75, 'Installing dependencies');
        }
        keys.split('').forEach((key) => {
          terminal.sendText(key, false); // false = no newline
        });
      }, 2000 * (index + 1));
    });

    // 8. Done
    setTimeout(() => {
      sendProgress(webviewView.webview, 100, '✅ Project created successfully');
      }, 3000 * (keySequences.length + 1));
       }
    });
  }


private _getHtmlForWebview(webview: vscode.Webview): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ezex Scaffolder</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: var(--vscode-sideBar-background, #222);
            color: var(--vscode-sideBar-foreground, #eee);
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 370px;
            margin: 25px auto;
            background: var(--vscode-editorWidget-background, #282828);
            border-radius: 12px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
            padding: 30px 28px 22px 28px;
          }
          h2 {
            text-align: center;
            margin-bottom: 20px;
            color: var(--vscode-sideBarTitle-foreground, #6cf);
            letter-spacing: 1px;
          }
          label {
            display: block;
            margin-top: 18px;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--vscode-editor-foreground, #b6eaff);
          }
          .input-group {
            margin-bottom: 4px;
          }
          input[type="text"], select {
            width: 100%;
            padding: 9px 10px;
            border-radius: 6px;
            border: 1px solid var(--vscode-input-border, #444);
            background: var(--vscode-input-background, #222);
            color: var(--vscode-input-foreground, #fff);
            font-size: 1em;
            margin-bottom: 4px;
            transition: border 0.2s;
          }
          input:focus, select:focus {
            border-color: var(--vscode-focusBorder, #6cf);
            outline: none;
          }
          /* Responsive checkbox group styling */
          .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 16px 12px;
            margin-bottom: 8px;
          }
          .checkbox-group label {
            min-width: 85px;
            flex: 1 1 85px;
            margin: 0;
            font-weight: normal;
            color: var(--vscode-editor-foreground, #b6eaff);
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
          }
          input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #4e8cff;
  border-radius: 5px;
  background: var(--vscode-input-background, #222);
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s, background 0.2s;
  margin-right: 8px;
}

input[type="checkbox"]:checked {
  background: linear-gradient(90deg, #4e8cff 0%, #6cf 100%);
  border-color: #6cf;
}

input[type="checkbox"]:checked::after {
  content: '';
  display: block;
  position: absolute;
  left: 4px;
  top: 1px;
  width: 6px;
  height: 10px;
  border: solid #222;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}
          .checkbox-group input[type="checkbox"]:checked {
            background: linear-gradient(90deg, #4e8cff 0%, #6cf 100%);
            border-color: #6cf;
          }
          .checkbox-group input[type="checkbox"]:checked::after {
            content: '';
            display: block;
            position: absolute;
            left: 4px;
            top: 1px;
            width: 6px;
            height: 10px;
            border: solid #222;
            border-width: 0 3px 3px 0;
            transform: rotate(45deg);
          }
			.button-row {
            display: flex;
            justify-content: center;
            margin-top: 23px;
          }
          button {
            padding: 12px 32px;
            background: linear-gradient(90deg, #4e8cff 0%, #6cf 100%);
            color: #222;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 1.1em;
            cursor: pointer;
            transition: background 0.2s;
            box-shadow: 0 2px 8px rgba(76, 175, 255, 0.10);
            width: 100%;
            max-width: 260px;
            min-width: 120px;
            text-align: center;
            white-space: normal;
            word-break: break-word;
          }
          button:hover {
            background: linear-gradient(90deg, #6cf 0%, #4e8cff 100%);
          }
          #result {
            margin-top: 20px;
            min-height: 24px;
            text-align: center;
            font-size: 1em;
          }
			.hidden {
				display: none;
				}

				.input-group label {
				margin: 8px 0;
				font-weight: normal;
				}

				
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #333;
          border-radius: 4px;
          margin: 10px 0;
        }
        .progress-fill {
          width: 0%;
          height: 100%;
          background: #4e8cff;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        #status {
          font-size: 0.9em;
          color: #888;
        }
        </style>
    </head>
    <body>
      <div class="container">
        <h2>ezex Project Scaffolder</h2>
        <form id="scaffoldForm">
          <div class="input-group">
            <label>Project Options:</label>
            <div class="input-group">
           
            </div>
            <div class="checkbox-group">
              <label><input type="checkbox" id="basic" name="projectType" value="basic" checked> Basic</label>
              <label><input type="checkbox" id="full" name="projectType" value="full"> Full</label>
              <label><input type="checkbox" id="crud" name="projectType" value="crud"> CRUD</label>
            </div>
          </div>
         
			<div id="basicOptions" class="hidden">
			<div class="input-group">
				<label>
				<input type="checkbox" id="addFeatures"> Add more features?
				</label>
			</div>
			<div id="featureOptions" class="hidden">
				<div class="input-group">
        <label>
                <input type="checkbox" id="git"> initializes a GitHub repository
              </label>
				<label>
					<input type="checkbox" id="addMongo"> Add MongoDB config file?
				</label>
				</div>
				<div class="input-group">
				<label>
					<input type="checkbox" id="addAppFiles"> Add app.js & server.js?
				</label>
				</div>
				<div class="input-group">
				<label>
					<input type="checkbox" id="addCors"> Add CORS configuration?
				</label>
				</div>
				<div class="input-group">
				<label>
					<input type="checkbox" id="addErrorHandling"> Add Global error handling?
				</label>
				</div>
			</div>
			</div>

          <div class="input-group" id="resourcesGroup" style="display:none;">
            <label for="resources">Resources<br><span style="font-size:0.9em;color:#aaa;">(comma separated, for CRUD)</span>:</label>
            <input type="text" id="resources" name="resources" placeholder="user,post">
          </div>

          <div class="input-group">
            <label for="packages">Additional Packages<br><span style="font-size:0.9em;color:#aaa;">(comma separated)</span>:</label>
            <input type="text" id="packages" name="packages" placeholder="socket.io,passport">
          </div>

          <div class="input-group">
            <label for="directories">Custom Directories<br><span style="font-size:0.9em;color:#aaa;">(comma separated)</span>:</label>
            <input type="text" id="directories" name="directories" placeholder="src/api,src/middleware">
          </div>

          <div class="input-group">
            <label for="files">Custom Files<br><span style="font-size:0.9em;color:#aaa;">(comma separated)</span>:</label>
            <input type="text" id="files" name="files" placeholder="README.md,src/utils/helper.js">
          </div>
          
          <div id="progress" class="hidden">
           <div class="progress-bar">
             <div class="progress-fill"></div>
           </div>
           <div id="status">Initializing...</div>
         </div>
          <div class="button-row">
            <button type="submit">Scaffold Project</button>
          </div>
        </form>
        <div id="result"></div>
      </div>
      <script>
  // Mutually exclusive logic for Basic and Full
   const vscode = acquireVsCodeApi();
  const basicCheckbox = document.getElementById('basic');
  const fullCheckbox = document.getElementById('full');
  const crudCheckbox = document.getElementById('crud');
  const resourcesGroup = document.getElementById('resourcesGroup');
  const basicOptions = document.getElementById('basicOptions');
  const addFeaturesCheckbox = document.getElementById('addFeatures');
  const featureOptions = document.getElementById('featureOptions');
  const progressElement = document.getElementById('progress');
  const progressFill = document.querySelector('.progress-fill');
  const statusElement = document.getElementById('status');
  const git = document.getElementById('git');
  window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'progress') {
    progressElement.classList.remove('hidden');
    progressFill.style.width = message.percentage + '%';
    statusElement.textContent = message.message;
    
    if (message.percentage === 100) {
      setTimeout(() => progressElement.classList.add('hidden'), 2000);
    }
  }
});

  // Combined mutual exclusion and visibility update
function handleProjectTypeChange() {
  // Mutual exclusion logic
  if (this === basicCheckbox && this.checked) {
    fullCheckbox.checked = false;
  }
  if (this === fullCheckbox && this.checked) {
    basicCheckbox.checked = false;
  }

  // Visibility logic
  const showBasicOptions = basicCheckbox.checked && !fullCheckbox.checked;
  basicOptions.style.display = showBasicOptions ? 'block' : 'none';

  // Reset features if hidden
  if (!showBasicOptions) {
    addFeaturesCheckbox.checked = false;
    featureOptions.style.display = 'none';
  }
}

  // Single event handler for both checkboxes
  basicCheckbox.addEventListener('change', handleProjectTypeChange);
  fullCheckbox.addEventListener('change', handleProjectTypeChange);

  // Feature options toggle
  addFeaturesCheckbox.addEventListener('change', () => {
    featureOptions.style.display = addFeaturesCheckbox.checked ? 'block' : 'none';
  });

  // CRUD resources visibility
  function updateResourcesVisibility() {
    resourcesGroup.style.display = crudCheckbox.checked ? 'block' : 'none';
  }
  crudCheckbox.addEventListener('change', updateResourcesVisibility);

  // Initial setup
  handleProjectTypeChange();
  updateResourcesVisibility();

  // Form submission
  const form = document.getElementById('scaffoldForm');
  const resultDiv = document.getElementById('result');

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    const options = {
      git:git.checked,
      basic: basicCheckbox.checked,
      full: fullCheckbox.checked,
      crud: crudCheckbox.checked,
      resources: document.getElementById('resources').value.trim(),
      packages: document.getElementById('packages').value.trim(),
      directories: document.getElementById('directories').value.trim(),
      files: document.getElementById('files').value.trim(),
      addFeatures: addFeaturesCheckbox.checked,
      addMongo: document.getElementById('addMongo')?.checked || false,
      addAppFiles: document.getElementById('addAppFiles')?.checked || false,
      addCors: document.getElementById('addCors')?.checked || false,
      addErrorHandling: document.getElementById('addErrorHandling')?.checked || false
    };

    // Build summary
	resultDiv.innerHTML =
  '<div style="padding:10px;background:#232a2d;border-radius:6px;">' +
    '<strong>Project Type:</strong> ' +
    (options.basic ? 'Basic ' : '') +
    (options.full ? 'Full ' : '') +
    (options.crud ? 'CRUD ' : '') +
    '<br>' +
    '<strong>Resources:</strong> ' + (options.resources || '-') + '<br>' +
    '<strong>Packages:</strong> ' + (options.packages || '-') + '<br>' +
    '<strong>Directories:</strong> ' + (options.directories || '-') + '<br>' +
    '<strong>Files:</strong> ' + (options.files || '-') +
  '</div>';

    // Next step: send options to the extension backend to run the CLI
	// Send the options to the extension backend
		if (typeof vscode !== 'undefined') {
		vscode.postMessage({ type: 'scaffold', options: options });
		}

    // vscode.postMessage({ type: 'scaffold', options });
  });
</script>

    </body>
    </html>
  `;
}


}

export function deactivate() {}
