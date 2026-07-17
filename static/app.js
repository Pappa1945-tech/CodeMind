// ============================================================================
// CODEMIND - FRONTEND JS APPLICATION LOGIC
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // ---------------------------------------------------------
    // STATE VARIABLES
    // ---------------------------------------------------------
    let currentSessionId = null;
    let attachedFiles = []; // Array of { name: string, content: string }
    let isGenerating = false;
    let speechRecognition = null;
    
    // Default Settings
    const defaultSettings = {
        provider: "ollama",
        baseUrl: "http://localhost:11434",
        apiKey: "",
        model: "qwen2.5-coder:7b"
    };
    
    // Load Settings from LocalStorage
    let settings = JSON.parse(localStorage.getItem("codemind_settings")) || defaultSettings;
    
    function getActiveSettings() {
        if (settings.fallback) {
            return {
                provider: "ollama",
                baseUrl: "http://localhost:11434",
                apiKey: "",
                model: "qwen2.5-coder:7b"
            };
        }
        return settings;
    }
    
    function updateHeaderModelDisplay() {
        const activeSettings = getActiveSettings();
        const modelDisplayEl = document.getElementById("activeModelName");
        if (modelDisplayEl) {
            modelDisplayEl.innerText = activeSettings.model || "qwen2.5-coder:7b";
        }
    }

    async function loadSettingsFromServer() {
        try {
            const response = await fetch("/api/settings");
            if (response.ok) {
                const data = await response.json();
                settings = {
                    provider: data.provider,
                    baseUrl: data.baseUrl,
                    apiKey: data.apiKey,
                    model: data.model,
                    fallback: data.fallback || false
                };
                localStorage.setItem("codemind_settings", JSON.stringify(settings));
                if (data.omniroute_custom_endpoint) {
                    localStorage.setItem("omniroute_custom_endpoint", data.omniroute_custom_endpoint);
                }
                if (data.omniroute_custom_api_key) {
                    localStorage.setItem("omniroute_custom_api_key", data.omniroute_custom_api_key);
                }
            }
        } catch (e) {
            console.error("Failed to load settings from server-side pickle file, using LocalStorage fallback", e);
        }
    }

    async function saveSettingsToServer() {
        try {
            const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint") || "http://localhost:20128/v1";
            const storedApiKey = localStorage.getItem("omniroute_custom_api_key") || "sk-omniroute-local-key";
            
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: settings.provider,
                    baseUrl: settings.baseUrl,
                    apiKey: settings.apiKey,
                    model: settings.model,
                    fallback: settings.fallback || false,
                    omniroute_custom_endpoint: storedEndpoint,
                    omniroute_custom_api_key: storedApiKey
                })
            });
        } catch (e) {
            console.error("Failed to save settings to server-side pickle file", e);
        }
    }
    
    // Configure Marked.js Options
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-',
        breaks: true
    });

    // ---------------------------------------------------------
    // DOM ELEMENTS
    // ---------------------------------------------------------
    
    // Navigation / Layout
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileCloseBtn = document.getElementById("mobileCloseBtn");
    const headerChatTitle = document.getElementById("headerChatTitle");
    const connectionStatus = document.getElementById("connectionStatus");
    
    // Sessions (Chat History)
    const sessionsList = document.getElementById("sessionsList");
    const newChatBtn = document.getElementById("newChatBtn");
    const clearAllBtn = document.getElementById("clearAllBtn");
    
    // Message Panel
    const messagesPanel = document.getElementById("messagesPanel");
    const welcomeScreen = document.getElementById("welcomeScreen");
    const quickPromptCards = document.querySelectorAll(".quick-prompt-card");
    
    // Chat Inputs
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");
    const fileInput = document.getElementById("fileInput");
    const uploadFileBtn = document.getElementById("uploadFileBtn");
    const attachmentChips = document.getElementById("attachmentChips");
    const pasteCodeBtn = document.getElementById("pasteCodeBtn");
    const deepThinkingToggle = document.getElementById("deepThinkingToggle");
    const agenticModeToggle = document.getElementById("agenticModeToggle");
    
    // Speech-To-Text Elements
    const sttBtn = document.getElementById("sttBtn");
    const sttVisualizer = document.getElementById("sttVisualizer");
    const sttCancelBtn = document.getElementById("sttCancelBtn");
    
    // Settings Modal
    const settingsTrigger = document.getElementById("settingsTrigger");
    const settingsModal = document.getElementById("settingsModal");
    const closeSettingsModalBtn = document.getElementById("closeSettingsModalBtn");
    const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
    const saveSettingsBtn = document.getElementById("saveSettingsBtn");
    const testConnectionBtn = document.getElementById("testConnectionBtn");
    const providerSelect = document.getElementById("providerSelect");
    const settingsBaseUrl = document.getElementById("settingsBaseUrl");
    const settingsApiKey = document.getElementById("settingsApiKey");
    const settingsModel = document.getElementById("settingsModel");
    const connectionTestResult = document.getElementById("connectionTestResult");
    const apiKeyGroup = document.getElementById("apiKeyGroup");
    const baseUrlGroup = document.getElementById("baseUrlGroup");
    const toggleApiKeyVisibility = document.getElementById("toggleApiKeyVisibility");
    const toggleOmnirouteCustomApiKeyVisibility = document.getElementById("toggleOmnirouteCustomApiKeyVisibility");
    const omnirouteModelGroup = document.getElementById("omnirouteModelGroup");
    const omnirouteModelSelect = document.getElementById("omnirouteModelSelect");
    const modelGroup = document.getElementById("modelGroup");
    const editOmnirouteCredentialsBtn = document.getElementById("editOmnirouteCredentialsBtn");
    
    // OmniRoute Custom Modal
    const omnirouteCustomModal = document.getElementById("omnirouteCustomModal");
    const closeOmnirouteCustomModalBtn = document.getElementById("closeOmnirouteCustomModalBtn");
    const cancelOmnirouteCustomBtn = document.getElementById("cancelOmnirouteCustomBtn");
    const saveOmnirouteCustomBtn = document.getElementById("saveOmnirouteCustomBtn");
    const omnirouteCustomEndpoint = document.getElementById("omnirouteCustomEndpoint");
    const omnirouteCustomApiKey = document.getElementById("omnirouteCustomApiKey");
    const omnirouteCustomTestResult = document.getElementById("omnirouteCustomTestResult");
    
    // Paste Code (Pest) Modal
    const pasteModal = document.getElementById("pasteModal");
    const closePasteModalBtn = document.getElementById("closePasteModalBtn");
    const cancelPasteBtn = document.getElementById("cancelPasteBtn");
    const insertPasteBtn = document.getElementById("insertPasteBtn");
    const beautifyCodeBtn = document.getElementById("beautifyCodeBtn");
    const pasteLangSelect = document.getElementById("pasteLangSelect");
    const pasteTextarea = document.getElementById("pasteTextarea");

    // Load Scope Modal
    const loadWorkspaceBtn = document.getElementById("loadWorkspaceBtn");
    const loadScopeBtn = document.getElementById("loadScopeBtn");
    const loadScopeModal = document.getElementById("loadScopeModal");
    const closeLoadScopeModalBtn = document.getElementById("closeLoadScopeModalBtn");
    const cancelLoadScopeBtn = document.getElementById("cancelLoadScopeBtn");
    const confirmLoadScopeBtn = document.getElementById("confirmLoadScopeBtn");
    const tabFolderBtn = document.getElementById("tabFolderBtn");
    const tabFileBtn = document.getElementById("tabFileBtn");
    const tabContentFolder = document.getElementById("tabContentFolder");
    const tabContentFile = document.getElementById("tabContentFile");
    const folderPathInput = document.getElementById("folderPathInput");
    const filePathInput = document.getElementById("filePathInput");
    const browseFolderBtn = document.getElementById("browseFolderBtn");
    const browseFileBtn = document.getElementById("browseFileBtn");
    const loadTestResult = document.getElementById("loadTestResult");
    const workspacePathDisplay = document.getElementById("workspacePathDisplay");

    // ---------------------------------------------------------
    // INITIALIZATION & CONNECTION CHECK
    // ---------------------------------------------------------
    
    initApp();
    
    async function initApp() {
        // Load settings from server-side pickle file
        await loadSettingsFromServer();
        
        // Render current LLM config inside modal fields
        updateSettingsModalFields();
        // Update header model display
        updateHeaderModelDisplay();
        // Setup Event Listeners
        setupEventListeners();
        // Verify LLM server status
        checkLlmConnection();
        // Fetch existing SQLite sessions
        loadSessions();
        // Set focus to input
        chatInput.focus();
        
        // Auto-initialize Speech Recognition
        initSpeechRecognition();
        
        // Initialize Agentic Mode state
        agenticModeToggle.checked = localStorage.getItem("codemind_agentic_mode") === "true";
        
        // Fetch and display active workspace path
        fetchWorkspacePath();
        
        // Fetch and display runtime dependencies status
        checkDependencies();
    }

    async function checkDependencies() {
        const widget = document.getElementById("dependencyWidget");
        if (!widget) return;
        
        try {
            const response = await fetch("/api/dependencies");
            if (!response.ok) return;
            
            const data = await response.json();
            widget.style.display = "block";
            
            // Node
            const nodeEl = document.getElementById("depNode").querySelector(".dep-val");
            if (data.node.status === "ok") {
                nodeEl.innerText = data.node.version;
                nodeEl.className = "dep-val ok";
            } else {
                nodeEl.innerText = "Missing";
                nodeEl.className = "dep-val missing";
            }
            
            // NPM
            const npmEl = document.getElementById("depNpm").querySelector(".dep-val");
            if (data.npm.status === "ok") {
                npmEl.innerText = data.npm.version;
                npmEl.className = "dep-val ok";
            } else {
                npmEl.innerText = "Missing";
                npmEl.className = "dep-val missing";
            }
            
            // OmniRoute
            const omniEl = document.getElementById("depOmni").querySelector(".dep-val");
            if (data.omniroute.status === "ok") {
                omniEl.innerText = data.omniroute.version;
                omniEl.className = "dep-val ok";
            } else {
                omniEl.innerText = "Missing";
                omniEl.className = "dep-val warning";
                omniEl.title = "Required only if you want to use OmniRoute options";
            }
            
            // Ollama
            const ollamaEl = document.getElementById("depOllama").querySelector(".dep-val");
            if (data.ollama.installed) {
                if (data.ollama.running) {
                    ollamaEl.innerText = "Active";
                    ollamaEl.className = "dep-val ok";
                } else {
                    ollamaEl.innerText = "Stopped";
                    ollamaEl.className = "dep-val warning";
                }
            } else {
                ollamaEl.innerText = "Missing";
                ollamaEl.className = "dep-val missing";
            }
        } catch (err) {
            console.error("Failed to fetch dependencies status", err);
        }
    }

    // ---------------------------------------------------------
    // EVENT LISTENERS
    // ---------------------------------------------------------
    
    function setupEventListeners() {
        // Mobile Sidebar toggles
        mobileMenuBtn.addEventListener("click", () => sidebar.classList.add("open"));
        mobileCloseBtn.addEventListener("click", () => sidebar.classList.remove("open"));
        
        // Sessions
        newChatBtn.addEventListener("click", () => startNewChat());
        if (clearAllBtn) {
            clearAllBtn.addEventListener("click", () => clearAllSessions());
        }
        
        // Settings Modal triggers
        settingsTrigger.addEventListener("click", () => openModal(settingsModal));
        closeSettingsModalBtn.addEventListener("click", () => closeModal(settingsModal));
        cancelSettingsBtn.addEventListener("click", () => closeModal(settingsModal));
        saveSettingsBtn.addEventListener("click", saveSettings);
        testConnectionBtn.addEventListener("click", testLlmConnection);
        if (providerSelect) {
            providerSelect.addEventListener("change", handleProviderChange);
        }
        if (toggleApiKeyVisibility) {
            toggleApiKeyVisibility.addEventListener("click", toggleApiKeyFieldType);
        }
        if (toggleOmnirouteCustomApiKeyVisibility) {
            toggleOmnirouteCustomApiKeyVisibility.addEventListener("click", toggleOmnirouteApiKeyFieldType);
        }

        // OmniRoute Select and Modal Event Listeners
        omnirouteModelSelect.addEventListener("change", () => {
            const val = omnirouteModelSelect.value;
            if (val === "codemind-decide" || val === "omniroute") {
                const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint");
                omnirouteCustomEndpoint.value = storedEndpoint !== null ? storedEndpoint : "http://localhost:20128/v1";
                const storedApiKey = localStorage.getItem("omniroute_custom_api_key");
                omnirouteCustomApiKey.value = storedApiKey !== null ? storedApiKey : "sk-omniroute-local-key";
                openModal(omnirouteCustomModal);
                if (editOmnirouteCredentialsBtn) {
                    editOmnirouteCredentialsBtn.style.display = "inline-flex";
                }
            } else {
                if (editOmnirouteCredentialsBtn) {
                    editOmnirouteCredentialsBtn.style.display = "none";
                }
            }
        });
        if (editOmnirouteCredentialsBtn) {
            editOmnirouteCredentialsBtn.addEventListener("click", () => {
                const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint");
                omnirouteCustomEndpoint.value = storedEndpoint !== null ? storedEndpoint : "http://localhost:20128/v1";
                const storedApiKey = localStorage.getItem("omniroute_custom_api_key");
                omnirouteCustomApiKey.value = storedApiKey !== null ? storedApiKey : "sk-omniroute-local-key";
                openModal(omnirouteCustomModal);
            });
        }
        closeOmnirouteCustomModalBtn.addEventListener("click", () => closeModal(omnirouteCustomModal));
        cancelOmnirouteCustomBtn.addEventListener("click", () => closeModal(omnirouteCustomModal));
        saveOmnirouteCustomBtn.addEventListener("click", async () => {
            const endpoint = omnirouteCustomEndpoint.value.trim();
            const apiKey = omnirouteCustomApiKey.value.trim();
            const currentModel = omnirouteModelSelect.value;
            
            saveOmnirouteCustomBtn.disabled = true;
            const originalText = saveOmnirouteCustomBtn.innerHTML;
            saveOmnirouteCustomBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validating...';
            
            omnirouteCustomTestResult.style.display = "block";
            omnirouteCustomTestResult.className = "connection-test-result";
            omnirouteCustomTestResult.innerText = "Validating API key and connection...";
            
            try {
                const response = await fetch("/api/check_connection", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        provider: "omniroute",
                        base_url: endpoint,
                        api_key: apiKey,
                        model: currentModel
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    omnirouteCustomTestResult.classList.add("error");
                    omnirouteCustomTestResult.innerText = "✗ Key Validation Failed: " + data.message;
                    saveOmnirouteCustomBtn.disabled = false;
                    saveOmnirouteCustomBtn.innerHTML = originalText;
                    
                    // Let the incorrect credentials be saved
                    localStorage.setItem("omniroute_custom_endpoint", endpoint);
                    localStorage.setItem("omniroute_custom_api_key", apiKey);
                    
                    // Fallback configuration
                    settings = {
                        provider: "ollama",
                        baseUrl: "http://localhost:11434",
                        apiKey: "",
                        model: "qwen2.5-coder:7b",
                        fallback: true
                    };
                    localStorage.setItem("codemind_settings", JSON.stringify(settings));
                    
                    alert("due to incorrect credentials the fallback will be ques2.5-coder");
                    
                    await saveSettingsToServer();
                    updateHeaderModelDisplay();
                    closeModal(omnirouteCustomModal);
                    checkLlmConnection();
                    return;
                }
            } catch (err) {
                omnirouteCustomTestResult.classList.add("error");
                omnirouteCustomTestResult.innerText = "✗ Key Validation Error: " + err.message;
                saveOmnirouteCustomBtn.disabled = false;
                saveOmnirouteCustomBtn.innerHTML = originalText;
                
                // Let the incorrect credentials be saved
                localStorage.setItem("omniroute_custom_endpoint", endpoint);
                localStorage.setItem("omniroute_custom_api_key", apiKey);
                
                // Fallback configuration
                settings = {
                    provider: "ollama",
                    baseUrl: "http://localhost:11434",
                    apiKey: "",
                    model: "qwen2.5-coder:7b",
                    fallback: true
                };
                localStorage.setItem("codemind_settings", JSON.stringify(settings));
                
                alert("due to incorrect credentials the fallback will be ques2.5-coder");
                
                await saveSettingsToServer();
                updateHeaderModelDisplay();
                closeModal(omnirouteCustomModal);
                checkLlmConnection();
                return;
            }
            
            saveOmnirouteCustomBtn.disabled = false;
            saveOmnirouteCustomBtn.innerHTML = originalText;
            
            localStorage.setItem("omniroute_custom_endpoint", endpoint);
            localStorage.setItem("omniroute_custom_api_key", apiKey);
            
            // Immediately save and apply to current active settings if OmniRoute is selected
            if (currentModel === "codemind-decide" || currentModel === "omniroute") {
                settings.provider = "omniroute";
                settings.baseUrl = endpoint;
                settings.apiKey = apiKey;
                settings.model = currentModel;
                delete settings.fallback; // clear fallback on successful validation
                localStorage.setItem("codemind_settings", JSON.stringify(settings));
                await saveSettingsToServer();
                updateHeaderModelDisplay();
                checkLlmConnection();
            } else {
                // Save custom credentials to server anyway
                await saveSettingsToServer();
            }
            
            closeModal(omnirouteCustomModal);
        });
        
        // Paste Code Modal triggers
        pasteCodeBtn.addEventListener("click", async () => {
            try {
                const rawCode = await navigator.clipboard.readText();
                if (!rawCode) {
                    openModal(pasteModal);
                    return;
                }
                const markdownCode = `\n\`\`\`\n${rawCode}\n\`\`\`\n`;
                const startPos = chatInput.selectionStart;
                const endPos = chatInput.selectionEnd;
                const text = chatInput.value;
                chatInput.value = text.substring(0, startPos) + markdownCode + text.substring(endPos);
                chatInput.selectionStart = chatInput.selectionEnd = startPos + markdownCode.length;
                handleChatInput();
                chatInput.focus();
            } catch (err) {
                console.warn("Clipboard API failed, opening modal as fallback", err);
                openModal(pasteModal);
            }
        });
        closePasteModalBtn.addEventListener("click", () => closeModal(pasteModal));
        cancelPasteBtn.addEventListener("click", () => closeModal(pasteModal));
        insertPasteBtn.addEventListener("click", insertCodeToChatbox);
        beautifyCodeBtn.addEventListener("click", beautifyPasteCode);
        
        // File upload click handlers
        uploadFileBtn.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", handleFileUpload);
        
        // Textarea height and input actions
        chatInput.addEventListener("input", handleChatInput);
        chatInput.addEventListener("keydown", handleChatKeydown);
        
        // Quick suggestions
        quickPromptCards.forEach(card => {
            card.addEventListener("click", () => {
                const prompt = card.getAttribute("data-prompt");
                chatInput.value = prompt;
                handleChatInput();
                sendChatMessage();
            });
        });
        
        // Send message
        sendBtn.addEventListener("click", sendChatMessage);
        
        // Speech To Text triggers
        sttBtn.addEventListener("click", startSpeechRecognition);
        sttCancelBtn.addEventListener("click", stopSpeechRecognition);
        
        // Agentic Mode toggle persistence
        agenticModeToggle.addEventListener("change", () => {
            localStorage.setItem("codemind_agentic_mode", agenticModeToggle.checked);
        });

        // Load Scope Modal triggers
        if (loadWorkspaceBtn) {
            loadWorkspaceBtn.addEventListener("click", () => openModal(loadScopeModal));
        }
        if (loadScopeBtn) {
            loadScopeBtn.addEventListener("click", () => openModal(loadScopeModal));
        }
        closeLoadScopeModalBtn.addEventListener("click", () => closeModal(loadScopeModal));
        cancelLoadScopeBtn.addEventListener("click", () => closeModal(loadScopeModal));
        confirmLoadScopeBtn.addEventListener("click", confirmLoadScope);
        
        // Modal tabs switching
        tabFolderBtn.addEventListener("click", () => switchLoadScopeTab("folder"));
        tabFileBtn.addEventListener("click", () => switchLoadScopeTab("file"));
        
        // Folder/File browsing via local backend OS dialogs
        browseFolderBtn.addEventListener("click", browseFolder);
        browseFileBtn.addEventListener("click", browseFile);
    }

    // ---------------------------------------------------------
    // SETTINGS MODAL INTERACTION
    // ---------------------------------------------------------
    
    function openModal(modal) {
        modal.classList.add("open");
        if (modal === pasteModal) {
            pasteTextarea.value = "";
            pasteLangSelect.value = "auto";
            pasteTextarea.focus();
        } else if (modal === settingsModal) {
            connectionTestResult.style.display = "none";
            updateSettingsModalFields();
        } else if (modal === omnirouteCustomModal) {
            omnirouteCustomTestResult.style.display = "none";
            const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint");
            omnirouteCustomEndpoint.value = storedEndpoint !== null ? storedEndpoint : "http://localhost:20128/v1";
            const storedApiKey = localStorage.getItem("omniroute_custom_api_key");
            omnirouteCustomApiKey.value = storedApiKey !== null ? storedApiKey : "sk-omniroute-local-key";
            omnirouteCustomEndpoint.focus();
        } else if (modal === loadScopeModal) {
            loadTestResult.style.display = "none";
            folderPathInput.value = "";
            filePathInput.value = "";
            switchLoadScopeTab("folder");
        }
    }
    
    function closeModal(modal) {
        modal.classList.remove("open");
    }
    
    function updateSettingsModalFields() {
        omnirouteModelSelect.value = settings.model || "codemind-decide";
        const val = omnirouteModelSelect.value;
        if (val === "codemind-decide" || val === "omniroute") {
            if (editOmnirouteCredentialsBtn) {
                editOmnirouteCredentialsBtn.style.display = "inline-flex";
            }
        } else {
            if (editOmnirouteCredentialsBtn) {
                editOmnirouteCredentialsBtn.style.display = "none";
            }
        }
    }
    
    function handleProviderChange() {
        const val = providerSelect.value;
        
        // Default visibility states
        baseUrlGroup.style.display = "flex";
        apiKeyGroup.style.display = "flex";
        modelGroup.style.display = "flex";
        omnirouteModelGroup.style.display = "none";
        
        if (val === "ollama") {
            settingsBaseUrl.placeholder = "http://localhost:11434";
            apiKeyGroup.style.display = "none";
            if (!settingsBaseUrl.value || settingsBaseUrl.value.includes("api-inference") || settingsBaseUrl.value.includes("20128")) {
                settingsBaseUrl.value = "http://localhost:11434";
            }
            settingsModel.placeholder = "qwen2.5-coder:7b";
            if (!settingsModel.value || settingsModel.value.includes("Qwen/")) {
                settingsModel.value = "qwen2.5-coder:7b";
            }
        } else if (val === "huggingface") {
            settingsBaseUrl.placeholder = "https://api-inference.huggingface.co/v1";
            if (!settingsBaseUrl.value || settingsBaseUrl.value.includes("11434") || settingsBaseUrl.value.includes("20128")) {
                settingsBaseUrl.value = "https://api-inference.huggingface.co/v1";
            }
            settingsModel.placeholder = "Qwen/Qwen2.5-Coder-7B-Instruct";
            if (!settingsModel.value || !settingsModel.value.includes("/")) {
                settingsModel.value = "Qwen/Qwen2.5-Coder-7B-Instruct";
            }
        } else if (val === "custom") {
            settingsBaseUrl.placeholder = "http://localhost:1234/v1";
            if (settingsBaseUrl.value.includes("11434") || settingsBaseUrl.value.includes("20128")) {
                settingsBaseUrl.value = "";
            }
            settingsModel.placeholder = "qwen2.5-coder:7b";
        } else if (val === "omniroute") {
            baseUrlGroup.style.display = "none";
            apiKeyGroup.style.display = "none";
            modelGroup.style.display = "none";
            omnirouteModelGroup.style.display = "flex";
        }
    }
    
    function toggleApiKeyFieldType() {
        const type = settingsApiKey.type === "password" ? "text" : "password";
        settingsApiKey.type = type;
        const icon = toggleApiKeyVisibility.querySelector("i");
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
    }
    
    function toggleOmnirouteApiKeyFieldType() {
        const type = omnirouteCustomApiKey.type === "password" ? "text" : "password";
        omnirouteCustomApiKey.type = type;
        const icon = toggleOmnirouteCustomApiKeyVisibility.querySelector("i");
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
    }
    
    async function saveSettings() {
        const model = omnirouteModelSelect.value;
        let provider = "omniroute";
        let baseUrl = "";
        let apiKey = "";
        
        if (model === "codemind-decide" || model === "omniroute") {
            provider = "omniroute";
            const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint");
            baseUrl = storedEndpoint !== null ? storedEndpoint : "http://localhost:20128/v1";
            const storedApiKey = localStorage.getItem("omniroute_custom_api_key");
            apiKey = storedApiKey !== null ? storedApiKey : "sk-omniroute-local-key";
        } else {
            // option 3: qwen2.5-coder:7b
            provider = "ollama";
            baseUrl = "http://localhost:11434";
            apiKey = "";
        }
        
        // Differentiate validation: if any option other than qwen2.5-coder:7b is selected, we validate the API key
        if (model !== "qwen2.5-coder:7b") {
            saveSettingsBtn.disabled = true;
            const originalText = saveSettingsBtn.innerHTML;
            saveSettingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validating...';
            
            connectionTestResult.style.display = "block";
            connectionTestResult.className = "connection-test-result";
            connectionTestResult.innerText = "Validating API key and connection...";
            
            try {
                const response = await fetch("/api/check_connection", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        provider,
                        base_url: baseUrl,
                        api_key: apiKey,
                        model
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    connectionTestResult.classList.add("error");
                    connectionTestResult.innerText = "✗ Key Validation Failed: " + data.message;
                    saveSettingsBtn.disabled = false;
                    saveSettingsBtn.innerHTML = originalText;
                    
                    // Let the incorrect settings be saved
                    settings = {
                        provider,
                        baseUrl,
                        apiKey,
                        model,
                        fallback: true
                    };
                    localStorage.setItem("codemind_settings", JSON.stringify(settings));
                    
                    alert("due to incorrect credentials the fallback will be ques2.5-coder");
                    
                    await saveSettingsToServer();
                    updateHeaderModelDisplay();
                    closeModal(settingsModal);
                    checkLlmConnection();
                    return;
                }
            } catch (err) {
                connectionTestResult.classList.add("error");
                connectionTestResult.innerText = "✗ Key Validation Error: " + err.message;
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.innerHTML = originalText;
                
                // Let the incorrect settings be saved
                settings = {
                    provider,
                    baseUrl,
                    apiKey,
                    model,
                    fallback: true
                };
                localStorage.setItem("codemind_settings", JSON.stringify(settings));
                
                alert("due to incorrect credentials the fallback will be ques2.5-coder");
                
                await saveSettingsToServer();
                updateHeaderModelDisplay();
                closeModal(settingsModal);
                checkLlmConnection();
                return;
            }
            
            saveSettingsBtn.disabled = false;
            saveSettingsBtn.innerHTML = originalText;
        }
        
        settings = {
            provider,
            baseUrl,
            apiKey,
            model
        };
        localStorage.setItem("codemind_settings", JSON.stringify(settings));
        await saveSettingsToServer();
        updateHeaderModelDisplay();
        closeModal(settingsModal);
        checkLlmConnection();
    }
    
    async function checkLlmConnection() {
        const activeSettings = getActiveSettings();
        updateConnectionStatus("checking", `Testing ${activeSettings.provider}...`);
        try {
            const response = await fetch("/api/check_connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: activeSettings.provider,
                    base_url: activeSettings.baseUrl,
                    api_key: activeSettings.apiKey,
                    model: activeSettings.model
                })
            });
            const data = await response.json();
            if (data.success) {
                updateConnectionStatus("connected", `${activeSettings.provider} (${activeSettings.model})`);
            } else {
                updateConnectionStatus("disconnected", "Connection failed");
            }
        } catch (e) {
            updateConnectionStatus("disconnected", "Offline");
        }
    }
    
    async function testLlmConnection() {
        connectionTestResult.style.display = "block";
        connectionTestResult.className = "connection-test-result";
        connectionTestResult.innerText = "Testing connectivity...";
        
        const model = omnirouteModelSelect.value;
        let provider = "omniroute";
        let baseUrl = "";
        let apiKey = "";
        
        if (model === "codemind-decide" || model === "omniroute") {
            provider = "omniroute";
            const storedEndpoint = localStorage.getItem("omniroute_custom_endpoint");
            baseUrl = storedEndpoint !== null ? storedEndpoint : "http://localhost:20128/v1";
            const storedApiKey = localStorage.getItem("omniroute_custom_api_key");
            apiKey = storedApiKey !== null ? storedApiKey : "sk-omniroute-local-key";
        } else {
            // option 3: qwen2.5-coder:7b
            provider = "ollama";
            baseUrl = "http://localhost:11434";
            apiKey = "";
        }
        
        try {
            const response = await fetch("/api/check_connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    base_url: baseUrl,
                    api_key: apiKey,
                    model
                })
            });
            const data = await response.json();
            if (data.success) {
                connectionTestResult.classList.add("success");
                connectionTestResult.innerText = "✓ Success! " + data.message;
            } else {
                connectionTestResult.classList.add("error");
                connectionTestResult.innerText = "✗ Failed: " + data.message;
            }
        } catch (e) {
            connectionTestResult.classList.add("error");
            connectionTestResult.innerText = "✗ Request error: " + e.message;
        }
    }
    
    function updateConnectionStatus(status, text) {
        const dot = connectionStatus.querySelector(".status-dot");
        const statusText = connectionStatus.querySelector(".status-text");
        
        dot.className = "status-dot " + status;
        statusText.innerText = text;
        statusText.title = text;
    }

    // ---------------------------------------------------------
    // SESSIONS & CHAT HISTORY (SQLITE)
    // ---------------------------------------------------------
    
    async function loadSessions() {
        try {
            const response = await fetch("/api/sessions");
            const sessions = await response.json();
            
            sessionsList.innerHTML = "";
            if (sessions.length === 0) {
                sessionsList.innerHTML = '<div class="empty-sessions">No recent chats</div>';
                return;
            }
            
            sessions.forEach(s => {
                const li = document.createElement("li");
                li.className = `session-item ${s.id === currentSessionId ? "active" : ""}`;
                li.dataset.sessionId = s.id;
                
                li.innerHTML = `
                    <div class="session-info" data-tooltip="Switch to: ${escapeHtml(s.title)}" data-tooltip-position="right">
                        <i class="fa-regular fa-message"></i>
                        <span class="session-title-text">${escapeHtml(s.title)}</span>
                    </div>
                    <button class="delete-session-btn" data-tooltip="Delete this conversation history" data-tooltip-position="left">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                `;
                
                // Click events
                li.addEventListener("click", (e) => {
                    // Prevent trigger on delete click
                    if (e.target.closest(".delete-session-btn")) return;
                    selectSession(s.id, s.title);
                });
                
                const deleteBtn = li.querySelector(".delete-session-btn");
                deleteBtn.addEventListener("click", () => deleteSession(s.id));
                
                sessionsList.appendChild(li);
            });
        } catch (e) {
            console.error("Error loading sessions:", e);
        }
    }
    
    async function selectSession(sessionId, title) {
        if (isGenerating) return;
        currentSessionId = sessionId;
        headerChatTitle.innerText = title;
        sidebar.classList.remove("open"); // close mobile drawer
        
        // Remove welcome screen
        welcomeScreen.style.display = "none";
        messagesPanel.innerHTML = '<div class="loading-messages"><i class="fa-solid fa-spinner fa-spin"></i> Loading messages...</div>';
        
        try {
            const response = await fetch(`/api/sessions/${sessionId}/messages`);
            const messages = await response.json();
            
            messagesPanel.innerHTML = "";
            messages.forEach(msg => {
                appendMessageToUI(msg.sender, msg.content, false);
            });
            
            // Highlight all newly loaded code
            hljs.highlightAll();
            scrollToBottom();
            
            // Toggle sidebar active highlights
            document.querySelectorAll(".session-item").forEach(item => {
                item.classList.toggle("active", item.dataset.sessionId === sessionId);
            });
        } catch (e) {
            messagesPanel.innerHTML = `<div class="error-message">Error loading chat history: ${e.message}</div>`;
        }
    }
    
    async function startNewChat() {
        if (isGenerating) return;
        currentSessionId = null;
        headerChatTitle.innerText = "New Chat";
        messagesPanel.innerHTML = "";
        welcomeScreen.style.display = "flex";
        
        // Clear active states in sidebar
        document.querySelectorAll(".session-item").forEach(item => item.classList.remove("active"));
        
        // Clear attachments
        attachedFiles = [];
        renderAttachmentChips();
        
        chatInput.value = "";
        handleChatInput();
        chatInput.focus();
    }
    
    async function deleteSession(sessionId) {
        if (confirm("Are you sure you want to delete this conversation?")) {
            try {
                await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
                if (currentSessionId === sessionId) {
                    startNewChat();
                }
                loadSessions();
            } catch (e) {
                alert("Failed to delete session: " + e.message);
            }
        }
    }
    
    async function clearAllSessions() {
        if (confirm("Are you sure you want to delete all chat history? This action is irreversible.")) {
            try {
                const response = await fetch("/api/sessions", { method: "DELETE" });
                if (response.ok) {
                    startNewChat();
                    loadSessions();
                } else {
                    const err = await response.json();
                    alert("Failed to clear chat history: " + (err.detail || response.statusText));
                }
            } catch (e) {
                alert("Failed to clear chat history: " + e.message);
            }
        }
    }

    // ---------------------------------------------------------
    // FILE UPLOAD AND READING
    // ---------------------------------------------------------
    
    function handleFileUpload(e) {
        const files = e.target.files;
        if (!files.length) return;
        
        Array.from(files).forEach(file => {
            // Check if file is already added
            if (attachedFiles.some(f => f.name === file.name)) {
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(evt) {
                attachedFiles.push({
                    name: file.name,
                    content: evt.target.result
                });
                renderAttachmentChips();
            };
            reader.readAsText(file);
        });
        
        // Reset file input value
        fileInput.value = "";
    }
    
    function renderAttachmentChips() {
        attachmentChips.innerHTML = "";
        attachedFiles.forEach((file, index) => {
            const chip = document.createElement("div");
            chip.className = "file-chip";
            
            // Determine file icon
            let fileIcon = "fa-file-code";
            if (file.name.endsWith(".py")) fileIcon = "fa-file-code";
            else if (file.name.endsWith(".js") || file.name.endsWith(".ts")) fileIcon = "fa-file-code";
            else if (file.name.endsWith(".html")) fileIcon = "fa-file-code";
            else if (file.name.endsWith(".css")) fileIcon = "fa-file-code";
            else if (file.name.endsWith(".md")) fileIcon = "fa-file-lines";
            
            chip.innerHTML = `
                <i class="fa-solid ${fileIcon}"></i>
                <span>${escapeHtml(file.name)}</span>
                <button class="file-chip-remove" data-index="${index}" data-tooltip="Remove this file attachment" data-tooltip-position="top">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            
            chip.querySelector(".file-chip-remove").addEventListener("click", () => {
                attachedFiles.splice(index, 1);
                renderAttachmentChips();
            });
            
            attachmentChips.appendChild(chip);
        });
    }

    // ---------------------------------------------------------
    // PASTE CODE (PEST) DIALOG LOGIC
    // ---------------------------------------------------------
    
    function beautifyPasteCode() {
        const rawCode = pasteTextarea.value;
        if (!rawCode.trim()) return;
        
        // Simple beautifier: trim trailing spaces, ensure clean indentations
        const lines = rawCode.split('\n');
        let indentLevel = 0;
        let beautified = [];
        
        for (let line of lines) {
            let trimmed = line.trim();
            if (trimmed === "") {
                beautified.push("");
                continue;
            }
            
            // Simple opening/closing braces check for indentation shift (C-style, JS, CSS)
            if (trimmed.startsWith("}") || trimmed.startsWith("]")) {
                indentLevel = Math.max(0, indentLevel - 1);
            }
            
            let spaces = "    ".repeat(indentLevel);
            beautified.push(spaces + trimmed);
            
            if (trimmed.endsWith("{") || trimmed.endsWith("[")) {
                indentLevel++;
            }
        }
        
        pasteTextarea.value = beautified.join('\n');
    }
    
    function insertCodeToChatbox() {
        const rawCode = pasteTextarea.value;
        if (!rawCode.trim()) {
            closeModal(pasteModal);
            return;
        }
        
        const lang = pasteLangSelect.value === "auto" ? "" : pasteLangSelect.value;
        const markdownCode = `\n\`\`\`${lang}\n${rawCode}\n\`\`\`\n`;
        
        // Insert at textarea cursor position
        const startPos = chatInput.selectionStart;
        const endPos = chatInput.selectionEnd;
        const text = chatInput.value;
        
        chatInput.value = text.substring(0, startPos) + markdownCode + text.substring(endPos);
        chatInput.selectionStart = chatInput.selectionEnd = startPos + markdownCode.length;
        
        handleChatInput();
        closeModal(pasteModal);
        chatInput.focus();
    }

    // ---------------------------------------------------------
    // TEXTAREA & INTERFACES MANAGEMENT
    // ---------------------------------------------------------
    
    function handleChatInput() {
        // Auto grow height
        chatInput.style.height = "auto";
        chatInput.style.height = (chatInput.scrollHeight - 4) + "px";
        
        // Toggle Send Button
        sendBtn.disabled = !chatInput.value.trim() && attachedFiles.length === 0;
    }
    
    function handleChatKeydown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    }

    // ---------------------------------------------------------
    // SPEECH TO TEXT (STT) - WEB SPEECH API
    // ---------------------------------------------------------
    
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            sttBtn.style.display = "none"; // Hide button if browser doesn't support Web Speech API
            return;
        }
        
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = false;
        speechRecognition.lang = "en-US";
        
        speechRecognition.onstart = () => {
            sttBtn.classList.add("recording");
            sttVisualizer.classList.add("active");
        };
        
        speechRecognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            if (text) {
                // Append text to chatbox input
                const currentText = chatInput.value;
                chatInput.value = currentText ? `${currentText} ${text}` : text;
                handleChatInput();
            }
        };
        
        speechRecognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            alert("Speech recognition error: " + event.error);
            stopSpeechRecognition();
        };
        
        speechRecognition.onend = () => {
            sttBtn.classList.remove("recording");
            sttVisualizer.classList.remove("active");
            chatInput.focus();
        };
    }
    
    function startSpeechRecognition() {
        if (!speechRecognition) return;
        try {
            speechRecognition.start();
        } catch (e) {
            console.error(e);
        }
    }
    
    function stopSpeechRecognition() {
        if (!speechRecognition) return;
        try {
            speechRecognition.stop();
        } catch (e) {
            console.error(e);
        }
    }

    // ---------------------------------------------------------
    // CHAT MESSAGE STREAMING AND PARSING
    // ---------------------------------------------------------
    
    async function sendChatMessage() {
        if (isGenerating) return;
        
        const rawMessageText = chatInput.value.trim();
        if (!rawMessageText && attachedFiles.length === 0) return;
        
        isGenerating = true;
        sendBtn.disabled = true;
        chatInput.disabled = true;
        uploadFileBtn.disabled = true;
        pasteCodeBtn.disabled = true;
        sttBtn.disabled = true;
        
        // Hide welcome screen if it's open
        welcomeScreen.style.display = "none";
        
        // 1. Prepare message payload
        let messageToSend = rawMessageText;
        let displayMessageText = rawMessageText;
        
        // Format attachment context if files are present
        if (attachedFiles.length > 0) {
            let attachmentContext = "";
            let attachmentUIContext = "";
            
            attachedFiles.forEach(file => {
                attachmentContext += `[Attached File: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
                attachmentUIContext += `<div class="file-chip"><i class="fa-solid fa-file-code"></i><span>${escapeHtml(file.name)}</span></div>`;
            });
            
            messageToSend = `${attachmentContext}User Query:\n${rawMessageText}`;
            displayMessageText = `<div class="msg-attachments">${attachmentUIContext}</div><div class="msg-text">${escapeHtml(rawMessageText || "Analyzed files.")}</div>`;
        } else {
            displayMessageText = escapeHtml(rawMessageText);
        }
        
        // Create new session if none is active
        if (!currentSessionId) {
            currentSessionId = uuidv4();
            headerChatTitle.innerText = rawMessageText ? (rawMessageText.substring(0, 40) + (rawMessageText.length > 40 ? "..." : "")) : "New Chat";
            // Create session in backend
            try {
                await fetch("/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ session_id: currentSessionId, title: headerChatTitle.innerText })
                });
            } catch (e) {
                console.error("Failed to initialize session on server:", e);
            }
        }
        
        // Append user query to UI
        appendMessageToUI("user", displayMessageText, true);
        
        // Reset chat inputs & chips
        chatInput.value = "";
        chatInput.style.height = "auto";
        attachedFiles = [];
        renderAttachmentChips();
        
        // Scroll messages panel to bottom
        scrollToBottom();
        
        // 2. Setup Assistant message elements for streaming
        const row = document.createElement("div");
        row.className = "message-row assistant-row";
        
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.innerHTML = `<i class="fa-solid fa-brain-circuit"></i>`;
        
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesPanel.appendChild(row);
        
        // State variables for parsing deep thinking <think> tags
        let isThinking = false;
        let thinkingCompleted = false;
        let thoughtBody = null;
        let thoughtContainer = null;
        let mainContentWrapper = null;
        
        let textBuffer = "";
        let thoughtBuffer = "";
        let mainTextBuffer = "";
        
        try {
            const deepThinkingEnabled = deepThinkingToggle.checked;
            
            const activeSettings = getActiveSettings();
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    session_id: currentSessionId,
                    message: messageToSend,
                    deep_thinking: deepThinkingEnabled,
                    agentic_mode: agenticModeToggle.checked,
                    provider: activeSettings.provider,
                    base_url: activeSettings.baseUrl,
                    api_key: activeSettings.apiKey,
                    model: activeSettings.model
                })
            });
            
            if (!response.ok) {
                const textErr = await response.text();
                throw new Error(`Server returned ${response.status}: ${textErr}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                textBuffer += chunk;
                
                // Render assistant stream using unified renderer
                renderAssistantMessage(bubble, textBuffer);
                scrollToBottom();
            }
            
        } catch (error) {
            console.error("Streaming error:", error);
            const errDiv = document.createElement("div");
            errDiv.className = "error-message";
            errDiv.style.color = "var(--accent-rose)";
            errDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Communication Error: ${error.message}`;
            bubble.appendChild(errDiv);
        } finally {
            isGenerating = false;
            sendBtn.disabled = false;
            chatInput.disabled = false;
            uploadFileBtn.disabled = false;
            pasteCodeBtn.disabled = false;
            sttBtn.disabled = false;
            chatInput.focus();
            
            // Reload sidebar to reflect updated conversation title
            loadSessions();
        }
    }
    
    function appendMessageToUI(sender, content, isHtml = false) {
        const isToolResponse = sender === "user" && (content.startsWith("<tool_response>") || content.includes("<tool_response>"));
        const row = document.createElement("div");
        row.className = `message-row ${isToolResponse ? "assistant-row" : (sender === "user" ? "user-row" : (sender === "system" ? "system-row" : "assistant-row"))}`;
        
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        
        if (isToolResponse) {
            avatar.innerHTML = `<i class="fa-solid fa-terminal" style="color: var(--accent-indigo);"></i>`;
        } else if (sender === "user") {
            avatar.innerHTML = `<i class="fa-solid fa-user"></i>`;
        } else if (sender === "system") {
            avatar.innerHTML = `<i class="fa-solid fa-gears" style="color: var(--accent-indigo);"></i>`;
        } else {
            avatar.innerHTML = `<i class="fa-solid fa-brain-circuit"></i>`;
        }
        
        const bubble = document.createElement("div");
        bubble.className = "message-bubble";
        
        if (isToolResponse) {
            // Render tool responses in history as terminal widgets
            renderAssistantMessage(bubble, content);
        } else if (sender === "user") {
            if (isHtml) {
                bubble.innerHTML = content;
            } else {
                bubble.innerText = content;
            }
        } else if (sender === "system") {
            bubble.innerText = content;
        } else {
            // Render assistant history content using the unified parser
            renderAssistantMessage(bubble, content);
        }
        
        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesPanel.appendChild(row);
        scrollToBottom();
    }

    // ========================================================================
    // UNIFIED ASSISTANT RENDERER ENGINE (PARSES THINK & TOOL TAGS)
    // ========================================================================
    function renderAssistantMessage(bubble, text) {
        // Clear bubble
        bubble.innerHTML = "";
        
        let parsedText = text;
        let thoughtHtml = "";
        let isThinking = false;
        let thinkingCompleted = false;
        let thoughtText = "";
        
        // 1. Extract thought blocks if present
        let thoughtBlocks = [];
        while (parsedText.includes("<think>")) {
            const startIdx = parsedText.indexOf("<think>");
            const endIdx = parsedText.indexOf("</think>");
            
            if (endIdx !== -1) {
                const thoughtText = parsedText.substring(startIdx + 7, endIdx);
                thoughtBlocks.push({ text: thoughtText, completed: true });
                parsedText = (parsedText.substring(0, startIdx) + parsedText.substring(endIdx + 8)).trim();
            } else {
                const thoughtText = parsedText.substring(startIdx + 7);
                thoughtBlocks.push({ text: thoughtText, completed: false });
                parsedText = parsedText.substring(0, startIdx).trim();
                isThinking = true;
                break;
            }
        }
        
        // Render thought containers
        thoughtBlocks.forEach(block => {
            const thoughtContainer = document.createElement("div");
            thoughtContainer.className = `thought-container ${block.completed ? "collapsed" : ""}`;
            thoughtContainer.innerHTML = `
                <div class="thought-header ${block.completed ? "done" : "thinking"}">
                    <div class="thought-title-wrapper">
                        <span class="thought-pulse-dot"></span>
                        <span class="thought-title-text">${block.completed ? "Thought Process" : "Thinking Process..."}</span>
                    </div>
                    <i class="fa-solid fa-chevron-down thought-toggle-icon"></i>
                </div>
                <div class="thought-body">${escapeHtml(block.text)}</div>
            `;
            
            thoughtContainer.querySelector(".thought-header").addEventListener("click", () => {
                thoughtContainer.classList.toggle("collapsed");
            });
            
            bubble.appendChild(thoughtContainer);
        });
        
        // If the model is currently inside a think block, do not render main content
        if (isThinking) {
            return;
        }
        
        // 2. Parse main content chronologically for tags
        let currentIdx = 0;
        while (currentIdx < parsedText.length) {
            let nextCall = parsedText.indexOf("<tool_call", currentIdx);
            let nextStatus = parsedText.indexOf("<tool_status>", currentIdx);
            let nextResponse = parsedText.indexOf("<tool_response>", currentIdx);
            
            // Find which tag comes first
            let indices = [
                { type: "tool_call", index: nextCall },
                { type: "tool_status", index: nextStatus },
                { type: "tool_response", index: nextResponse }
            ].filter(item => item.index !== -1);
            
            if (indices.length === 0) {
                // No more tags, render remaining text as markdown
                let remainingText = parsedText.substring(currentIdx).trim();
                if (remainingText) {
                    appendMarkdownSegment(bubble, remainingText);
                }
                break;
            }
            
            // Sort to find the earliest tag
            indices.sort((a, b) => a.index - b.index);
            let firstTag = indices[0];
            
            // Render text before the tag as markdown
            let textBefore = parsedText.substring(currentIdx, firstTag.index).trim();
            if (textBefore) {
                appendMarkdownSegment(bubble, textBefore);
            }
            
            // Parse the tag content
            if (firstTag.type === "tool_call") {
                let endTag = parsedText.indexOf("</tool_call>", firstTag.index);
                let closeTagLen = 12;
                if (endTag === -1) {
                    endTag = parsedText.indexOf("</tool_response>", firstTag.index);
                    closeTagLen = 16;
                }
                if (endTag === -1) {
                    endTag = parsedText.indexOf("</tool>", firstTag.index);
                    closeTagLen = 7;
                }
                
                let blockText = "";
                let isComplete = false;
                if (endTag !== -1) {
                    blockText = parsedText.substring(firstTag.index, endTag + closeTagLen);
                    currentIdx = endTag + closeTagLen;
                    isComplete = true;
                } else {
                    blockText = parsedText.substring(firstTag.index);
                    currentIdx = parsedText.length;
                }
                appendToolCallSegment(bubble, blockText, isComplete);
            }
            else if (firstTag.type === "tool_status") {
                let endTag = parsedText.indexOf("</tool_status>", firstTag.index);
                let statusText = "";
                let isComplete = false;
                if (endTag !== -1) {
                    statusText = parsedText.substring(firstTag.index + 13, endTag);
                    currentIdx = endTag + 14;
                    // If there is any non-whitespace content after this tag, mark it complete
                    const remaining = parsedText.substring(currentIdx).trim();
                    if (remaining.length > 0) {
                        isComplete = true;
                    }
                } else {
                    statusText = parsedText.substring(firstTag.index + 13);
                    currentIdx = parsedText.length;
                }
                appendToolStatusSegment(bubble, statusText, isComplete);
            }
            else if (firstTag.type === "tool_response") {
                let endTag = parsedText.indexOf("</tool_response>", firstTag.index);
                let responseText = "";
                if (endTag !== -1) {
                    responseText = parsedText.substring(firstTag.index + 15, endTag);
                    currentIdx = endTag + 16;
                } else {
                    responseText = parsedText.substring(firstTag.index + 15);
                    currentIdx = parsedText.length;
                }
                appendToolResponseSegment(bubble, responseText);
            }
        }
    }

    function appendMarkdownSegment(parent, markdownText) {
        const wrapper = document.createElement("div");
        wrapper.className = "main-answer-content";
        try {
            wrapper.innerHTML = marked.parse(markdownText);
            
            // Highlight code blocks
            wrapper.querySelectorAll("pre code").forEach(block => {
                try {
                    if (!block.dataset.highlighted) {
                        wrapCodeBlock(block);
                    }
                    hljs.highlightElement(block);
                } catch (highlightError) {
                    console.error("Syntax highlighting error:", highlightError);
                }
            });
        } catch (parseError) {
            console.error("Markdown parsing error:", parseError);
            wrapper.innerText = markdownText;
        }
        
        parent.appendChild(wrapper);
    }
    
    function appendToolCallSegment(parent, tagText, isComplete) {
        let name = "Action";
        let pathStr = "";
        try {
            const nameMatch = tagText.match(/name\s*=\s*["']([^"']+)["']/);
            if (nameMatch) {
                name = nameMatch[1];
            }
            
            if (tagText.includes(">")) {
                let startJson = tagText.indexOf(">") + 1;
                let endJson = tagText.lastIndexOf("</tool_call>");
                if (endJson === -1) {
                    endJson = tagText.lastIndexOf("</tool_response>");
                }
                if (endJson === -1) {
                    endJson = tagText.lastIndexOf("</tool>");
                }
                
                let jsonStr = "";
                if (endJson !== -1) {
                    jsonStr = tagText.substring(startJson, endJson).trim();
                } else {
                    jsonStr = tagText.substring(startJson).trim();
                }
                
                try {
                    let cleanedJsonStr = jsonStr.trim();
                    if (cleanedJsonStr.startsWith("```json")) {
                        cleanedJsonStr = cleanedJsonStr.substring(7);
                    } else if (cleanedJsonStr.startsWith("```")) {
                        cleanedJsonStr = cleanedJsonStr.substring(3);
                    }
                    if (cleanedJsonStr.endsWith("```")) {
                        cleanedJsonStr = cleanedJsonStr.substring(0, cleanedJsonStr.length - 3);
                    }
                    cleanedJsonStr = cleanedJsonStr.trim();
                    
                    let args = JSON.parse(cleanedJsonStr);
                    if (args.path) pathStr = ` (path: ${args.path})`;
                    else if (args.command) pathStr = ` (command: ${args.command})`;
                } catch (e) {
                    // JSON incomplete, skip showing path
                }
            }
        } catch (e) {}
        
        const badge = document.createElement("div");
        badge.className = "file-chip";
        badge.style.background = "rgba(139, 92, 246, 0.08)";
        badge.style.borderColor = "rgba(139, 92, 246, 0.25)";
        badge.style.color = "#8B5CF6";
        badge.style.margin = "8px 0";
        badge.innerHTML = `
            <i class="fa-solid fa-robot"></i>
            <span><strong>Tool Call:</strong> ${name}${escapeHtml(pathStr)}</span>
            ${!isComplete ? ' <i class="fa-solid fa-spinner fa-spin" style="margin-left: 5px;"></i>' : ''}
        `;
        parent.appendChild(badge);
    }
    
    function appendToolStatusSegment(parent, statusText, isComplete = false) {
        const statusDiv = document.createElement("div");
        statusDiv.className = "tool-status-container" + (isComplete ? " complete" : "");
        statusDiv.innerHTML = `
            <i class="${isComplete ? "fa-solid fa-circle-check" : "fa-solid fa-spinner fa-spin"}"></i>
            <span>${escapeHtml(statusText)}</span>
        `;
        parent.appendChild(statusDiv);
    }
    
    function appendToolResponseSegment(parent, responseText) {
        const termWidget = document.createElement("div");
        termWidget.className = "terminal-widget";
        termWidget.innerHTML = `
            <div class="terminal-widget-header">
                <div class="terminal-header-left">
                    <div class="terminal-window-dots">
                        <span class="terminal-dot red"></span>
                        <span class="terminal-dot yellow"></span>
                        <span class="terminal-dot green"></span>
                    </div>
                    <span class="terminal-title">Console Output</span>
                </div>
                <i class="fa-solid fa-chevron-down terminal-toggle-btn"></i>
            </div>
            <div class="terminal-widget-body">${escapeHtml(responseText)}</div>
        `;
        
        termWidget.querySelector(".terminal-widget-header").addEventListener("click", () => {
            termWidget.classList.toggle("collapsed");
        });
        
        parent.appendChild(termWidget);
    }

    // Wraps raw highlighted <pre><code> blocks in our custom styled header elements
    function wrapCodeBlock(codeElem) {
        const preElem = codeElem.parentElement;
        if (preElem.parentElement.classList.contains("code-block-wrapper")) return;
        
        const wrapper = document.createElement("div");
        wrapper.className = "code-block-wrapper";
        
        // Find language label from classes
        let lang = "Code";
        const classes = codeElem.className.split(" ");
        for (let cls of classes) {
            if (cls.startsWith("language-")) {
                lang = cls.substring(9);
                break;
            }
        }
        
        const header = document.createElement("div");
        header.className = "code-block-header";
        header.innerHTML = `
            <span class="code-lang-label">${lang}</span>
            <div class="code-block-actions">
                <button class="code-action-btn copy-btn" data-tooltip="Copy code snippet to clipboard" data-tooltip-position="top">
                    <i class="fa-regular fa-copy"></i>
                </button>
                <button class="code-action-btn download-btn" data-tooltip="Download code snippet as file" data-tooltip-position="top">
                    <i class="fa-solid fa-download"></i>
                </button>
            </div>
        `;
        
        preElem.replaceWith(wrapper);
        wrapper.appendChild(header);
        wrapper.appendChild(preElem);
        
        // Setup copy button action
        const copyBtn = header.querySelector(".copy-btn");
        copyBtn.addEventListener("click", () => {
            const codeText = codeElem.innerText;
            navigator.clipboard.writeText(codeText).then(() => {
                copyBtn.innerHTML = `<i class="fa-solid fa-check" style="color: var(--accent-emerald)"></i>`;
                setTimeout(() => {
                    copyBtn.innerHTML = `<i class="fa-regular fa-copy"></i>`;
                }, 2000);
            });
        });
        
        // Setup download code action
        const downloadBtn = header.querySelector(".download-btn");
        downloadBtn.addEventListener("click", () => {
            const codeText = codeElem.innerText;
            const blob = new Blob([codeText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `codemind_snippet.${getFileExtension(lang)}`;
            a.click();
            URL.revokeObjectURL(url);
        });
        
        codeElem.dataset.highlighted = "true";
    }

    // ---------------------------------------------------------
    // UTILITY HELPER FUNCTIONS
    // ---------------------------------------------------------
    
    function scrollToBottom() {
        messagesPanel.scrollTop = messagesPanel.scrollHeight;
    }
    
    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    function getFileExtension(lang) {
        const langMap = {
            python: "py",
            javascript: "js",
            typescript: "ts",
            html: "html",
            css: "css",
            cpp: "cpp",
            c: "c",
            java: "java",
            rust: "rs",
            go: "go",
            sql: "sql",
            bash: "sh",
            shell: "sh"
        };
        return langMap[lang.toLowerCase()] || "txt";
    }
    
    // Generates a simple UUID version 4
    function uuidv4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    // ========================================================================
    // WORKSPACE / SCOPE MANAGEMENT LOGIC
    // ========================================================================
    let activeScopeTab = "folder";

    function switchLoadScopeTab(tabType) {
        activeScopeTab = tabType;
        loadTestResult.style.display = "none";
        
        if (tabType === "folder") {
            tabFolderBtn.classList.add("active");
            tabFileBtn.classList.remove("active");
            tabContentFolder.style.display = "block";
            tabContentFile.style.display = "none";
        } else {
            tabFolderBtn.classList.remove("active");
            tabFileBtn.classList.add("active");
            tabContentFolder.style.display = "none";
            tabContentFile.style.display = "block";
        }
    }

    async function fetchWorkspacePath() {
        try {
            const response = await fetch("/api/workspace");
            const data = await response.json();
            if (data.workspace_dir) {
                workspacePathDisplay.innerText = data.workspace_dir;
                workspacePathDisplay.title = data.workspace_dir;
            }
        } catch (e) {
            console.error("Error fetching workspace path:", e);
            workspacePathDisplay.innerText = "Error loading path";
        }
    }

    async function browseFolder() {
        try {
            const response = await fetch("/api/browse_folder", { method: "POST" });
            const data = await response.json();
            if (data.path) {
                folderPathInput.value = data.path;
            } else if (data.error) {
                console.error("Error browsing folder:", data.error);
            }
        } catch (e) {
            console.error("Failed to call browse folder API:", e);
        }
    }

    async function browseFile() {
        try {
            const response = await fetch("/api/browse_file", { method: "POST" });
            const data = await response.json();
            if (data.path) {
                filePathInput.value = data.path;
            } else if (data.error) {
                console.error("Error browsing file:", data.error);
            }
        } catch (e) {
            console.error("Failed to call browse file API:", e);
        }
    }

    async function confirmLoadScope() {
        loadTestResult.style.display = "block";
        loadTestResult.className = "load-test-result";
        loadTestResult.innerText = "Loading...";
        
        if (activeScopeTab === "folder") {
            const path = folderPathInput.value.trim();
            if (!path) {
                loadTestResult.classList.add("error");
                loadTestResult.innerText = "Please specify a folder path.";
                return;
            }
            
            try {
                const response = await fetch("/api/workspace", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ workspace_dir: path })
                });
                
                const data = await response.json();
                if (response.ok) {
                    loadTestResult.classList.add("success");
                    loadTestResult.innerText = `Workspace updated successfully to: ${data.workspace_dir}`;
                    workspacePathDisplay.innerText = data.workspace_dir;
                    workspacePathDisplay.title = data.workspace_dir;
                    
                    // Add system confirmation message to chat
                    const confirmMsg = `Workspace folder successfully loaded into scope: ${data.workspace_dir}`;
                    appendMessageToUI("system", confirmMsg, false);
                    
                    setTimeout(() => {
                        closeModal(loadScopeModal);
                    }, 1000);
                } else {
                    loadTestResult.classList.add("error");
                    loadTestResult.innerText = `Failed to update workspace: ${data.detail || "Unknown error"}`;
                }
            } catch (e) {
                loadTestResult.classList.add("error");
                loadTestResult.innerText = `Error: ${e.message}`;
            }
        } else {
            const path = filePathInput.value.trim();
            if (!path) {
                loadTestResult.classList.add("error");
                loadTestResult.innerText = "Please specify a file path.";
                return;
            }
            
            try {
                const response = await fetch("/api/load_file_content", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file_path: path })
                });
                
                const data = await response.json();
                if (response.ok) {
                    // Check if file is already added
                    if (!attachedFiles.some(f => f.name === data.filename)) {
                        attachedFiles.push({
                            name: data.filename,
                            content: data.content
                        });
                        renderAttachmentChips();
                        
                        // Toggle Send button state
                        handleChatInput();
                    }
                    
                    loadTestResult.classList.add("success");
                    loadTestResult.innerText = `File "${data.filename}" successfully loaded into chat scope.`;
                    
                    const confirmMsg = `Loaded local file: ${path}`;
                    appendMessageToUI("system", confirmMsg, false);
                    
                    setTimeout(() => {
                        closeModal(loadScopeModal);
                    }, 1000);
                } else {
                    loadTestResult.classList.add("error");
                    loadTestResult.innerText = `Failed to load file: ${data.detail || "Unknown error"}`;
                }
            } catch (e) {
                loadTestResult.classList.add("error");
                loadTestResult.innerText = `Error: ${e.message}`;
            }
        }
    }

    // ========================================================================
    // CUSTOM PREMIUM TOOLTIP SYSTEM
    // ========================================================================
    let tooltipTimeout = null;

    // Global custom tooltip event listeners using event delegation
    document.addEventListener("mouseover", handleGlobalTooltip);
    document.addEventListener("focusin", handleGlobalTooltip);
    document.addEventListener("mouseout", handleGlobalTooltipHide);
    document.addEventListener("focusout", handleGlobalTooltipHide);
    document.addEventListener("click", hideTooltip);

    function handleGlobalTooltip(e) {
        const target = e.target.closest("[data-tooltip], [title]");
        if (!target) return;
        
        // Auto-upgrade title attributes to custom tooltip configuration
        if (target.hasAttribute("title") && !target.hasAttribute("data-tooltip")) {
            target.setAttribute("data-tooltip", target.getAttribute("title"));
            target.removeAttribute("title");
        }
        
        // Debounce slightly for user comfort and smooth transitions
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => {
            showTooltip(target);
        }, 150);
    }
    
    function handleGlobalTooltipHide(e) {
        const target = e.target.closest("[data-tooltip]");
        if (target) {
            clearTimeout(tooltipTimeout);
            hideTooltip();
        }
    }

    function showTooltip(target) {
        let tooltip = document.getElementById("codemind-tooltip");
        if (!tooltip) {
            tooltip = document.createElement("div");
            tooltip.id = "codemind-tooltip";
            tooltip.className = "custom-tooltip";
            document.body.appendChild(tooltip);
        }
        
        const text = target.getAttribute("data-tooltip");
        if (!text) return;
        
        tooltip.innerText = text;
        tooltip.className = "custom-tooltip"; // Reset classes
        
        // Position priority: data-tooltip-position, defaults to "top"
        let position = target.getAttribute("data-tooltip-position") || "top";
        
        // Move offscreen to calculate width/height
        tooltip.style.left = "-9999px";
        tooltip.style.top = "-9999px";
        tooltip.classList.add("visible");
        
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let left = 0;
        let top = 0;
        
        // Smart flip alignment if it would overflow the screen edges
        if (position === "top" && targetRect.top - tooltipRect.height - 12 < 0) {
            position = "bottom";
        } else if (position === "bottom" && targetRect.bottom + tooltipRect.height + 12 > window.innerHeight) {
            position = "top";
        } else if (position === "left" && targetRect.left - tooltipRect.width - 12 < 0) {
            position = "right";
        } else if (position === "right" && targetRect.right + tooltipRect.width + 12 > window.innerWidth) {
            position = "left";
        }
        
        // Apply placement calculation
        if (position === "top") {
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            top = targetRect.top - tooltipRect.height - 12;
            tooltip.classList.add("position-top");
        } else if (position === "bottom") {
            left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
            top = targetRect.bottom + 12;
            tooltip.classList.add("position-bottom");
        } else if (position === "left") {
            left = targetRect.left - tooltipRect.width - 12;
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            tooltip.classList.add("position-left");
        } else if (position === "right") {
            left = targetRect.right + 12;
            top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
            tooltip.classList.add("position-right");
        }
        
        // Constraint boundaries (prevent cutting off screen edges)
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    function hideTooltip() {
        const tooltip = document.getElementById("codemind-tooltip");
        if (tooltip) {
            tooltip.classList.remove("visible");
        }
    }
});
