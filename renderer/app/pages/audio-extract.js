import { elFromHTML, pageHeader, topToast } from "../ui.js";

export const route = {
  path: "/audio-extract",
  title: "音频提取",
  async render() {
    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "视频音频提取",
          subtitle: "从视频文件中提取音频轨道，为配音/克隆/降噪做准备",
          actionsHTML: `
            <button class="btn btn-primary" id="btn-start">开始提取</button>
            <button class="btn" id="btn-open" disabled>打开输出位置</button>
          `
        })}

        <div class="grid cols-2">
          <div class="card">
            <div class="card-title"><h3>选择视频文件</h3><span class="pill">本地</span></div>
            <div class="card-actions" style="margin-bottom: 10px; flex-wrap: wrap;">
              <button class="btn btn-primary" id="btn-pick">选择视频文件</button>
              <span class="pill mono" id="file">未选择</span>
            </div>
            <div class="hint">支持常见格式（mp4/mov/mkv/avi/webm 等），将直接调用本地 ffmpeg 从视频中提取音轨。</div>
          </div>

          <div class="card">
            <div class="card-title"><h3>保存位置</h3><span class="pill">自定义</span></div>
            <div class="card-actions" style="margin-bottom: 10px; flex-wrap: wrap;">
              <button class="btn" id="btn-pick-output">设置保存地址</button>
              <span class="pill mono" id="out-path">未设置</span>
            </div>
            <div class="hint">可自定义导出音频的完整保存路径和文件名，默认会自动带上对应扩展名。</div>
          </div>
        </div>

        <div class="grid cols-2" style="margin-top: 12px;">
          <div class="card">
            <div class="card-title"><h3>提取参数</h3><span class="pill">可调整</span></div>
            <div class="grid cols-3">
              <div class="field">
                <div class="label">音频格式</div>
                <select id="format">
                  <option value="mp3" selected>MP3（推荐）</option>
                  <option value="wav">WAV（无损）</option>
                  <option value="aac">AAC</option>
                </select>
              </div>
              <div class="field">
                <div class="label">音质</div>
                <select id="bitrate">
                  <option value="128">标准 128kbps</option>
                  <option value="192" selected>高清 192kbps</option>
                  <option value="320">高质 320kbps</option>
                </select>
              </div>
              <div class="field">
                <div class="label">采样率</div>
                <select id="sample">
                  <option value="44100" selected>44.1 kHz</option>
                  <option value="48000">48 kHz</option>
                  <option value="16000">16 kHz</option>
                </select>
              </div>
            </div>
            <div class="hint" style="margin-top: 10px">提取结果会直接输出为音频文件，可用于后续克隆、配音、ASR 等模块。</div>
          </div>

          <div class="card">
            <div class="card-title"><h3>使用说明</h3><span class="pill">流程</span></div>
            <ol class="hint" style="margin: 0; padding-left: 18px; line-height: 1.8">
              <li>选择需要提取音频的视频文件</li>
              <li>设置音频格式、音质和采样率</li>
              <li>设置导出文件保存地址</li>
              <li>点击开始提取，完成后直接在本地打开结果</li>
            </ol>
          </div>
        </div>

        <div class="card" style="margin-top: 12px">
          <div class="card-title"><h3>运行日志</h3><span class="pill">实时结果</span></div>
          <pre class="clone-log" id="extract-log" style="min-height: 220px;"></pre>
        </div>
      </div>
    `);

    const fileEl = root.querySelector("#file");
    const outPathEl = root.querySelector("#out-path");
    const formatEl = root.querySelector("#format");
    const bitrateEl = root.querySelector("#bitrate");
    const sampleEl = root.querySelector("#sample");
    const logEl = root.querySelector("#extract-log");
    const startBtn = root.querySelector("#btn-start");
    const openBtn = root.querySelector("#btn-open");
    const pickBtn = root.querySelector("#btn-pick");
    const pickOutputBtn = root.querySelector("#btn-pick-output");

    let inputVideoPath = "";
    let outputAudioPath = "";

    const pushLog = (level, message) => {
      if (!logEl) return;
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      logEl.textContent += `[${ts}][${String(level || "info")}] ${String(message || "")}\n`;
      logEl.scrollTop = logEl.scrollHeight;
    };
    const clearLog = () => {
      if (logEl) logEl.textContent = "";
    };
    const getExtByFormat = () => {
      const format = String(formatEl?.value || "mp3").trim().toLowerCase();
      return ["mp3", "wav", "aac"].includes(format) ? format : "mp3";
    };
    const updateOutputText = () => {
      outPathEl.textContent = outputAudioPath || "未设置";
      outPathEl.title = outputAudioPath || "";
      openBtn.disabled = !outputAudioPath;
    };
    const guessDefaultOutputPath = () => {
      if (!inputVideoPath) return "";
      const ext = getExtByFormat();
      return inputVideoPath.replace(/\.[^.\\\/]+$/, "") + `_audio.${ext}`;
    };
    const ensureOutputPathByFormat = () => {
      if (!outputAudioPath) {
        outputAudioPath = guessDefaultOutputPath();
        updateOutputText();
        return;
      }
      const ext = getExtByFormat();
      outputAudioPath = outputAudioPath.replace(/\.(mp3|wav|aac)$/i, "") + `.${ext}`;
      updateOutputText();
    };

    pickBtn.addEventListener("click", async () => {
      const res = await window.api?.openFile?.();
      if (!res || res.canceled) return;
      const fp = String(res.filePaths?.[0] || "").trim();
      if (!fp) return;
      inputVideoPath = fp;
      fileEl.textContent = fp;
      fileEl.title = fp;
      if (!outputAudioPath) outputAudioPath = guessDefaultOutputPath();
      ensureOutputPathByFormat();
      topToast("已选择视频文件。");
    });

    pickOutputBtn.addEventListener("click", async () => {
      const ext = getExtByFormat();
      const res = await window.api?.saveFile?.({
        defaultPath: outputAudioPath || guessDefaultOutputPath() || `提取音频.${ext}`,
        filters: [{ name: `${ext.toUpperCase()} Audio`, extensions: [ext] }]
      });
      if (!res || res.canceled) return;
      outputAudioPath = String(res.filePath || "").trim();
      ensureOutputPathByFormat();
      topToast("已设置保存地址。");
    });

    formatEl.addEventListener("change", ensureOutputPathByFormat);

    startBtn.addEventListener("click", async () => {
      if (!inputVideoPath) {
        topToast("请先选择视频文件。", { type: "warn" });
        return;
      }
      ensureOutputPathByFormat();
      if (!outputAudioPath) {
        topToast("请先设置音频保存地址。", { type: "warn" });
        return;
      }
      clearLog();
      pushLog("info", `输入视频：${inputVideoPath}`);
      pushLog("info", `输出音频：${outputAudioPath}`);
      startBtn.disabled = true;
      pickBtn.disabled = true;
      pickOutputBtn.disabled = true;
      startBtn.textContent = "提取中...";
      try {
        const res = await window.api?.video?.extractAudio?.({
          inputVideo: inputVideoPath,
          outPath: outputAudioPath,
          format: getExtByFormat(),
          bitrateKbps: Number(bitrateEl?.value || 192) || 192,
          sampleRate: Number(sampleEl?.value || 44100) || 44100
        });
        if (!res?.ok || !res?.outPath) {
          pushLog("error", String(res?.message || "音频提取失败"));
          topToast("音频提取失败。", { type: "error" });
          return;
        }
        outputAudioPath = String(res.outPath || "").trim();
        updateOutputText();
        if (res.log) pushLog("debug", String(res.log || "").trim());
        pushLog("info", `提取完成：${outputAudioPath}`);
        topToast("音频提取完成。");
      } catch (e) {
        pushLog("error", String(e?.message || e));
        topToast("音频提取失败。", { type: "error" });
      } finally {
        startBtn.disabled = false;
        pickBtn.disabled = false;
        pickOutputBtn.disabled = false;
        startBtn.textContent = "开始提取";
      }
    });

    openBtn.addEventListener("click", async () => {
      if (!outputAudioPath) return;
      await window.api?.shell?.reveal?.({ path: outputAudioPath });
    });

    updateOutputText();

    return root;
  }
};
