// 简洁的LLM轨迹回放器
class TrajectoryReplayer {
    constructor() {
        this.currentData = null;
        this.messages = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.playInterval = null;
        this.messageDelay = 1500; // 每条消息间隔1.5秒
        this.autoLoadTrajId = null; // 从URL自动加载的轨迹ID
        this.currentModel = 'claude'; // 当前轨迹使用的模型，默认为 claude
        this.isMobile = this.detectMobile(); // 检测是否为移动端
        
        this.initializeElements();
        // 先尝试隐藏选择框（如果需要）
        this.checkAutoLoadTrajectory();
        this.initializeEventListeners();
        // 检查URL路径，决定使用哪种选择框
        this.checkSelectorMode();
        // 如果没有自动加载轨迹，才加载文件列表
        if (!this.autoLoadTrajId) {
            // 这里不需要再调用checkSelectorMode，因为上面已经调用了
        }
    }
    
    // 检测是否为移动端
    detectMobile() {
        // 检测屏幕宽度
        if (window.innerWidth <= 768) {
            return true;
        }
        
        // 检测用户代理
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        if (mobileRegex.test(userAgent)) {
            return true;
        }
        
        // 检测触摸支持
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            // 进一步检查屏幕尺寸，避免误判桌面触摸屏
            return window.innerWidth <= 1024;
        }
        
        return false;
    }
    
    // 检查是否需要自动加载轨迹
    checkAutoLoadTrajectory() {
        // 方法1：从URL路径获取（如 /306）
        const pathname = window.location.pathname;
        // 匹配 /306 或 /306/ 这样的路径
        const pathMatch = pathname.match(/^\/(\d+)\/?$/);
        if (pathMatch && pathMatch[1]) {
            this.autoLoadTrajId = pathMatch[1];
        } else {
            // 支持 /model_task 或 /model_task/ 这样的路径，如 /claude-4.5-sonnet_merge-hf-datasets
            const modelTaskMatch = pathname.match(/^\/([^\/]+_[^\/]+)\/?$/);
            if (modelTaskMatch && modelTaskMatch[1]) {
                this.autoLoadTrajId = modelTaskMatch[1];
            } else {
            // 方法2：从meta标签获取（服务器注入的）
            const metaTag = document.querySelector('meta[name="trajectory-id"]');
            if (metaTag) {
                this.autoLoadTrajId = metaTag.getAttribute('content');
            }
            }
        }
        
        // 如果找到轨迹ID，自动加载（不隐藏选择器）
        if (this.autoLoadTrajId) {
            // 立即加载轨迹数据
            this.loadTrajectoryById(this.autoLoadTrajId);
        }
    }
    
    // 检查选择框模式
    checkSelectorMode() {
        const pathname = window.location.pathname;
        
        // 始终显示双选择框；根路径使用默认项，其他路径也显示双选择框
        if (pathname === '/' || pathname === '') {
            this.useDualSelectorWithDefault();
        } else {
            this.useDualSelector();
        }
    }
    
    // 使用双选择框模式并默认加载指定任务
    useDualSelectorWithDefault() {
        if (this.trajFileSelect) {
            this.trajFileSelect.style.display = 'none';
        }
        if (this.modelSelector && this.taskSelector) {
            this.modelSelector.style.display = 'block';
            this.taskSelector.style.display = 'block';
        }
        // 加载模型和任务列表，然后设置默认值
        this.loadModelsAndTasksWithDefault();
    }

    // 使用双选择框模式
    useDualSelector() {
        if (this.trajFileSelect) {
            this.trajFileSelect.style.display = 'none';
        }
        if (this.modelSelector && this.taskSelector) {
            this.modelSelector.style.display = 'block';
            this.taskSelector.style.display = 'block';
        }
        this.loadModelsAndTasks();
    }
    
    // 使用单选择框模式
    useSingleSelector() {
        if (this.modelSelector && this.taskSelector) {
            this.modelSelector.style.display = 'none';
            this.taskSelector.style.display = 'none';
        }
        if (this.trajFileSelect) {
            this.trajFileSelect.style.display = 'block';
        }
        this.loadTrajectoryFiles();
    }
    
    // 隐藏所有选择框
    hideAllSelectors() {
        // 隐藏单选择框
        if (this.trajFileSelect) {
            this.trajFileSelect.style.display = 'none';
            this.trajFileSelect.hidden = true;
        }
        
        // 隐藏双选择框
        if (this.modelSelector && this.taskSelector) {
            this.modelSelector.style.display = 'none';
            this.taskSelector.style.display = 'none';
        }
        
        // 备用方法：直接通过ID获取
        const fileSelector = document.getElementById('traj-file');
        const modelSelector = document.getElementById('model-selector');
        const taskSelector = document.getElementById('task-selector');
        
        if (fileSelector) {
            fileSelector.style.display = 'none';
            fileSelector.hidden = true;
        }
        if (modelSelector) {
            modelSelector.style.display = 'none';
        }
        if (taskSelector) {
            taskSelector.style.display = 'none';
        }
    }

    // 隐藏文件选择器
    hideFileSelector() {
        // 方法1：使用已初始化的元素引用
        if (this.trajFileSelect) {
            this.trajFileSelect.style.display = 'none';
            this.trajFileSelect.hidden = true;
        }
        
        // 隐藏双选择框
        if (this.modelSelector && this.taskSelector) {
            this.modelSelector.style.display = 'none';
            this.taskSelector.style.display = 'none';
        }
        
        // 方法2：直接通过ID获取（确保即使初始化失败也能隐藏）
        const fileSelector = document.getElementById('traj-file');
        if (fileSelector) {
            fileSelector.style.display = 'none';
            fileSelector.hidden = true;
        }
        
        // 隐藏双选择框（备用方法）
        const modelSelector = document.getElementById('model-selector');
        const taskSelector = document.getElementById('task-selector');
        if (modelSelector) {
            modelSelector.style.display = 'none';
        }
        if (taskSelector) {
            taskSelector.style.display = 'none';
        }
        
        // 如果还是找不到，使用查询选择器
        const selector = document.querySelector('#traj-file');
        if (selector) {
            selector.style.display = 'none';
            selector.hidden = true;
        }
    }
    
    // 根据ID加载轨迹
    async loadTrajectoryById(trajId) {
        const filename = `${trajId}.json`;
        
        // 清除之前的轨迹
        this.clearMessages();
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentModel = 'claude'; // 重置为默认值
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        this.updateProgress();
        this.updateButtonStates();
        
        try {
            const response = await fetch(`/api/trajectory?id=${encodeURIComponent(filename)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentData = data;
            // 传递 trajId 给 processTrajectoryData
            this.processTrajectoryData(data, trajId);
            this.updateTaskInfo(data);
            this.enableControls();
        } catch (error) {
            console.error('Failed to load trajectory:', error);
            this.showErrorMessage('Failed to load trajectory: ' + error.message);
        }
    }

    // 初始化DOM元素
    initializeElements() {
        this.trajFileSelect = document.getElementById('traj-file');
        this.modelSelector = document.getElementById('model-selector');
        this.taskSelector = document.getElementById('task-selector');
        this.playBtn = document.getElementById('play-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.showAllBtn = document.getElementById('show-all-btn');
        this.progressFill = document.getElementById('progress');
        this.progressText = document.getElementById('progress-text');
        this.messagesContainer = document.getElementById('messages-container');
        this.taskInfo = document.getElementById('task-info');
        this.timeInfo = document.getElementById('time-info');
        
        // 任务状态元素
        this.taskStatus = document.getElementById('task-status');
        if (this.taskStatus) {
            this.taskStatusIcon = this.taskStatus.querySelector('.task-status-icon');
            this.taskStatusText = this.taskStatus.querySelector('.task-status-text');
        }
        
        // 右侧面板元素
        this.toolSidebar = document.getElementById('tool-sidebar');
        this.toolDetails = document.getElementById('tool-details');
        this.closeSidebarBtn = document.getElementById('close-sidebar');
        
        // 检查关键元素是否存在
        if (!this.playBtn || !this.pauseBtn || !this.prevBtn || !this.nextBtn) {
            console.error('Critical button elements not found!', {
                playBtn: !!this.playBtn,
                pauseBtn: !!this.pauseBtn,
                prevBtn: !!this.prevBtn,
                nextBtn: !!this.nextBtn
            });
        }
    }

    // 初始化事件监听器
    initializeEventListeners() {
        if (this.trajFileSelect) {
            this.trajFileSelect.addEventListener('change', () => {
                this.loadTrajectory();
            });
        }

        // 双选择框事件监听器
        if (this.modelSelector) {
            this.modelSelector.addEventListener('change', () => {
                this.onModelChange();
            });
        }

        if (this.taskSelector) {
            this.taskSelector.addEventListener('change', () => {
                this.onTaskChange();
            });
        }

        if (this.playBtn) {
            this.playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Play button clicked', {
                    disabled: this.playBtn.disabled,
                    messagesLength: this.messages.length,
                    currentIndex: this.currentIndex
                });
                this.play();
            });
        } else {
            console.error('playBtn not found in DOM');
        }

        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => {
                this.pause();
            });
        } else {
            console.error('pauseBtn not found in DOM');
        }

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Prev button clicked', {
                    disabled: this.prevBtn.disabled,
                    currentIndex: this.currentIndex
                });
                this.prevStep();
            });
        } else {
            console.error('prevBtn not found in DOM');
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Next button clicked', {
                    disabled: this.nextBtn.disabled,
                    currentIndex: this.currentIndex,
                    messagesLength: this.messages.length
                });
                this.nextStep();
            });
        } else {
            console.error('nextBtn not found in DOM');
        }

        if (this.showAllBtn) {
            this.showAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAll();
            });
        }

        // 右侧面板关闭按钮
        this.closeSidebarBtn.addEventListener('click', () => {
            this.hideToolSidebar();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                e.preventDefault();
                this.prevStep();
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                e.preventDefault();
                this.nextStep();
            } else if (e.code === 'Escape') {
                if (!this.isMobile) {
                    this.hideToolSidebar();
                }
            }
        });
        
        // 监听窗口大小变化，重新检测是否为移动端
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = this.detectMobile();
            
            // 如果从桌面端切换到移动端，隐藏侧边栏
            if (!wasMobile && this.isMobile) {
                this.hideToolSidebar();
            }
        });

        // 使用事件委托处理工具调用的点击（作为备用方案）
        this.messagesContainer.addEventListener('click', (e) => {
            // 移动端不处理工具调用点击
            if (this.isMobile) {
                return;
            }
            
            // 查找最近的工具调用头部
            const clickedHeader = e.target.closest('.tool-call-header');
            if (!clickedHeader) {
                // 如果点击的不是header，检查是否在tool-call-item内
                const toolCallItem = e.target.closest('.tool-call-item');
                if (toolCallItem) {
                    const header = toolCallItem.querySelector('.tool-call-header');
                    if (header) {
                        const uniqueId = header.getAttribute('data-tool-call-id') || toolCallItem.getAttribute('data-id');
                        if (uniqueId) {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Event delegation: Tool call clicked, uniqueId:', uniqueId);
                            this.toggleToolCall(uniqueId);
                        }
                    }
                }
                return;
            }
            
            // 获取唯一ID
            const uniqueId = clickedHeader.getAttribute('data-tool-call-id');
            if (!uniqueId) {
                const toolCallItem = clickedHeader.closest('.tool-call-item');
                if (toolCallItem) {
                    const id = toolCallItem.getAttribute('data-id');
                    if (id) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Event delegation: Tool call clicked (via item), uniqueId:', id);
                        this.toggleToolCall(id);
                    }
                }
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            console.log('Event delegation: Tool call clicked, uniqueId:', uniqueId);
            this.toggleToolCall(uniqueId);
        }, true); // 使用捕获阶段
    }

    // Load trajectory files list
    async loadTrajectoryFiles() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.trajFileSelect.innerHTML = '<option value="">Select trajectory file...</option>';
            
            if (data.files && data.files.length > 0) {
                data.files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file;
                    option.textContent = file;
                    this.trajFileSelect.appendChild(option);
                });
            } else {
                this.trajFileSelect.innerHTML = '<option value="">No trajectory files found</option>';
            }
        } catch (error) {
            console.error('Failed to load file list:', error);
            this.trajFileSelect.innerHTML = '<option value="">Load failed</option>';
        }
    }

    // Load models and tasks
    async loadModelsAndTasks() {
        try {
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.modelsData = data.models || {};
            
            // 清空模型选择器
            this.modelSelector.innerHTML = '<option value="">Select model...</option>';
            
            // 添加模型选项
            Object.keys(this.modelsData).forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                this.modelSelector.appendChild(option);
            });
            
            // 重置任务选择器
            this.resetTaskSelector();

            // 如果通过路径/运行名进入，尝试预选中对应的模型与任务
            if (this.autoLoadTrajId && this.autoLoadTrajId.includes('_')) {
                const [modelName, taskName] = this.autoLoadTrajId.split('_');
                if (this.modelsData[modelName]) {
                    this.modelSelector.value = modelName;
                    await this.populateTaskSelector(modelName);
                    const filename = `${modelName}_${taskName}.json`;
                    // 选中该任务（如果存在）
                    const taskOptions = Array.from(this.taskSelector.options);
                    const match = taskOptions.find(opt => opt.value === filename);
                    if (match) {
                        this.taskSelector.value = filename;
                        // 自动加载对应轨迹
                        this.loadTrajectoryByFilename(filename);
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to load models:', error);
            this.modelSelector.innerHTML = '<option value="">Load failed</option>';
        }
    }

    // Load models and tasks with default selection
    async loadModelsAndTasksWithDefault() {
        try {
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.modelsData = data.models || {};
            
            // 清空模型选择器
            this.modelSelector.innerHTML = '<option value="">Select model...</option>';
            
            // 添加模型选项
            Object.keys(this.modelsData).forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                this.modelSelector.appendChild(option);
            });
            
            // 默认选中 claude-4.5-sonnet 模型
            const defaultModel = 'claude-4.5-sonnet';
            if (this.modelsData[defaultModel]) {
                this.modelSelector.value = defaultModel;
                // 填充任务选择器
                this.populateTaskSelector(defaultModel);
                
                // 默认选中 nvidia-market 任务
                const defaultTask = 'nvidia-market';
                const defaultFilename = `${defaultModel}_${defaultTask}.json`;
                
                // 查找对应的任务选项
                const taskOptions = Array.from(this.taskSelector.options);
                const defaultTaskOption = taskOptions.find(opt => {
                    const taskName = opt.textContent;
                    return taskName === defaultTask;
                });
                
                if (defaultTaskOption) {
                    this.taskSelector.value = defaultTaskOption.value;
                    // 自动加载默认轨迹
                    this.loadTrajectoryByFilename(defaultFilename);
                }
            } else {
                // 如果默认模型不存在，重置任务选择器
                this.resetTaskSelector();
            }
            
        } catch (error) {
            console.error('Failed to load models:', error);
            this.modelSelector.innerHTML = '<option value="">Load failed</option>';
        }
    }

    // 填充任务选择器
    async populateTaskSelector(model) {
        // 清空任务选择器
        this.taskSelector.innerHTML = '<option value="">Select task...</option>';
        
        // 添加该模型的任务选项
        const tasks = this.modelsData[model] || [];
        tasks.forEach(taskInfo => {
            const option = document.createElement('option');
            option.value = taskInfo.filename;
            option.textContent = taskInfo.task;
            this.taskSelector.appendChild(option);
        });
        
        // 启用任务选择器
        this.taskSelector.disabled = false;
    }
    
    // 重置任务选择器
    resetTaskSelector() {
        this.taskSelector.innerHTML = '<option value="">Select task...</option>';
        this.taskSelector.disabled = true;
    }
    
    // 模型选择变化处理
    onModelChange() {
        const selectedModel = this.modelSelector.value;
        
        if (!selectedModel) {
            this.resetTaskSelector();
            return;
        }
        
        // 使用统一的方法填充任务选择器
        this.populateTaskSelector(selectedModel);
    }
    
    // 任务选择变化处理
    onTaskChange() {
        const selectedFile = this.taskSelector.value;
        
        if (!selectedFile) {
            return;
        }
        
        // 加载选中的轨迹文件
        this.loadTrajectoryByFilename(selectedFile);
    }
    
    // 根据文件名加载轨迹
    async loadTrajectoryByFilename(filename) {
        // Clear previous trajectory when selecting a new one
        this.clearMessages();
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentModel = 'claude'; // 重置为默认值
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        this.updateProgress();
        this.updateButtonStates();
        
        try {
            const response = await fetch(`/api/trajectory/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentData = data;
            // 传递文件名（不含.json）给 processTrajectoryData
            const fileNameWithoutExt = filename.replace(/\.json$/, '');
            this.processTrajectoryData(data, fileNameWithoutExt);
            this.updateTaskInfo(data);
            this.enableControls();
        } catch (error) {
            console.error('Failed to load trajectory:', error);
            this.showErrorMessage('Failed to load trajectory: ' + error.message);
        }
    }

    // Load trajectory data
    async loadTrajectory() {
        const selectedFile = this.trajFileSelect.value;
        
        // Clear previous trajectory when selecting a new one
        this.clearMessages();
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.currentModel = 'claude'; // 重置为默认值
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        this.updateProgress();
        this.updateButtonStates();
        
        if (!selectedFile) {
            this.showEmptyState();
            return;
        }

        try {
            const response = await fetch(`/api/trajectory?id=${encodeURIComponent(selectedFile)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentData = data;
            // 传递文件名（不含.json）给 processTrajectoryData
            const fileNameWithoutExt = selectedFile.replace(/\.json$/, '');
            this.processTrajectoryData(data, fileNameWithoutExt);
            this.updateTaskInfo(data);
            this.enableControls();
        } catch (error) {
            console.error('Failed to load trajectory:', error);
            this.showErrorMessage('Failed to load trajectory: ' + error.message);
        }
    }

    // 处理轨迹数据
    processTrajectoryData(data, trajId = null) {
        // 检测模型类型：从文件名或config中获取
        this.detectModel(data, trajId);
        
        // 过滤掉tool消息，只保留user、assistant、system消息
        const filteredMessages = (data.messages || []).filter(msg => 
            msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system'
        );

        // 若任务失败且存在failure原因，则作为单独一轮插入到最后一个agent(assistant)消息之后
        if (data && data.pass === false && data.failure) {
            const failureText = typeof data.failure === 'string' ? data.failure : JSON.stringify(data.failure, null, 2);
            const failureMsg = {
                role: 'system',
                content: `Failure Reason\n\n${failureText}`,
                timestamp: new Date().toISOString(),
                _isFailure: true
            };
            // 找到最后一个assistant的索引
            let lastAssistantIndex = -1;
            for (let i = filteredMessages.length - 1; i >= 0; i--) {
                if (filteredMessages[i].role === 'assistant') {
                    lastAssistantIndex = i;
                    break;
                }
            }
            if (lastAssistantIndex >= 0) {
                filteredMessages.splice(lastAssistantIndex + 1, 0, failureMsg);
            } else {
                filteredMessages.push(failureMsg);
            }
        }
        
        // 不再合并连续的工具调用，每个assistant消息都单独显示
        this.messages = filteredMessages;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        this.toolResults = this.buildToolResultsMap(data.messages || []);
        this.updateProgress();
        this.updateButtonStates();
        this.updateTaskStatus(data.pass);
        this.updateCurrentStepBorder();
        this.updateSidebarForCurrentStep();
        
        // 为所有已存在的消息绑定工具调用点击事件
        this.bindAllToolCallEvents();
        
        // 正常情况：立即显示第一条用户instruction（如存在）
        if (this.messages.length > 0 && this.messages[0].role === 'user') {
            // 正常情况：立即显示第一条用户instruction
            this.displayMessage(this.messages[0]);
            this.currentIndex = 1;
            this.updateProgress();
            this.updateButtonStates();
            this.updateCurrentStepBorder();
            this.updateSidebarForCurrentStep();
        }
    }
    
    // 检测模型类型
    detectModel(data, trajId = null) {
        // 方法1: 从传入的 trajId 检测（优先）
        if (trajId && trajId.toLowerCase().includes('deepseek')) {
            this.currentModel = 'deepseek';
            return;
        }
        
        // 方法2: 从文件名检测
        const fileName = this.trajFileSelect ? this.trajFileSelect.value : '';
        if (fileName && fileName.toLowerCase().includes('deepseek')) {
            this.currentModel = 'deepseek';
            return;
        }
        
        // 方法3: 从config中检测
        if (data.config && data.config.model) {
            const modelName = data.config.model.toLowerCase();
            if (modelName.includes('deepseek')) {
                this.currentModel = 'deepseek';
                return;
            }
        }
        
        // 方法4: 从当前加载的轨迹ID检测
        if (this.autoLoadTrajId && this.autoLoadTrajId.toLowerCase().includes('deepseek')) {
            this.currentModel = 'deepseek';
            return;
        }
        
        // 默认使用 claude
        this.currentModel = 'claude';
    }
    
    // 获取模型图标和名称
    getModelHeader() {
        if (this.currentModel === 'deepseek') {
            return {
                icon: `<svg class="org-icon" fill="#4D6BFE" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>DeepSeek</title><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z"></path></svg>`,
                name: 'DeepSeek'
            };
        } else {
            return {
                icon: `<svg class="claude-icon" fill="#D97757" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Claude</title><path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill-rule="nonzero"></path></svg>`,
                name: 'Claude Sonnet'
            };
        }
    }
    
    // 为所有已存在的工具调用绑定点击事件
    bindAllToolCallEvents() {
        // 延迟执行，确保DOM已更新
        setTimeout(() => {
            const allToolCallItems = document.querySelectorAll('.tool-call-item');
            console.log('Binding events to all existing tool calls:', allToolCallItems.length);
            
            allToolCallItems.forEach((item) => {
                const header = item.querySelector('.tool-call-header');
                if (!header) return;
                
                // 检查是否已经绑定过事件（通过检查是否有data-bound属性）
                if (header.hasAttribute('data-event-bound')) return;
                
                const uniqueId = header.getAttribute('data-tool-call-id') || item.getAttribute('data-id');
                if (!uniqueId) return;
                
                // 标记为已绑定
                header.setAttribute('data-event-bound', 'true');
                
                // 确保样式
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                header.style.pointerEvents = 'auto';
                
                // 绑定点击事件
                const clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ Click handler fired for:', uniqueId);
                    this.toggleToolCall(uniqueId);
                    return false;
                };
                
                header.addEventListener('click', clickHandler, true);
                header.addEventListener('click', clickHandler, false);
                header.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ MouseDown handler fired for:', uniqueId);
                    this.toggleToolCall(uniqueId);
                    return false;
                }, true);
            });
        }, 100);
    }


    // 构建工具结果映射表
    buildToolResultsMap(messages) {
        const toolResults = new Map();
        
        messages.forEach(message => {
            if (message.role === 'tool' && message.tool_call_id) {
                toolResults.set(message.tool_call_id, {
                    content: message.content,
                    name: message.name || 'unknown_tool',
                    tool_call_id: message.tool_call_id
                });
            }
        });
        
        return toolResults;
    }

    // Update task information
    updateTaskInfo(data) {
        // Task info display removed - no longer needed
        // const config = data.config || {};
        // const taskName = config.id || 'Unknown Task';
        // const taskDesc = config.task_str || '';
        // const shortDesc = taskDesc.length > 50 ? taskDesc.substring(0, 50) + '...' : taskDesc;
        // if (this.taskInfo) {
        //     this.taskInfo.textContent = `${taskName} - ${shortDesc}`;
        // }
    }

    // 启用控制按钮
    enableControls() {
        if (this.playBtn) this.playBtn.disabled = false;
        if (this.pauseBtn) this.pauseBtn.disabled = true;
        if (this.showAllBtn) this.showAllBtn.disabled = false;
        this.updateButtonStates();
    }

    // 更新按钮状态
    updateButtonStates() {
        if (this.prevBtn) {
            this.prevBtn.disabled = this.currentIndex === 0;
        }
        if (this.nextBtn) {
            this.nextBtn.disabled = this.currentIndex >= this.messages.length;
        }
    }

    // 播放轨迹
    play() {
        console.log('play() called', {
            messagesLength: this.messages.length,
            currentIndex: this.currentIndex,
            isPlaying: this.isPlaying
        });
        
        if (this.messages.length === 0) {
            console.warn('No messages to play');
            return;
        }

        // 如果已经播放完，从头开始
        if (this.currentIndex >= this.messages.length) {
            this.currentIndex = 0;
            this.clearMessages();
        }

        this.isPlaying = true;
        this.isPaused = false;
        if (this.playBtn) this.playBtn.disabled = true;
        if (this.pauseBtn) this.pauseBtn.disabled = false;
        this.updateButtonStates();

        // 继续播放
        if (this.currentIndex < this.messages.length) {
            this.playNextMessage();
        }
    }

    // 暂停播放
    pause() {
        this.isPlaying = false;
        this.isPaused = true;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.updateButtonStates();

        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        
        // 暂停后，确保所有工具调用都有事件绑定
        this.bindAllToolCallEvents();
    }

    // 上一步
    prevStep() {
        if (this.currentIndex === 0) return;
        
        // 如果在播放中，暂停播放
        if (this.isPlaying) {
            this.pause();
        }
        
        // 移除最后一条消息
        const lastMessage = this.messagesContainer.lastElementChild;
        if (lastMessage) {
            lastMessage.remove();
        }
        
        this.currentIndex--;
        this.updateProgress();
        this.updateButtonStates();
        this.updateCurrentStepBorder();
        this.updateSidebarForCurrentStep();
    }

    // 下一步
    nextStep() {
        console.log('nextStep() called', {
            currentIndex: this.currentIndex,
            messagesLength: this.messages.length
        });
        
        if (this.currentIndex >= this.messages.length) {
            console.warn('Already at the end');
            return;
        }
        
        // 如果在播放中，暂停播放
        if (this.isPlaying) {
            this.pause();
        }
        
        const message = this.messages[this.currentIndex];
        if (!message) {
            console.error('No message at index', this.currentIndex);
            return;
        }
        
        this.displayMessage(message);
        this.currentIndex++;
        this.updateProgress();
        this.updateButtonStates();
        this.updateCurrentStepBorder();
        this.updateSidebarForCurrentStep();
    }

    // 播放下一条消息
    playNextMessage() {
        if (this.currentIndex >= this.messages.length) {
            this.finishPlayback();
            return;
        }

        const message = this.messages[this.currentIndex];
        this.displayMessage(message);
        this.currentIndex++;
        this.updateProgress();
        this.updateButtonStates();
        this.updateCurrentStepBorder();
        this.updateSidebarForCurrentStep();

        // 继续播放下一条消息
        if (this.isPlaying && this.currentIndex < this.messages.length) {
            this.playInterval = setTimeout(() => {
                this.playNextMessage();
            }, this.messageDelay);
        }
    }

    // 一次性展示全部剩余内容
    showAll() {
        // 如果在播放中，先暂停
        if (this.isPlaying) {
            this.pause();
        }
        // 依次渲染剩余消息
        while (this.currentIndex < this.messages.length) {
            const message = this.messages[this.currentIndex];
            if (!message) break;
            this.displayMessage(message);
            this.currentIndex++;
        }
        this.updateProgress();
        this.updateButtonStates();
        this.updateCurrentStepBorder();
        this.updateSidebarForCurrentStep();
        // 结束播放状态
        this.finishPlayback();
    }

    // 显示消息
    displayMessage(message) {
        const messageElement = this.createMessageElement(message);
        this.messagesContainer.appendChild(messageElement);
        
        // 在元素添加到DOM后，绑定工具调用的点击事件
        this.bindToolCallClickEvents(messageElement, message);
        
        // 同时立即绑定所有工具调用事件（包括已存在的）
        setTimeout(() => this.bindAllToolCallEvents(), 50);

        // 滚动到最新消息
        setTimeout(() => {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        
        // 更新当前步骤的边框样式
        this.updateCurrentStepBorder();
    }
    
    // 绑定工具调用点击事件
    bindToolCallClickEvents(messageElement, message) {
        const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
        if (!hasToolCalls) return;
        
        // 使用 requestAnimationFrame 确保DOM完全渲染
        requestAnimationFrame(() => {
            const toolCallItems = messageElement.querySelectorAll('.tool-call-item');
            console.log('Found tool call items:', toolCallItems.length);
            
            toolCallItems.forEach((item) => {
                const header = item.querySelector('.tool-call-header');
                if (!header) {
                    console.warn('No header found in tool-call-item');
                    return;
                }
                
                const uniqueId = header.getAttribute('data-tool-call-id') || item.getAttribute('data-id');
                if (!uniqueId) {
                    console.warn('No uniqueId found for tool call');
                    return;
                }
                
                console.log('Binding click handler for:', uniqueId);
                
                // 确保样式
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                header.style.pointerEvents = 'auto';
                
                // 移除之前可能存在的监听器（通过克隆节点）
                const newHeader = header.cloneNode(true);
                header.parentNode.replaceChild(newHeader, header);
                
                // 绑定点击事件 - 使用多种方式确保触发
                const clickHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ Click handler fired for:', uniqueId);
                    this.toggleToolCall(uniqueId);
                    return false;
                };
                
                newHeader.addEventListener('click', clickHandler, true); // 捕获阶段
                newHeader.addEventListener('click', clickHandler, false); // 冒泡阶段
                
                // 也绑定 mousedown 作为备用
                newHeader.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✅ MouseDown handler fired for:', uniqueId);
                    this.toggleToolCall(uniqueId);
                    return false;
                }, true);
            });
        });
    }

    // 创建消息元素
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        // 为失败原因的系统消息添加专用样式类
        const extraClass = message._isFailure ? ' failure-message' : '';
        messageDiv.className = `message ${message.role || 'unknown'}${extraClass}`;

        const role = message.role || 'unknown';
        const content = message.content || '';
        const timestamp = this.formatTime(message.timestamp);
        
        // 检查是否有工具调用
        const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
        
        // 获取当前消息的索引（在显示时）
        const currentMsgIndex = this.currentIndex - 1;
        
        // 为所有assistant消息添加模型标识（根据当前轨迹的模型类型）
        let modelHeader = '';
        if (role === 'assistant') {
            const modelInfo = this.getModelHeader();
            const headerClass = 'claude-header'; // 使用相同的样式类
            const labelClass = this.currentModel === 'deepseek' ? 'claude-label deepseek-label' : 'claude-label';
            modelHeader = `
                <div class="${headerClass}">
                    ${modelInfo.icon}
                    <span class="${labelClass}">${modelInfo.name}</span>
                </div>
            `;
        }

        const messageText = this.renderMessageContent(content, role);
        
        messageDiv.innerHTML = `
            ${modelHeader}
            <div class="message-content">
                <div class="message-text">${messageText}</div>
                ${hasToolCalls ? this.createToolCallsSummaryHTML(message.tool_calls, currentMsgIndex) : ''}
                <div class="message-time">${timestamp}</div>
            </div>
        `;
        
        // 保存消息索引到 DOM，方便后续查找
        if (hasToolCalls) {
            messageDiv.setAttribute('data-message-index', currentMsgIndex);
        }
        
        // 如果有工具调用，自动显示右侧面板（仅在播放时，且非移动端）
        if (hasToolCalls && this.isPlaying && !this.isMobile) {
            // 延迟一点显示，让消息先渲染完成
            setTimeout(() => {
                this.showToolSidebar(message.tool_calls);
            }, 100);
        } else if (!hasToolCalls && this.isPlaying && !this.isMobile) {
            // 如果没有工具调用且正在播放，隐藏右侧面板（非移动端）
            this.hideToolSidebar();
        } else if (this.isMobile) {
            // 移动端始终隐藏侧边栏
            this.hideToolSidebar();
        }
        // 如果不在播放状态（暂停或结束），保持右侧面板当前状态，允许用户手动点击查看（仅桌面端）

        // 添加动画效果
        setTimeout(() => {
            messageDiv.classList.add('visible');
        }, 50);

        return messageDiv;
    }

    // 创建工具调用摘要HTML（只显示图标、名称和状态）
    createToolCallsSummaryHTML(toolCalls, messageIndex = null) {
        if (!toolCalls || toolCalls.length === 0) return '';

        // 如果没有提供 messageIndex，从当前消息索引推断
        if (messageIndex === null) {
            messageIndex = this.currentIndex - 1;
        }

        const toolCallsHTML = toolCalls.map((toolCall, index) => {
            const toolName = toolCall.function?.name || '未知工具';
            const toolCallId = toolCall.id;
            
            // 查找对应的工具结果
            const toolResult = this.toolResults.get(toolCallId);
            const hasResult = !!toolResult;
            
            // 确定图标类型
            const iconClass = hasResult ? 'tool' : 'agent';
            const iconHtml = hasResult ? this.getToolIcon(toolName) : '<div class="agent-icon">A</div>';
            
            // 根据工具输出类型确定状态
            let status, statusClass;
            if (hasResult) {
                const toolOutputType = this.categorizeToolOutput(toolName, toolResult.content);
                switch (toolOutputType) {
                    case 'normal_tool_output':
                        status = '●';
                        statusClass = 'status-success';
                        break;
                    case 'overlong_tool_output':
                        status = '●';
                        statusClass = 'status-warning';
                        break;
                    case 'error_in_tool_call':
                    case 'tool_name_not_found':
                        status = '●';
                        statusClass = 'status-error';
                        break;
                    default:
                        status = '●';
                        statusClass = 'status-success';
                }
            } else {
                status = 'Calling';
                statusClass = 'status-calling';
            }
            
            return `
                <div class="tool-call-summary">
                    <div class="tool-call-info">
                        <div class="tool-icon ${iconClass}">${iconHtml}</div>
                        <span class="tool-name">${this.escapeHtml(toolName)}</span>
                        <span class="tool-status ${statusClass}">${status}</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="tool-calls-summary-container">
                ${toolCallsHTML}
            </div>
        `;
    }

    // 创建工具调用HTML
    createToolCallsHTML(toolCalls, messageIndex) {
        if (!toolCalls || toolCalls.length === 0) return '';

        const toolCallsHTML = toolCalls.map((toolCall, index) => {
            const toolName = toolCall.function?.name || '未知工具';
            const toolArgs = toolCall.function?.arguments || '{}';
            const toolCallId = toolCall.id;
            
            // 查找对应的工具结果
            const toolResult = this.toolResults.get(toolCallId);
            const hasResult = !!toolResult;
            
            // Determine if it's agent call or tool response
            const iconClass = hasResult ? 'tool' : 'agent';
            const iconHtml = hasResult ? this.getToolIcon(toolName) : '<div class="agent-icon">A</div>';
            
            // 根据工具输出类型确定状态和颜色
            let status, statusClass;
            if (hasResult) {
                const toolOutputType = this.categorizeToolOutput(toolName, toolResult.content);
                switch (toolOutputType) {
                    case 'normal_tool_output':
                        status = '●';
                        statusClass = 'status-success';
                        break;
                    case 'overlong_tool_output':
                        status = '●';
                        statusClass = 'status-warning';
                        break;
                    case 'error_in_tool_call':
                    case 'tool_name_not_found':
                        status = '●';
                        statusClass = 'status-error';
                        break;
                    default:
                        status = '●';
                        statusClass = 'status-success';
                }
            } else {
                status = 'Calling';
                statusClass = 'status-calling';
            }
            
            // 生成唯一的ID
            const uniqueId = `tool-${messageIndex}-${index}`;
            
            return `
                <div class="tool-call-item" data-id="${uniqueId}" data-tool-index="${index}">
                    <div class="tool-call-header" data-tool-call-id="${uniqueId}" style="cursor: pointer;">
                        <div class="tool-call-info">
                            <div class="tool-icon ${iconClass}">${iconHtml}</div>
                            <span class="tool-name">${this.escapeHtml(toolName)}</span>
                            <span class="tool-status ${statusClass}">${status}</span>
                        </div>
                    </div>
                    <div class="tool-call-content">
                        <div class="tool-call-details">
                            <div class="tool-section">
                                <div class="tool-section-title">Arguments</div>
                                <div class="tool-args">${this.escapeHtml(JSON.stringify(JSON.parse(toolArgs), null, 2))}</div>
                            </div>
                            ${hasResult ? `
                                <div class="tool-section">
                                    <div class="tool-section-title">Result</div>
                                    <div class="tool-result">${this.escapeHtml(this.extractTextFromResult(toolResult.content))}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="tool-calls-container">
                <div class="tool-calls-block" data-message-index="${messageIndex}">
                    ${toolCallsHTML}
                </div>
            </div>
        `;
    }

    // 切换工具调用展开/折叠，并显示右侧面板
    toggleToolCall(uniqueId) {
        // 移动端不响应工具调用点击，不显示详情
        if (this.isMobile) {
            return;
        }
        
        console.log('toggleToolCall called with uniqueId:', uniqueId);
        
        // 先查找工具调用元素
        const toolBlock = document.querySelector(`[data-id="${uniqueId}"]`);
        if (!toolBlock) {
            console.error('Tool block not found:', uniqueId);
            return;
        }
        
        console.log('Tool block found, messages length:', this.messages.length);
        
        // 切换展开/折叠状态
        toolBlock.classList.toggle('expanded');
        
        // 从 uniqueId 中提取消息索引和工具调用索引
        const match = uniqueId.match(/tool-(\d+)-(\d+)/);
        if (!match) {
            console.error('Failed to parse uniqueId:', uniqueId);
            return;
        }
        
        const messageIndex = parseInt(match[1]);
        const toolCallIndex = parseInt(match[2]);
        
        // 方法1：通过消息索引数组查找
        if (messageIndex >= 0 && messageIndex < this.messages.length) {
            const message = this.messages[messageIndex];
            if (message && message.tool_calls && message.tool_calls[toolCallIndex]) {
                // 显示单个工具调用的详情在右侧面板
                this.showToolSidebar([message.tool_calls[toolCallIndex]]);
                return;
            }
        }
        
        // 方法2：通过 DOM 向上查找消息元素
        const messageElement = toolBlock.closest('.message');
        if (messageElement) {
            const domMsgIndex = messageElement.getAttribute('data-message-index');
            if (domMsgIndex !== null) {
                const msgIdx = parseInt(domMsgIndex);
                if (msgIdx >= 0 && msgIdx < this.messages.length) {
                    const message = this.messages[msgIdx];
                    if (message && message.tool_calls && message.tool_calls[toolCallIndex]) {
                        this.showToolSidebar([message.tool_calls[toolCallIndex]]);
                        return;
                    }
                }
            }
        }
        
        // 方法3：直接在DOM中查找所有消息，逐个匹配
        const allMessages = Array.from(document.querySelectorAll('.message'));
        for (const msgEl of allMessages) {
            const toolBlocks = msgEl.querySelectorAll('.tool-call-item');
            for (let i = 0; i < toolBlocks.length; i++) {
                if (toolBlocks[i] === toolBlock) {
                    // 找到对应的消息索引
                    const msgIndex = msgEl.getAttribute('data-message-index');
                    if (msgIndex !== null) {
                        const idx = parseInt(msgIndex);
                        if (idx >= 0 && idx < this.messages.length) {
                            const message = this.messages[idx];
                            if (message && message.tool_calls && message.tool_calls[i]) {
                                this.showToolSidebar([message.tool_calls[i]]);
                                return;
                            }
                        }
                    }
                }
            }
        }
        
        console.error('Could not find tool call data for:', uniqueId);
    }

    // 分类工具输出类型
    categorizeToolOutput(toolName, toolOutputStr) {
        if (!toolOutputStr) return 'normal_tool_output';
        
        let tooloutputType = null;
        
        if (toolOutputStr.trim().startsWith("Error running tool")) {
            tooloutputType = "error_in_tool_call";
        }
        
        if (toolOutputStr.trim().endsWith("Please check this file carefully, as it may be very long!)")) {
            if (tooloutputType !== null) {
                console.warn('Multiple tool output types detected, using overlong_tool_output');
            }
            tooloutputType = "overlong_tool_output";
        }
        
        if (toolOutputStr.trim().startsWith(`Tool ${toolName} not found in agent`)) {
            if (tooloutputType !== null) {
                console.warn('Multiple tool output types detected, using tool_name_not_found');
            }
            tooloutputType = "tool_name_not_found";
        }
        
        if (tooloutputType === null) {
            tooloutputType = "normal_tool_output";
        }
        
        return tooloutputType;
    }

    // 获取工具图标
    getToolIcon(toolName) {
        // 图标映射表
        const iconMap = {
            "history": '<img src="icons/history.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "k8s": '<img src="icons/k8s.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google_map": '<img src="icons/google_map.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "git": '<img src="icons/git.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "filesystem": '<img src="icons/filesystem.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "terminal": '<img src="icons/terminal.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "yahoo": '<img src="icons/yahoo.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "github": '<img src="icons/github.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google-cloud": '<img src="icons/google_cloud.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "snowflake": '<img src="icons/snowflake.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "excel": '<img src="icons/excel.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "word": '<img src="icons/word.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "scholarly": '<img src="icons/scholar.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "local-python-execute": '<img src="icons/python.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "canvas": '<img src="icons/canvas.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "fetch": '<img src="icons/fetch.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "overlong": '<Icon icon="filter-list" size={14} color="#4286f6" />',
            "pdf": '<img src="icons/pdf.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "local-web_search": '<img src="icons/google_search.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "web_search": '<img src="icons/google_search.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "local-claim_done": '<img src="icons/claim_done.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "emails": '<img src="icons/mail.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "huggingface": '<img src="icons/hf.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "woocommerce": '<img src="icons/woo.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google_forms": '<img src="icons/google_forms.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "arxiv_local": '<img src="icons/arxiv.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google_sheet": '<img src="icons/google_sheet.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "playwright_with_chunk": '<img src="icons/playwright.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "notion": '<img src="icons/notion.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "wandb": '<img src="icons/wandb.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "memory": '<img src="icons/memory.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "rail_12306": '<img src="icons/12306.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "youtube": '<img src="icons/youtube.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "youtube_transcript": '<img src="icons/youtube_transcript.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google_calendar": '<img src="icons/calendar.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "sleep": '<img src="icons/sleep.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "pptx": '<img src="icons/pptx.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "arxiv": '<img src="icons/latex.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "google": '<img src="icons/google_cloud.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
            "howtocook": '<img src="icons/cook.png" width="14" height="14" style={{margin: 0, padding: 0, display: \'inline-block\', verticalAlign: \'middle\'}} />',
        };
        
        // 默认工具图标
        const defaultIcon = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: 0, padding: 0, display: \'inline-block\'}}><path d="M3.5 3.5L7 7L10.5 3.5M3.5 3.5H10.5M3.5 3.5V7M10.5 3.5V7M7 7V10.5M8.75 10.5H10.5M8.75 10.5H7M8.75 10.5V12.25M7 10.5V12.25M10.5 10.5V12.25" stroke="#4A90E2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        
        // 直接匹配
        if (iconMap[toolName]) {
            return iconMap[toolName];
        }

        if (toolName.toLowerCase().includes('youtube-trans')) {
            return iconMap["youtube_transcript"];
        }

        if (toolName.toLowerCase().includes('history')) {
            return iconMap["history"];
        }

        const serverName = toolName.split("-")[0];

        if (serverName in iconMap) {
            return iconMap[serverName];
        }
        
        // 模糊匹配 - 检查工具名是否包含某些关键词
        const toolNameLower = toolName.toLowerCase();
        
        // 文件系统相关
        if (['file', 'read', 'write', 'fs', 'filesystem'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.filesystem || defaultIcon;
        }
        
        // Git相关
        if (['git', 'commit', 'push', 'pull'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.git || defaultIcon;
        }
        
        // 终端相关
        if (['terminal', 'shell', 'cmd', 'bash'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.terminal || defaultIcon;
        }
        
        // 代码相关
        if (['code', 'python', 'javascript', 'java'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.github || defaultIcon;
        }
        
        
        // 数据库相关
        if (['database', 'db', 'sql', 'mysql'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.snowflake || defaultIcon;
        }
        
        // 文档相关
        if (['doc', 'pdf', 'word', 'excel'].some(keyword => toolNameLower.includes(keyword))) {
            if (toolNameLower.includes('excel')) {
                return iconMap.excel || defaultIcon;
            } else if (toolNameLower.includes('word')) {
                return iconMap.word || defaultIcon;
            } else {
                return defaultIcon;
            }
        }
        
        // 学术相关
        if (['arxiv', 'paper', 'research', 'scholar'].some(keyword => toolNameLower.includes(keyword))) {
            return iconMap.scholarly || defaultIcon;
        }
        
        // 返回默认图标
        return defaultIcon;
    }

    // 完成播放
    finishPlayback() {
        this.isPlaying = false;
        this.isPaused = false;
        this.playBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.updateButtonStates();
        
        if (this.playInterval) {
            clearTimeout(this.playInterval);
            this.playInterval = null;
        }
        
        // 播放结束后，确保所有工具调用都有事件绑定
        this.bindAllToolCallEvents();
    }

    // 清除所有消息
    clearMessages() {
        this.messagesContainer.innerHTML = '';
        this.updateCurrentStepBorder();
    }

    // Show empty state
    showEmptyState() {
        this.messagesContainer.innerHTML = '';
        if (this.taskInfo) {
            this.taskInfo.textContent = 'No trajectory loaded';
        }
        if (this.taskStatus) {
            this.taskStatus.style.display = 'none';
        }
        this.updateCurrentStepBorder();
        this.disableControls();
    }

    // Show error message
    showErrorMessage(message) {
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Load Failed</h2>
                <p>${message}</p>
            </div>
        `;
        if (this.taskInfo) {
            this.taskInfo.textContent = 'Load failed';
        }
        this.disableControls();
    }

    // 禁用控制按钮
    disableControls() {
        this.playBtn.disabled = true;
        this.pauseBtn.disabled = true;
        this.prevBtn.disabled = true;
        this.nextBtn.disabled = true;
        if (this.showAllBtn) this.showAllBtn.disabled = true;
    }

    // 更新进度
    updateProgress() {
        const progress = this.messages.length > 0 ? (this.currentIndex / this.messages.length) * 100 : 0;
        this.progressFill.style.width = `${progress}%`;
        this.progressText.textContent = `${this.currentIndex} / ${this.messages.length}`;
    }

    // 更新当前步骤的边框高亮
    updateCurrentStepBorder() {
        const messages = this.messagesContainer.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            // currentIndex - 1 是当前已显示的最后一条消息的索引
            // 第一条用户消息（index 0）不需要高亮
            const isCurrentStep = (index === this.currentIndex - 1) && !(index === 0 && msg.classList.contains('user'));
            
            if (isCurrentStep) {
                msg.classList.add('current-step');
            } else {
                msg.classList.remove('current-step');
            }
        });
    }
    
    // 更新侧边栏显示当前步骤的工具调用
    updateSidebarForCurrentStep() {
        // 移动端不显示侧边栏
        if (this.isMobile) {
            this.hideToolSidebar();
            return;
        }
        
        if (!this.messages || this.currentIndex === 0) {
            this.hideToolSidebar();
            return;
        }
        
        // 获取当前步骤的消息（currentIndex - 1 是最后一条已显示的消息）
        const currentMsgIndex = this.currentIndex - 1;
        if (currentMsgIndex < 0 || currentMsgIndex >= this.messages.length) {
            this.hideToolSidebar();
            return;
        }
        
        const currentMessage = this.messages[currentMsgIndex];
        if (currentMessage && currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
            this.showToolSidebar(currentMessage.tool_calls);
        } else {
            this.hideToolSidebar();
        }
    }
    
    // 更新任务状态显示
    updateTaskStatus(isPass) {
        if (!this.taskStatus || !this.taskStatusIcon || !this.taskStatusText) {
            return;
        }
        
        if (isPass === undefined || isPass === null) {
            this.taskStatus.style.display = 'none';
            return;
        }
        
        this.taskStatus.style.display = 'flex';
        
        if (isPass) {
            this.taskStatus.className = 'task-status task-status-passed';
            this.taskStatusIcon.textContent = '✓';
            this.taskStatusText.textContent = 'Task Completed';
        } else {
            this.taskStatus.className = 'task-status task-status-failed';
            this.taskStatusIcon.textContent = '✗';
            this.taskStatusText.textContent = 'Task Failed';
        }
    }
    
    // 更新时间信息
    updateTimeInfo() {
        // Time info display removed - bottom bar removed
        // if (this.timeInfo) {
        //     if (this.currentData && this.currentData.config) {
        //         const launchTime = this.currentData.config.launch_time;
        //         const completionTime = this.currentData.completion_time;
        //         
        //         if (launchTime && completionTime) {
        //             const start = new Date(launchTime);
        //             const end = new Date(completionTime);
        //             const duration = Math.round((end - start) / 1000);
        //             const minutes = Math.floor(duration / 60);
        //             const seconds = duration % 60;
        //             this.timeInfo.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        //         } else {
        //             this.timeInfo.textContent = '--:--';
        //         }
        //     } else {
        //         this.timeInfo.textContent = '--:--';
        //     }
        // }
    }

    // Render message content with markdown support
    renderMessageContent(content, role) {
        if (!content) return '';
        
        // 检测上下文重置消息
        const contextResetPattern = /\[Context reset\]|The context length of the previous interaction exceeds/i;
        if (contextResetPattern.test(content)) {
            return '<span class="context-reset-text">Reset Context</span>';
        }
        
        // Clean content: remove trailing whitespace and unnecessary newlines
        const cleanedContent = this.cleanContent(content);
        
        // Render markdown for assistant and user messages
        if (role === 'assistant' || role === 'user') {
            try {
                // Configure marked options
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: false
                });
                
                const rendered = marked.parse(cleanedContent);
                return this.cleanRenderedHtml(rendered);
            } catch (error) {
                console.warn('Markdown parsing failed:', error);
                return this.escapeHtml(cleanedContent);
            }
        }
        
        // For other roles (system), escape HTML
        return this.escapeHtml(cleanedContent);
    }

    // Clean content by removing trailing whitespace and unnecessary newlines
    cleanContent(content) {
        if (!content) return '';
        
        // Remove trailing whitespace from each line
        let cleaned = content.split('\n').map(line => line.trimEnd()).join('\n');
        
        // Remove multiple consecutive newlines (more than 2)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // Remove trailing newlines at the end
        cleaned = cleaned.replace(/\n+$/, '');
        
        // Remove leading newlines at the start
        cleaned = cleaned.replace(/^\n+/, '');
        
        return cleaned;
    }

    // Clean rendered HTML by removing empty paragraphs and extra whitespace
    cleanRenderedHtml(html) {
        if (!html) return '';
        
        // Remove empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');
        
        // Remove empty list items
        html = html.replace(/<li>\s*<\/li>/g, '');
        
        // Remove extra whitespace between tags
        html = html.replace(/>\s+</g, '><');
        
        // Remove trailing whitespace and newlines
        html = html.trim();
        
        return html;
    }

    // Extract text content from tool result
    extractTextFromResult(content) {
        if (!content) return '';
        
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(content);
            
            // If it has a text field, return that
            if (parsed && typeof parsed === 'object' && parsed.text) {
                return parsed.text;
            }
            
            // If it's a string, return as is
            if (typeof parsed === 'string') {
                return parsed;
            }
            
            // Otherwise return the full JSON
            return JSON.stringify(parsed, null, 2);
        } catch {
            // If parsing fails, return the content as is
            return content;
        }
    }

    // Utility methods
    formatTime(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return timestamp;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

        // 显示工具调用右侧面板
        showToolSidebar(toolCalls) {
            // 移动端不显示工具调用详情
            if (this.isMobile) {
                return;
            }
            
            if (!toolCalls || toolCalls.length === 0) {
                this.hideToolSidebar();
                return;
            }

            const sidebarHeader = this.toolSidebar.querySelector('.sidebar-header h3');
            
            // 并行调用优化
            if (toolCalls.length > 1) {
                // 多个工具调用：显示 "Call {count} tools in parallel"，不显示图标
                sidebarHeader.innerHTML = `<span class="tool-call-detail-name">Call ${toolCalls.length} tools in parallel</span>`;
            } else {
                // 单个工具调用：显示图标和名称
                const firstToolCall = toolCalls[0];
                const toolName = firstToolCall.function?.name || '未知工具';
                const toolCallId = firstToolCall.id;
                const toolResult = this.toolResults.get(toolCallId);
                const hasResult = !!toolResult;

                // 获取工具图标
                const iconHtml = this.getToolIcon(toolName);

                // 根据工具输出类型确定状态点
                let statusDot;
                if (hasResult) {
                    const toolOutputType = this.categorizeToolOutput(toolName, toolResult.content);
                    switch (toolOutputType) {
                        case 'normal_tool_output':
                            statusDot = '<span class="status-dot status-success">●</span>';
                            break;
                        case 'overlong_tool_output':
                            statusDot = '<span class="status-dot status-warning">●</span>';
                            break;
                        case 'error_in_tool_call':
                        case 'tool_name_not_found':
                            statusDot = '<span class="status-dot status-error">●</span>';
                            break;
                        default:
                            statusDot = '<span class="status-dot status-success">●</span>';
                    }
                } else {
                    statusDot = '<span class="status-dot status-calling">●</span>';
                }

                sidebarHeader.innerHTML = `
                    <div class="tool-call-detail-icon">${iconHtml}</div>
                    <span class="tool-call-detail-name">${this.escapeHtml(toolName)}</span>
                    ${statusDot}
                `;
            }

            // 生成工具调用详情HTML
            const toolDetailsHTML = toolCalls.map((toolCall, index) => {
                const toolName = toolCall.function?.name || '未知工具';
                const toolCallId = toolCall.id;
                const toolResult = this.toolResults.get(toolCallId);
                const hasResult = !!toolResult;
                const toolArgs = toolCall.function?.arguments || '{}';
                const parsedArgs = JSON.parse(toolArgs);

                // 如果是 local-python-execute 工具，特殊处理 Arguments
                let argumentsHTML;
                if (toolName === 'local-python-execute' && parsedArgs.code) {
                    argumentsHTML = `
                        <div class="tool-section">
                            <div class="tool-section-title">Code</div>
                            <div class="tool-python-code">${this.escapeHtml(parsedArgs.code)}</div>
                        </div>
                    `;
                } else {
                    argumentsHTML = `
                        <div class="tool-section">
                            <div class="tool-section-title">Arguments</div>
                            <div class="tool-args">${this.escapeHtml(JSON.stringify(parsedArgs, null, 2))}</div>
                        </div>
                    `;
                }

                // 确定工具结果的状态类（用于颜色样式）
                let resultStatusClass = '';
                if (hasResult) {
                    const toolOutputType = this.categorizeToolOutput(toolName, toolResult.content);
                    switch (toolOutputType) {
                        case 'normal_tool_output':
                            resultStatusClass = 'tool-result-success';
                            break;
                        case 'overlong_tool_output':
                            resultStatusClass = 'tool-result-warning';
                            break;
                        case 'error_in_tool_call':
                        case 'tool_name_not_found':
                            resultStatusClass = 'tool-result-error';
                            break;
                        default:
                            resultStatusClass = 'tool-result-success';
                    }
                }

                // 并行调用时，每个工具都有自己的标题（图标+名称+状态）
                let toolHeaderHTML = '';
                if (toolCalls.length > 1) {
                    const iconHtml = this.getToolIcon(toolName);
                    let statusDot;
                    if (hasResult) {
                        const toolOutputType = this.categorizeToolOutput(toolName, toolResult.content);
                        switch (toolOutputType) {
                            case 'normal_tool_output':
                                statusDot = '<span class="status-dot status-success">●</span>';
                                break;
                            case 'overlong_tool_output':
                                statusDot = '<span class="status-dot status-warning">●</span>';
                                break;
                            case 'error_in_tool_call':
                            case 'tool_name_not_found':
                                statusDot = '<span class="status-dot status-error">●</span>';
                                break;
                            default:
                                statusDot = '<span class="status-dot status-success">●</span>';
                        }
                    } else {
                        statusDot = '<span class="status-dot status-calling">●</span>';
                    }
                    
                    toolHeaderHTML = `
                        <div class="parallel-tool-header">
                            <div class="tool-call-detail-icon">${iconHtml}</div>
                            <span class="tool-call-detail-name">${this.escapeHtml(toolName)}</span>
                            ${statusDot}
                        </div>
                    `;
                }

                return `
                    ${toolCalls.length > 1 ? `<div class="parallel-tool-call">${toolHeaderHTML}` : ''}
                    ${argumentsHTML}
                    ${hasResult ? `
                        <div class="tool-section">
                            <div class="tool-section-title">Result</div>
                            <div class="tool-result ${resultStatusClass}">${this.escapeHtml(this.extractTextFromResult(toolResult.content))}</div>
                        </div>
                    ` : ''}
                    ${toolCalls.length > 1 ? '</div>' : ''}
                `;
            }).join('');

            // 更新面板内容并显示
            this.toolDetails.innerHTML = toolDetailsHTML;
            this.toolSidebar.classList.add('open');
            console.log('Tool sidebar opened');
        }

    // 隐藏工具调用右侧面板
    hideToolSidebar() {
        this.toolSidebar.classList.remove('open');
    }
}

// 初始化应用
let trajectoryReplayer;
document.addEventListener('DOMContentLoaded', () => {
    trajectoryReplayer = new TrajectoryReplayer();
});