// 强韧版 LLM 轨迹回放器（支持 URL -> 选择器联动、健壮 JSON 解析、清晰错误提示）

class TrajectoryReplayer {
    constructor() {
      // 状态
      this.modelsData = {};          // { model: [{ filename, task }, ...] }
      this.currentModel = "";
      this.currentFilename = "";
      this.currentData = null;
      this.messages = [];
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused  = false;
      this.playTimer = null;
      this.messageDelay = 1200;
      this.autoLoadTrajId = null;    // "<model>_<task>"
  
      // DOM
      this.modelSelector = document.getElementById("model-selector");
      this.taskSelector  = document.getElementById("task-selector");
      this.trajFileSelect= document.getElementById("traj-file"); // 备用
      this.playBtn  = document.getElementById("play-btn");
      this.pauseBtn = document.getElementById("pause-btn");
      this.prevBtn  = document.getElementById("prev-btn");
      this.nextBtn  = document.getElementById("next-btn");
      this.showAllBtn = document.getElementById("show-all-btn");
      this.progressBar  = document.getElementById("progress");
      this.progressText = document.getElementById("progress-text");
      this.taskStatus   = document.getElementById("task-status");
      this.msgContainer = document.getElementById("messages-container");
  
      // 若没有状态栏，动态加一个（避免你页面把它删掉时报错）
      if (!this.taskStatus) {
        this.taskStatus = document.createElement("div");
        this.taskStatus.id = "task-status";
        this.taskStatus.style.cssText = "position:fixed;right:16px;top:8px;font:12px/1.4 system-ui;color:#666;";
        document.body.appendChild(this.taskStatus);
      }
  
      // 从路径读取 <model>_<task>
      this.checkAutoLoadTrajectoryFromPath();
  
      // 初始化
      this.resetTaskSelector();
      this.initEvents();
      this.bootstrap();
    }
  
    /* ========== URL 同步 ========== */
  
    checkAutoLoadTrajectoryFromPath() {
      try {
        const seg = (location.pathname || "/").replace(/^\/+|\/+$/g, "");
        if (seg && !seg.includes(".")) this.autoLoadTrajId = seg;
      } catch (e) { console.warn("path parse failed", e); }
    }
  
    updateUrl(model, task) {
      try {
        if (!model) { history.replaceState(null, "", "/"); return; }
        const path = task ? `/${model}_${task}` : `/${model}`;
        history.replaceState(null, "", path);
      } catch (e) { console.warn("updateUrl failed", e); }
    }
  
    bindUrlSync() {
      if (this.modelSelector) {
        this.modelSelector.addEventListener("change", () => {
          const model = this.modelSelector.value;
          const filename = this.taskSelector?.value || "";
          const task = filename ? filename.replace(/^[^_]+_/, "").replace(/\.json$/, "") : null;
          this.updateUrl(model, task);
        });
      }
      if (this.taskSelector) {
        this.taskSelector.addEventListener("change", () => {
          const model = this.modelSelector?.value || null;
          const filename = this.taskSelector.value || "";
          const task = filename ? filename.replace(/^[^_]+_/, "").replace(/\.json$/, "") : null;
          if (model && task) this.updateUrl(model, task);
        });
      }
    }
  
    /* ========== 事件 & 启动 ========== */
  
    initEvents() {
      if (this.modelSelector) {
        this.modelSelector.addEventListener("change", async () => {
          const model = this.modelSelector.value;
          if (!model) { this.resetTaskSelector(); this.updateUrl(null, null); return; }
          await this.populateTaskSelector(model);
          const filename = this.taskSelector?.value || "";
          if (filename) {
            const task = filename.replace(/^[^_]+_/, "").replace(/\.json$/, "");
            this.updateUrl(model, task);
          }
        });
      }
  
      if (this.taskSelector) {
        this.taskSelector.addEventListener("change", async () => {
          const filename = this.taskSelector.value;
          if (!filename) return;
          await this.loadTrajectoryByFilename(filename);
          this.updateButtonsAndProgress();
        });
      }
  
      this.playBtn?.addEventListener("click", () => this.play());
      this.pauseBtn?.addEventListener("click", () => this.pause());
      this.prevBtn?.addEventListener("click", () => this.step(-1));
      this.nextBtn?.addEventListener("click", () => this.step(1));
      this.showAllBtn?.addEventListener("click", () => this.showAll());
  
      this.bindUrlSync();
    }
  
    async bootstrap() {
      await this.loadModelsAndMaybeAutoSelect();
  
      // 强制按 URL 载入
      if (this.autoLoadTrajId && this.autoLoadTrajId.includes("_")) {
        const [modelFromUrl, taskFromUrl] = this.autoLoadTrajId.split("_");
        console.log("[bootstrap] URL =>", modelFromUrl, taskFromUrl);
  
        if (this.modelsData[modelFromUrl]) {
          this.modelSelector.value = modelFromUrl;
          await this.populateTaskSelector(modelFromUrl);
  
          const wantedFilename = `${modelFromUrl}_${taskFromUrl}.json`;
          const hit = Array.from(this.taskSelector.options).find(o => o.value === wantedFilename);
          if (hit) {
            this.taskSelector.value = wantedFilename;
            await this.loadTrajectoryByFilename(wantedFilename);
            this.updateButtonsAndProgress();
            this.updateUrl(modelFromUrl, taskFromUrl);
            return;
          } else {
            this.setStatus(`Task not found: ${taskFromUrl}`);
            console.warn("[bootstrap] task not found in model list", { wantedFilename, modelFromUrl, tasks: this.modelsData[modelFromUrl] });
          }
        } else {
          this.setStatus(`Model not found: ${modelFromUrl}`);
          console.warn("[bootstrap] model not found", { modelFromUrl, models: Object.keys(this.modelsData) });
        }
      }
  
      // 兜底：选第一个模型和任务
      const firstModel = Object.keys(this.modelsData)[0];
      if (firstModel) {
        this.modelSelector.value = firstModel;
        await this.populateTaskSelector(firstModel);
        if (this.taskSelector.options.length > 1) {
          const firstFile = this.taskSelector.options[1].value;
          this.taskSelector.value = firstFile;
          await this.loadTrajectoryByFilename(firstFile);
          this.updateButtonsAndProgress();
          const task = firstFile.replace(/^[^_]+_/, "").replace(/\.json$/, "");
          this.updateUrl(firstModel, task);
        }
      }
    }
  
    /* ========== 与后端交互 ========== */
  
    async loadModelsAndMaybeAutoSelect() {
      try {
        const resp = await fetch("/api/models");
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data || !data.models) throw new Error("models api: empty payload");
  
        this.modelsData = data.models;
        console.log("[models]", this.modelsData);
  
        this.modelSelector.innerHTML = '<option value="">Select model...</option>';
        Object.keys(this.modelsData).forEach(m => {
          const opt = document.createElement("option");
          opt.value = m; opt.textContent = m;
          this.modelSelector.appendChild(opt);
        });
  
        this.resetTaskSelector();
        this.setStatus("Models loaded");
      } catch (e) {
        console.error("Failed to load models:", e);
        this.modelSelector.innerHTML = '<option value="">Load failed</option>';
        this.resetTaskSelector();
        this.setStatus("Load models failed");
      }
    }
  
    async populateTaskSelector(model) {
      this.taskSelector.innerHTML = '<option value="">Select task...</option>';
      this.taskSelector.disabled = true;
  
      const tasks = this.modelsData[model] || [];
      for (const { filename, task } of tasks) {
        const opt = document.createElement("option");
        opt.value = filename;      // "<model>_<task>.json"
        opt.textContent = task;    // "task"
        this.taskSelector.appendChild(opt);
      }
      if (tasks.length > 0) this.taskSelector.disabled = false;
    }
  
    async loadTrajectoryByFilename(filename) {
      try {
        this.currentModel = filename.replace(/_.*$/, "");
        this.currentFilename = filename;
  
        const url = `/api/trajectory/${filename}`;
        const resp = await fetch(url);
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(`HTTP ${resp.status} @ ${url} ${txt.slice(0,160)}`);
        }
  
        // 尝试 JSON 解析，不行则回退到 text -> JSON
        let data;
        const ctype = resp.headers.get("content-type") || "";
        if (ctype.includes("application/json")) {
          data = await resp.json();
        } else {
          const txt = await resp.text();
          console.warn("[trajectory] non-json content-type, raw text:", txt.slice(0,200));
          data = JSON.parse(txt);
        }
  
        console.log("[trajectory raw]", data);
        this.processTrajectoryData(data, filename.replace(/\.json$/, ""));
        this.renderUpTo(this.currentIndex);
        this.setStatus(`Loaded: ${filename} (${this.messages.length} msgs)`);
      } catch (e) {
        console.error("loadTrajectory failed:", e);
        this.setStatus("traj load failed");
        this.msgContainer.innerHTML =
          `<div class="error" style="padding:8px;color:#b00;background:#fee;border:1px solid #fbb;border-radius:6px;">
             Load failed: ${this.escapeHTML(e.message)}
           </div>`;
      }
    }
  
    /* ========== 解析、渲染 ========== */
  
    // 兼容多种结构，返回统一的消息数组
    normalizeMessages(raw) {
      // 1) 直接数组
      if (Array.isArray(raw)) return raw;
  
      // 2) 常见字段
      const candidates = [
        raw?.messages, raw?.data?.messages, raw?.trajectory, raw?.turns,
        raw?.conversation, raw?.chat, raw?.steps
      ];
      for (const c of candidates) if (Array.isArray(c)) return c;
  
      // 3) 某些文件是 { logs: [...] } 或 { events: [...] }
      if (Array.isArray(raw?.logs))   return raw.logs;
      if (Array.isArray(raw?.events)) return raw.events;
  
      // 4) 没找到
      return [];
    }
  
    // 把各种消息结构统一到 {role, content} 文本
    toRenderableMessages(arr) {
      const out = [];
      for (let i = 0; i < arr.length; i++) {
        const m = arr[i] || {};
  
        // OpenAI 风格：{role, content(string | [{type:"text", text}])}
        let role = m.role || m.type || "message";
        let content = "";
  
        if (typeof m.content === "string") {
          content = m.content;
        } else if (Array.isArray(m.content)) {
          const textParts = m.content
            .map(p => (p?.type === "text" && (p?.text || p?.content)) || "")
            .filter(Boolean);
          content = textParts.join("\n").trim();
        } else if (m.content && typeof m.content === "object") {
          content =
            m.content.text || m.content.message || m.text || m.message ||
            JSON.stringify(m.content);
        } else if (m.text) {
          content = m.text;
        } else if (m.message) {
          content = m.message;
        } else if (m.delta && typeof m.delta === "string") {
          content = m.delta;
        } else {
          // 兜底
          content = JSON.stringify(m);
        }
  
        out.push({ role, content, index: i });
      }
      return out;
    }
  
    processTrajectoryData(raw, trajId = "") {
      const arr = this.normalizeMessages(raw);
      console.log("[normalize]", { length: arr.length, sample: arr[0] });
  
      const msgs = this.toRenderableMessages(arr);
      this.currentData = raw;
      this.messages = msgs;
      this.currentIndex = 0;
      this.isPlaying = false;
      this.isPaused  = false;
      this.msgContainer.innerHTML = "";
      if (msgs.length === 0) {
        this.msgContainer.innerHTML =
          `<div class="warn" style="padding:8px;background:#fffae6;border:1px solid #ffe58f;border-radius:6px;color:#8b6d00;">
             Parsed 0 messages. Please check the file structure.
           </div>`;
      }
      this.updateButtonsAndProgress();
    }
  
    renderUpTo(n) {
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
      const meta = document.createElement("div");
      meta.className = "message-meta";
      meta.textContent = `${m.index + 1}. ${m.role}`;
      const body = document.createElement("div");
      body.className = "message-text";
      body.innerHTML = this.escapeHTML(m.content).replace(/\n/g, "<br/>");
      div.appendChild(meta); div.appendChild(body);
      return div;
    }
  
    escapeHTML(s) {
      return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")
                      .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
                      .replace(/'/g,"&#39;");
    }
  
    /* ========== 播放控制 ========== */
  
    play() {
      if (!this.messages.length) return;
      if (this.isPlaying && !this.isPaused) return;
      this.isPlaying = true; this.isPaused = false;
  
      const tick = () => {
        if (!this.isPlaying || this.isPaused) return;
        if (this.currentIndex >= this.messages.length) { this.stop(); return; }
        this.msgContainer.appendChild(this.renderMessage(this.messages[this.currentIndex]));
        this.currentIndex += 1;
        this.updateButtonsAndProgress();
        this.playTimer = setTimeout(tick, this.messageDelay);
      };
  
      clearTimeout(this.playTimer);
      tick();
    }
  
    pause() { this.isPaused = true; clearTimeout(this.playTimer); this.updateButtonsAndProgress(); }
    stop()  { this.isPlaying = false; this.isPaused = false; clearTimeout(this.playTimer); this.updateButtonsAndProgress(); }
    step(d) { if (!this.messages.length) return; const n = Math.max(0, Math.min(this.currentIndex + d, this.messages.length)); this.renderUpTo(n); }
    showAll(){ this.renderUpTo(this.messages.length); }
  
    /* ========== UI 辅助 ========== */
  
    resetTaskSelector() {
      if (this.taskSelector) {
        this.taskSelector.innerHTML = '<option value="">Select task...</option>';
        this.taskSelector.disabled = true;
      }
    }
  
    updateButtonsAndProgress() {
      const total = this.messages.length || 0;
      const cur   = this.currentIndex || 0;
      if (this.progressText) this.progressText.textContent = total ? `${cur}/${total}` : "0/0";
      if (this.progressBar)  this.progressBar.value = total ? Math.round((cur / total) * 100) : 0;
  
      if (this.playBtn)   this.playBtn.disabled   = !total || (this.isPlaying && !this.isPaused);
      if (this.pauseBtn)  this.pauseBtn.disabled  = !total || !this.isPlaying || this.isPaused;
      if (this.prevBtn)   this.prevBtn.disabled   = !total || cur <= 0;
      if (this.nextBtn)   this.nextBtn.disabled   = !total || cur >= total;
      if (this.showAllBtn)this.showAllBtn.disabled= !total || cur >= total;
    }
  
    setStatus(msg) { if (this.taskStatus) this.taskStatus.textContent = msg || ""; }
  }
  
  /* 启动 */
  let trajectoryReplayer = null;
  window.addEventListener("DOMContentLoaded", () => { trajectoryReplayer = new TrajectoryReplayer(); });
  

/* ===== HOTFIX: robust container + visible styles + empty-state ===== */

// 1) 更强健地拿到消息容器：支持多种常见选择器；最后兜底 body
(function ensureMsgContainer() {
    const pick = (sel) => document.querySelector(sel);
    const cand = [
      '#messages-container', '#messages', '.messages',
      '#msg-container', '.msg-container', '#content', '.content'
    ];
    let el = cand.map(pick).find(Boolean);
    if (!el) {
      el = document.createElement('div');
      el.id = 'messages-container';
      document.body.appendChild(el);
    }
    // 覆盖实例上的引用
    if (window.trajectoryReplayer) {
      window.trajectoryReplayer.msgContainer = el;
    }
    // 基本可见样式，避免“看不见”的情况
    Object.assign(el.style, {
      minHeight: '240px',
      padding: '12px',
      color: '#111',
      background: '#fff',
      lineHeight: '1.55',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, PingFang SC, Microsoft YaHei, sans-serif'
    });
  })();
  
  // 2) 如果解析后为 0 条，给出可视化提示（而不是空白）
  (function patchEmptyRender() {
    const R = window.trajectoryReplayer;
    if (!R) return;
    // 保存原方法
    const _process = R.processTrajectoryData.bind(R);
  
    R.processTrajectoryData = function(raw, trajId) {
      _process(raw, trajId);
      try {
        if (!Array.isArray(this.messages) || this.messages.length === 0) {
          const topKeys = raw && typeof raw === 'object' ? Object.keys(raw).slice(0, 20) : [];
          this.msgContainer.innerHTML =
            `<div style="padding:10px;border:1px solid #ffe58f;background:#fffae6;border-radius:8px;color:#8b6d00">
               未解析出可显示的对话内容（0 条）。<br/>
               <small>文件：<code>${this.currentFilename||''}</code></small><br/>
               <small>顶层字段：<code>${topKeys.join(', ')}</code></small>
             </div>`;
        }
      } catch(e) {
        console.warn('empty-state patch failed:', e);
      }
    };
  })();
  
  // 3) 渲染一条“演示气泡”，用于判定是否是 CSS/容器问题（仅当容器为空时）
  (function demoBubbleIfEmpty() {
    const R = window.trajectoryReplayer;
    if (!R || !R.msgContainer) return;
    if (R.msgContainer.children.length === 0) {
      const demo = document.createElement('div');
      demo.style.cssText = 'padding:8px 10px;border:1px dashed #ddd;border-radius:8px;color:#333;background:#fafafa;margin:8px 0';
      demo.textContent = '（调试占位）这里会显示对话。如果一直只看到这条占位，请刷新缓存或检查接口/解析。';
      R.msgContainer.appendChild(demo);
    }
  })();
  