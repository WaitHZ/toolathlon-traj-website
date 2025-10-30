// 简洁的 LLM 轨迹回放器（纯前端）
// 需要的 DOM：
// - #model-selector, #task-selector(#traj-file 可作为备用/隐藏)
// - #play-btn, #pause-btn, #prev-btn, #next-btn, #show-all-btn
// - #progress, #progress-text
// - #messages-container
// 可选：#task-status, #tool-sidebar, #close-sidebar, #tool-details

class TrajectoryReplayer {
    constructor() {
      // 数据与状态
      this.modelsData = {};          // { model: [{ filename, task }, ...] }
      this.currentModel = "";
      this.currentFilename = "";
      this.currentData = null;       // { messages: [...] } 或数组
      this.messages = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.playTimer = null;
      this.messageDelay = 1200;      // 每条消息的播放间隔
      this.autoLoadTrajId = null;    // 形如 "<model>_<task>"
  
      // 绑定 DOM
      this.modelSelector = document.getElementById("model-selector");
      this.taskSelector  = document.getElementById("task-selector");
      this.trajFileSelect = document.getElementById("traj-file"); // 备用/隐藏
      this.playBtn  = document.getElementById("play-btn");
      this.pauseBtn = document.getElementById("pause-btn");
      this.prevBtn  = document.getElementById("prev-btn");
      this.nextBtn  = document.getElementById("next-btn");
      this.showAllBtn = document.getElementById("show-all-btn");
      this.progressBar  = document.getElementById("progress");
      this.progressText = document.getElementById("progress-text");
      this.taskStatus   = document.getElementById("task-status");
      this.msgContainer = document.getElementById("messages-container");
  
      // 从路径中读取 <model>_<task>
      this.checkAutoLoadTrajectoryFromPath();
  
      // 初始化
      this.resetTaskSelector();
      this.initEvents();
      this.bootstrap();
    }
  
    /* ---------------- URL <-> 选择器 ---------------- */
  
    checkAutoLoadTrajectoryFromPath() {
      try {
        const seg = (location.pathname || "/").replace(/^\/+|\/+$/g, "");
        if (seg && !seg.includes(".")) {
          // e.g. "claude-4.5-sonnet_merge-hf-datasets"
          this.autoLoadTrajId = seg;
        }
      } catch (e) {
        console.warn("path parse failed", e);
      }
    }
  
    updateUrl(model, task) {
      try {
        if (!model) {
          history.replaceState(null, "", "/");
          return;
        }
        const path = task ? `/${model}_${task}` : `/${model}`;
        history.replaceState(null, "", path);
      } catch (e) {
        console.warn("updateUrl failed", e);
      }
    }
  
    bindUrlSync() {
      if (this.modelSelector) {
        this.modelSelector.addEventListener("change", () => {
          const model = this.modelSelector.value;
          const filename = this.taskSelector?.value || "";
          const task = filename
            ? filename.replace(/^[^_]+_/, "").replace(/\.json$/, "")
            : null;
          this.updateUrl(model, task);
        });
      }
      if (this.taskSelector) {
        this.taskSelector.addEventListener("change", () => {
          const model = this.modelSelector?.value || null;
          const filename = this.taskSelector.value || "";
          const task = filename
            ? filename.replace(/^[^_]+_/, "").replace(/\.json$/, "")
            : null;
          if (model && task) this.updateUrl(model, task);
        });
      }
    }
  
    /* ---------------- 初始化与事件 ---------------- */
  
    initEvents() {
      // 模型改变 -> 填充任务
      if (this.modelSelector) {
        this.modelSelector.addEventListener("change", async () => {
          const model = this.modelSelector.value;
          if (!model) {
            this.resetTaskSelector();
            this.updateUrl(null, null);
            return;
          }
          await this.populateTaskSelector(model);
          // 若自动选择了第一个任务，更新 URL
          const filename = this.taskSelector?.value || "";
          if (filename) {
            const task = filename.replace(/^[^_]+_/, "").replace(/\.json$/, "");
            this.updateUrl(model, task);
          }
        });
      }
  
      // 任务改变 -> 加载轨迹
      if (this.taskSelector) {
        this.taskSelector.addEventListener("change", async () => {
          const filename = this.taskSelector.value;
          if (!filename) return;
          await this.loadTrajectoryByFilename(filename);
          this.updateButtonsAndProgress();
        });
      }
  
      // 播放控制
      this.playBtn?.addEventListener("click", () => this.play());
      this.pauseBtn?.addEventListener("click", () => this.pause());
      this.prevBtn?.addEventListener("click", () => this.step(-1));
      this.nextBtn?.addEventListener("click", () => this.step(1));
      this.showAllBtn?.addEventListener("click", () => this.showAll());
  
      // 选择器与 URL 同步
      this.bindUrlSync();
    }
  
    async bootstrap() {
        // 1) 先加载模型列表
        await this.loadModelsAndMaybeAutoSelect();
      
        // 2) 若 URL 中携带 <model>_<task>，强制按它来
        if (this.autoLoadTrajId && this.autoLoadTrajId.includes("_")) {
          const [modelFromUrl, taskFromUrl] = this.autoLoadTrajId.split("_");
      
          // 2.1 选中模型（若存在）
          if (this.modelsData[modelFromUrl]) {
            this.modelSelector.value = modelFromUrl;
      
            // 2.2 填充该模型的任务列表（await 确保已插入 DOM 选项）
            await this.populateTaskSelector(modelFromUrl);
      
            // 2.3 计算文件名并尝试选中
            const wantedFilename = `${modelFromUrl}_${taskFromUrl}.json`;
            const opts = Array.from(this.taskSelector.options);
            const hit = opts.find(o => o.value === wantedFilename);
      
            if (hit) {
              this.taskSelector.value = wantedFilename;
              // 2.4 立即加载该轨迹
              await this.loadTrajectoryByFilename(wantedFilename);
              this.updateButtonsAndProgress();
              // 同步地址（保证格式统一）
              this.updateUrl(modelFromUrl, taskFromUrl);
              return; // 直接结束 bootstrap
            }
          }
        }
      
        // 3) 否则默认选中第一个模型和它的第一个任务
        const firstModel = Object.keys(this.modelsData)[0];
        if (firstModel) {
          this.modelSelector.value = firstModel;
          await this.populateTaskSelector(firstModel);
      
          // 第 0 个是 “Select task...”，从第 1 个开始
          if (this.taskSelector.options.length > 1) {
            const firstFile = this.taskSelector.options[1].value;
            this.taskSelector.value = firstFile;
            await this.loadTrajectoryByFilename(firstFile);
            this.updateButtonsAndProgress();
      
            // 同步地址
            const task = firstFile.replace(/^[^_]+_/, "").replace(/\.json$/, "");
            this.updateUrl(firstModel, task);
          }
        }
      }
  
    /* ---------------- 与后端交互 ---------------- */
  
    async loadModelsAndMaybeAutoSelect() {
      try {
        const resp = await fetch("/api/models");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        this.modelsData = data.models || {};
  
        // 填充模型下拉
        this.modelSelector.innerHTML = '<option value="">Select model...</option>';
        Object.keys(this.modelsData).forEach(m => {
          const opt = document.createElement("option");
          opt.value = m;
          opt.textContent = m;
          this.modelSelector.appendChild(opt);
        });
  
        this.resetTaskSelector();
      } catch (e) {
        console.error("Failed to load models:", e);
        this.modelSelector.innerHTML = '<option value="">Load failed</option>';
        this.resetTaskSelector();
        this.setStatus("Load models failed");
      }
    }
  
    async populateTaskSelector(model) {
        // 统一刷新任务下拉
        this.taskSelector.innerHTML = '<option value="">Select task...</option>';
        this.taskSelector.disabled = true;
      
        const tasks = this.modelsData[model] || [];
        for (const { filename, task } of tasks) {
          const opt = document.createElement("option");
          opt.value = filename;    // e.g. "claude-4.5-sonnet_merge-hf-datasets.json"
          opt.textContent = task;  // e.g. "merge-hf-datasets"
          this.taskSelector.appendChild(opt);
        }
        if (tasks.length > 0) this.taskSelector.disabled = false;
      }
  
    async loadTrajectoryByFilename(filename) {
      try {
        this.currentModel = filename.replace(/_.*$/, ""); // 取下划线前
        this.currentFilename = filename;
  
        const resp = await fetch(`/api/trajectory/${filename}`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
  
        this.processTrajectoryData(data, filename.replace(/\.json$/, ""));
        this.renderUpTo(this.currentIndex); // 保持当前进度（通常 0）
        this.setStatus("Loaded");
      } catch (e) {
        console.error("loadTrajectory failed:", e);
        this.setStatus("traj load failed");
        this.msgContainer.innerHTML =
          `<div class="error">Load failed: ${e.message}</div>`;
      }
    }
  
    /* ---------------- 数据处理与渲染 ---------------- */
  
    processTrajectoryData(raw, trajId = "") {
      // 兼容两种格式：{ messages: [...] } 或直接 messages 数组
      const msgs = Array.isArray(raw) ? raw : (raw.messages || []);
      this.currentData = raw;
      this.messages = msgs.map((m, i) => ({
        role: m.role || m.type || "message",
        content: typeof m.content === "string"
          ? m.content
          : (m.content?.text || m.text || JSON.stringify(m.content || m)),
        index: i
      }));
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused = false;
      this.msgContainer.innerHTML = "";
      this.updateButtonsAndProgress();
    }
  
    renderUpTo(n) {
      // 渲染 [0..n] 的消息
      const clamp = Math.max(0, Math.min(n, this.messages.length));
      this.msgContainer.innerHTML = "";
      for (let i = 0; i < clamp; i++) {
        this.msgContainer.appendChild(this.renderMessage(this.messages[i]));
      }
      this.currentIndex = clamp;
      this.updateButtonsAndProgress();
    }
  
    renderMessage(m) {
      const div = document.createElement("div");
      div.className = `message ${m.role}`;
      const header = document.createElement("div");
      header.className = "message-meta";
      header.textContent = `${m.index + 1}. ${m.role}`;
      const body = document.createElement("div");
      body.className = "message-text";
      body.innerHTML = this.escapeToHTML(m.content).replace(/\n/g, "<br/>");
      div.appendChild(header);
      div.appendChild(body);
      return div;
    }
  
    escapeToHTML(s) {
      return String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
  
    /* ---------------- 播放控制 ---------------- */
  
    play() {
      if (!this.messages.length) return;
      if (this.isPlaying && !this.isPaused) return;
      this.isPlaying = true;
      this.isPaused = false;
  
      const tick = () => {
        if (!this.isPlaying || this.isPaused) return;
        if (this.currentIndex >= this.messages.length) {
          this.stop();
          return;
        }
        // 追加一条
        this.msgContainer.appendChild(
          this.renderMessage(this.messages[this.currentIndex])
        );
        this.currentIndex += 1;
        this.updateButtonsAndProgress();
        this.playTimer = setTimeout(tick, this.messageDelay);
      };
  
      clearTimeout(this.playTimer);
      tick();
    }
  
    pause() {
      this.isPaused = true;
      clearTimeout(this.playTimer);
      this.updateButtonsAndProgress();
    }
  
    stop() {
      this.isPlaying = false;
      this.isPaused = false;
      clearTimeout(this.playTimer);
      this.updateButtonsAndProgress();
    }
  
    step(delta) {
      if (!this.messages.length) return;
      const next = Math.max(0, Math.min(this.currentIndex + delta, this.messages.length));
      this.renderUpTo(next);
    }
  
    showAll() {
      this.renderUpTo(this.messages.length);
    }
  
    /* ---------------- UI 辅助 ---------------- */
  
    resetTaskSelector() {
      if (this.taskSelector) {
        this.taskSelector.innerHTML = '<option value="">Select task...</option>';
        this.taskSelector.disabled = true;
      }
    }
  
    updateButtonsAndProgress() {
      const total = this.messages.length || 0;
      const cur = this.currentIndex || 0;
  
      if (this.progressText) {
        this.progressText.textContent = total ? `${cur}/${total}` : "0/0";
      }
      if (this.progressBar) {
        const pct = total ? Math.round((cur / total) * 100) : 0;
        this.progressBar.value = pct;
      }
  
      // 按钮状态
      if (this.playBtn)  this.playBtn.disabled  = !total || (this.isPlaying && !this.isPaused);
      if (this.pauseBtn) this.pauseBtn.disabled = !total || !this.isPlaying || this.isPaused;
      if (this.prevBtn)  this.prevBtn.disabled  = !total || cur <= 0;
      if (this.nextBtn)  this.nextBtn.disabled  = !total || cur >= total;
      if (this.showAllBtn) this.showAllBtn.disabled = !total || cur >= total;
    }
  
    setStatus(msg) {
      if (this.taskStatus) this.taskStatus.textContent = msg || "";
    }
  }
  
  /* ---------------- 启动 ---------------- */
  let trajectoryReplayer = null;
  window.addEventListener("DOMContentLoaded", () => {
    trajectoryReplayer = new TrajectoryReplayer();
  });
  