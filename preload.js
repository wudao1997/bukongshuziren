const { contextBridge, ipcRenderer } = require("electron");

function isMissingIpcHandlerError(error, channels = []) {
  const text = String(error?.message || error || "").trim();
  return Array.isArray(channels) && channels.some((channel) => text.includes(`No handler registered for '${String(channel || "").trim()}'`));
}

async function invokeIpcWithFallback(channel, payload = undefined, fallback = null, missingChannels = []) {
  try {
    return payload === undefined ? await ipcRenderer.invoke(channel) : await ipcRenderer.invoke(channel, payload);
  } catch (error) {
    const channelList = Array.isArray(missingChannels) && missingChannels.length ? missingChannels : [channel];
    if (isMissingIpcHandlerError(error, channelList)) {
      return typeof fallback === "function" ? fallback() : fallback;
    }
    throw error;
  }
}

contextBridge.exposeInMainWorld("api", {
  versions: () => ({
    chrome: process.versions.chrome,
    node: process.versions.node,
    electron: process.versions.electron
  }),
  ping: () => ipcRenderer.invoke("app:ping"),
  app: {
    getProjectRoot: () => ipcRenderer.invoke("app:getProjectRoot"),
    getRuntimeInfo: () => ipcRenderer.invoke("app:getRuntimeInfo"),
    getWritableDefaultOutputDir: () =>
      invokeIpcWithFallback("app:getWritableDefaultOutputDir", undefined, { ok: false, missingHandler: true, directoryPath: "" }),
    initializeInstallFiles: () =>
      invokeIpcWithFallback("app:initializeInstallFiles", undefined, {
        ok: false,
        missingHandler: true,
        installRoot: "",
        runtimeRoot: "",
        items: [],
        fontSync: null,
        sysPreviewCount: 0
      })
  },
  cacheControl: {
    getOverview: () =>
      invokeIpcWithFallback("cache:overview", undefined, { ok: false, missingHandler: true, config: null, categories: [] }),
    readConfig: () =>
      invokeIpcWithFallback("cache:readConfig", undefined, { ok: false, missingHandler: true, config: null }),
    writeConfig: ({ mode, autoCategories } = {}) =>
      invokeIpcWithFallback(
        "cache:writeConfig",
        { mode, autoCategories: Array.isArray(autoCategories) ? autoCategories : [] },
        { ok: false, missingHandler: true, config: null, categories: [] }
      ),
    clear: ({ keys, reason } = {}) =>
      invokeIpcWithFallback(
        "cache:clear",
        { keys: Array.isArray(keys) ? keys : [], reason: String(reason || "manual").trim() || "manual" },
        { ok: false, missingHandler: true, removed: [], skipped: [], removedFileCount: 0, removedBytes: 0, categories: [] }
      )
  },
  openFile: (payload = {}) =>
    invokeIpcWithFallback("dialog:openFile", payload, { canceled: true, missingHandler: true, filePaths: [] }),
  openDirectory: () =>
    invokeIpcWithFallback("dialog:openDirectory", undefined, { canceled: true, missingHandler: true, directoryPath: "" }),
  saveFile: ({ defaultPath, filters } = {}) =>
    invokeIpcWithFallback("dialog:saveFile", { defaultPath, filters }, { canceled: true, missingHandler: true, filePath: "" }),
  audio: {
    probeDuration: ({ filePath } = {}) => ipcRenderer.invoke("audio:probeDuration", { filePath })
  },
  homeExport: {
    exportBundle: ({ outputDir, videoPath, coverPath, title } = {}) =>
      ipcRenderer.invoke("homeExport:exportBundle", { outputDir, videoPath, coverPath, title })
  },
  cloneVoiceStore: {
    list: () => invokeIpcWithFallback("cloneVoiceStore:list", undefined, { ok: false, missingHandler: true, items: [] }),
    write: ({ items } = {}) =>
      invokeIpcWithFallback("cloneVoiceStore:write", { items: Array.isArray(items) ? items : [] }, { ok: false, missingHandler: true, items: [] })
  },
  models: {
    scanProjectBundles: () =>
      invokeIpcWithFallback("models:scanProjectBundles", undefined, { ok: false, missingHandler: true, bundles: [] }),
    scanBundleRoot: (bundleRoot) =>
      invokeIpcWithFallback("models:scanBundleRoot", { bundleRoot }, { ok: false, missingHandler: true, bundleRoot: String(bundleRoot || ""), bundles: [] }),
    readConfig: (configPath) =>
      invokeIpcWithFallback("models:readConfig", { configPath }, { ok: false, missingHandler: true, configPath: String(configPath || ""), config: null }),
    getConfig: () =>
      invokeIpcWithFallback("models:getConfig", undefined, {
        ok: false,
        missingHandler: true,
        message: "模型中心接口未就绪",
        config: null,
        candidateRoots: [],
        bundles: []
      }),
    saveConfig: ({ rootPath, officialDownloadUrl }) =>
      invokeIpcWithFallback(
        "models:saveConfig",
        { rootPath, officialDownloadUrl },
        { ok: false, missingHandler: true, message: "模型中心接口未就绪", config: null, bundles: [] }
      ),
    scanBundleTree: (bundleRoot) =>
      invokeIpcWithFallback(
        "models:scanBundleTree",
        { bundleRoot },
        { ok: false, missingHandler: true, message: "模型中心接口未就绪", bundleRoot: String(bundleRoot || ""), bundles: [], report: null }
      ),
    importBundles: ({ bundleRoot, setAsRootPath } = {}) =>
      invokeIpcWithFallback(
        "models:importBundles",
        { bundleRoot, setAsRootPath: setAsRootPath === true },
        { ok: false, missingHandler: true, message: "模型中心接口未就绪", config: null, bundles: [], report: null }
      ),
    exportImportLog: ({ report }) =>
      invokeIpcWithFallback("models:exportImportLog", { report }, { ok: false, missingHandler: true, canceled: true, message: "模型中心接口未就绪" })
  },
  llm: {
    rewrite: ({ taskId, content, count, prompt, model, endpoint, apiKey, systemPrompt }) =>
      ipcRenderer.invoke("llm:rewrite", { taskId, content, count, prompt, model, endpoint, apiKey, systemPrompt }),
    cancel: (taskId) => ipcRenderer.invoke("llm:cancel", { taskId }),
    legalReview: ({ prompt, model, endpoint, apiKey, systemPrompt }) =>
      ipcRenderer.invoke("llm:legalReview", { prompt, model, endpoint, apiKey, systemPrompt })
  },
  ipbrain: {
    collect: ({ input }) => ipcRenderer.invoke("ipbrain:collect", { input })
  },
  monitor: {
    collectHomepage: ({ input, platform, recentCount, sessionId } = {}) =>
      invokeIpcWithFallback(
        "monitor:collectHomepage",
        { input, platform, recentCount, sessionId },
        { ok: false, missingHandler: true, message: "同行监控采集接口未就绪" }
      ),
    getCaptureState: ({ sessionId } = {}) =>
      invokeIpcWithFallback(
        "monitor:getCaptureState",
        { sessionId },
        { ok: false, missingHandler: true, message: "同行监控采集状态接口未就绪", session: null }
      ),
    cancelCapture: ({ sessionId } = {}) =>
      invokeIpcWithFallback(
        "monitor:cancelCapture",
        { sessionId },
        { ok: false, missingHandler: true, message: "同行监控停止采集接口未就绪" }
      ),
    openCaptureLogin: () =>
      invokeIpcWithFallback(
        "monitor:openCaptureLogin",
        {},
        { ok: false, missingHandler: true, message: "采集账号登录窗口未就绪" }
      ),
    getCaptureLoginStatus: () =>
      invokeIpcWithFallback(
        "monitor:getCaptureLoginStatus",
        {},
        { ok: true, missingHandler: true, loggedIn: false, accountName: "", updatedAt: "" }
      ),
    collectAwemeSummary: ({ input, url, itemId, sessionId } = {}) =>
      invokeIpcWithFallback(
        "monitor:collectAwemeSummary",
        { input, url, itemId, sessionId },
        { ok: false, missingHandler: true, message: "作品内容提取接口未就绪" }
      ),
    downloadVideo: ({ downloadUrl, targetDir, fileName } = {}) =>
      invokeIpcWithFallback(
        "monitor:downloadVideo",
        { downloadUrl, targetDir, fileName },
        { ok: false, missingHandler: true, message: "视频下载接口未就绪" }
      ),
    exportWorksTable: ({ filePath, rows } = {}) =>
      invokeIpcWithFallback(
        "monitor:exportWorksTable",
        { filePath, rows: Array.isArray(rows) ? rows : [] },
        { ok: false, missingHandler: true, message: "作品表格导出接口未就绪" }
      )
  },
  workflow: {
    extractCopyFromDouyin: (payload) => {
      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        return invokeIpcWithFallback(
          "workflow:extractCopyFromDouyin",
          {
            input: payload.input,
            modelChoice: payload.modelChoice || null
          },
          { ok: false, missingHandler: true, message: "文案提取接口未就绪", taskId: "" }
        );
      }
      return invokeIpcWithFallback(
        "workflow:extractCopyFromDouyin",
        { input: payload, modelChoice: null },
        { ok: false, missingHandler: true, message: "文案提取接口未就绪", taskId: "" }
      );
    },
    cancel: (taskId) => invokeIpcWithFallback("workflow:cancel", { taskId }, { ok: false, missingHandler: true }),
    onProgress: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on("workflow:progress", handler);
      return () => ipcRenderer.removeListener("workflow:progress", handler);
    },
    onLog: (callback) => {
      const handler = (event, data) => callback(data);
      ipcRenderer.on("workflow:log", handler);
      return () => ipcRenderer.removeListener("workflow:log", handler);
    }
  },
  voice: {
    cloneCreateFromMic: ({ name, refText, audioBytes, mimeType, taskId, publicAudioUrl, modelChoice }) =>
      ipcRenderer.invoke("voice:cloneCreateFromMic", {
        name,
        refText,
        audioBytes,
        mimeType,
        taskId,
        publicAudioUrl: publicAudioUrl || "",
        modelChoice: modelChoice || null
      }),
    cloneCreateFromFile: ({ name, refText, filePath, taskId, publicAudioUrl, modelChoice }) =>
      ipcRenderer.invoke("voice:cloneCreateFromFile", {
        name,
        refText,
        filePath,
        taskId,
        publicAudioUrl: publicAudioUrl || "",
        modelChoice: modelChoice || null
      }),
    generateSpeech: ({ taskId, voiceId, text, speed, emotion, emotionPrompt, language, modelChoice }) =>
      ipcRenderer.invoke("voice:generateSpeech", {
        taskId,
        voiceId,
        text,
        speed,
        emotion,
        emotionPrompt,
        language,
        modelChoice: modelChoice || null
      }),
    cancel: (taskId) => ipcRenderer.invoke("voice:cancel", { taskId }),
    resolvePreviewPath: ({ voiceId }) => ipcRenderer.invoke("voice:resolvePreviewPath", { voiceId }),
    onLog: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("voice:log", handler);
      return () => ipcRenderer.removeListener("voice:log", handler);
    }
  },
  avatar: {
    list: () => invokeIpcWithFallback("avatar:list", undefined, { ok: false, missingHandler: true, items: [] }),
    importVideo: ({ name, filePath }) =>
      invokeIpcWithFallback(
        "avatar:importVideo",
        { name, filePath },
        { ok: false, missingHandler: true, message: "数字人形象接口未就绪", item: null }
      ),
    updateName: ({ id, name }) =>
      invokeIpcWithFallback("avatar:updateName", { id, name }, { ok: false, missingHandler: true, message: "数字人形象接口未就绪", item: null }),
    remove: ({ id }) => invokeIpcWithFallback("avatar:remove", { id }, { ok: false, missingHandler: true, message: "数字人形象接口未就绪" }),
    reveal: ({ id }) => invokeIpcWithFallback("avatar:reveal", { id }, { ok: false, missingHandler: true, message: "数字人形象接口未就绪" })
  },
  video: {
    generateTalkingVideo: ({ taskId, videoPath, audioPath, modelChoice }) =>
      ipcRenderer.invoke("video:generateTalkingVideo", { taskId, videoPath, audioPath, modelChoice: modelChoice || null }),
    extractAudio: ({ inputVideo, outPath, format, bitrateKbps, sampleRate }) =>
      invokeIpcWithFallback(
        "video:extractAudio",
        { inputVideo, outPath, format, bitrateKbps, sampleRate },
        { ok: false, missingHandler: true, message: "音频提取接口未就绪", outPath: "" }
      ),
    cancel: (taskId) => ipcRenderer.invoke("video:cancel", { taskId }),
    onProgress: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("video:progress", handler);
      return () => ipcRenderer.removeListener("video:progress", handler);
    },
    onLog: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("video:log", handler);
      return () => ipcRenderer.removeListener("video:log", handler);
    }
  },
  videoEdit: {
    processSilenceDetection: ({ taskId, inputVideo, silenceThreshold, silenceDuration, minPauseDuration }) =>
      ipcRenderer.invoke("videoEdit:processSilenceDetection", { taskId, inputVideo, silenceThreshold, silenceDuration, minPauseDuration }),
    cancel: ({ taskId }) => ipcRenderer.invoke("videoEdit:cancel", { taskId })
  },
  subBgm: {
    render: ({
      taskId,
      videoPath,
      subtitleEnable,
      bgmEnable,
      bgmPath,
      sourceVolPct,
      bgmVolPct,
      preferredSubtitleText,
      subtitleTemplate,
      titleText,
      keywordMap,
      asrModelChoice,
      segmentsOverride,
      storyboard,
      pipConfig
    }) =>
      ipcRenderer.invoke("subBgm:render", {
        taskId,
        videoPath,
        subtitleEnable,
        bgmEnable,
        bgmPath,
        sourceVolPct,
        bgmVolPct,
        preferredSubtitleText,
        subtitleTemplate,
        titleText,
        keywordMap,
        asrModelChoice: asrModelChoice || null,
        segmentsOverride: Array.isArray(segmentsOverride) ? segmentsOverride : null,
        storyboard: storyboard && typeof storyboard === "object" ? storyboard : null,
        pipConfig: pipConfig && typeof pipConfig === "object" ? pipConfig : null
      }),
    planSegments: ({ videoPath, preferredSubtitleText, subtitleTemplate, asrModelChoice }) =>
      ipcRenderer.invoke("subBgm:planSegments", {
        videoPath,
        preferredSubtitleText,
        subtitleTemplate,
        asrModelChoice: asrModelChoice || null
      }),
    importStoryboardAssets: ({ filePaths }) => ipcRenderer.invoke("subBgm:importStoryboardAssets", { filePaths }),
    cancel: ({ taskId }) => ipcRenderer.invoke("subBgm:cancel", { taskId }),
    onProgress: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("subBgm:progress", handler);
      return () => ipcRenderer.removeListener("subBgm:progress", handler);
    },
    onLog: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("subBgm:log", handler);
      return () => ipcRenderer.removeListener("subBgm:log", handler);
    }
  },
  cover: {
    generate: ({ taskId, videoPath, template, titleText, subTitleText }) =>
      ipcRenderer.invoke("cover:generate", { taskId, videoPath, template, titleText, subTitleText }),
    cancel: ({ taskId }) => ipcRenderer.invoke("cover:cancel", { taskId })
  },
  templateStore: {
    saveSubtitleTemplate: ({ template }) => ipcRenderer.invoke("templateStore:saveSubtitleTemplate", { template }),
    saveCoverTemplate: ({ template }) => ipcRenderer.invoke("templateStore:saveCoverTemplate", { template })
  },
  publishDraft: {
    save: ({ name, draft }) => ipcRenderer.invoke("publishDraft:save", { name, draft }),
    list: () => ipcRenderer.invoke("publishDraft:list"),
    load: ({ id }) => ipcRenderer.invoke("publishDraft:load", { id }),
    reveal: ({ id }) => ipcRenderer.invoke("publishDraft:reveal", { id })
  },
  testLog: {
    ensure: () => ipcRenderer.invoke("testLog:ensure"),
    append: ({ source, level, message }) => ipcRenderer.invoke("testLog:append", { source, level, message })
  },
  featureAuthLog: {
    append: ({ source, level, message }) =>
      invokeIpcWithFallback("featureAuthLog:append", { source, level, message }, { ok: false, missingHandler: true })
  },
  publishWeb: {
    sync: ({ platform, accountId, payload }) => ipcRenderer.invoke("publishWeb:sync", { platform, accountId, payload }),
    syncExternal: ({ platform, accountId, payload }) => ipcRenderer.invoke("publishWeb:syncExternal", { platform, accountId, payload }),
    cancelSyncExternal: ({ requestId, reason }) => ipcRenderer.invoke("publishWeb:cancelSyncExternal", { requestId, reason }),
    openExternal: ({ platform }) => ipcRenderer.invoke("publishWeb:openExternal", { platform }),
    onStep: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("publishWeb:step", handler);
      return () => ipcRenderer.removeListener("publishWeb:step", handler);
    }
  },
  accounts: {
    list: () => ipcRenderer.invoke("accounts:list"),
    refreshAllStatuses: () =>
      invokeIpcWithFallback("accounts:refreshAllStatuses", undefined, { ok: false, missingHandler: true, updatedCount: 0, items: [] }),
    openLoginWindow: ({ platform, id }) => ipcRenderer.invoke("accounts:openLoginWindow", { platform, id }),
    openLoginExternal: ({ platform, id }) => ipcRenderer.invoke("accounts:openLoginExternal", { platform, id }),
    waitResult: ({ id, timeoutMs }) => ipcRenderer.invoke("accounts:waitResult", { id, timeoutMs }),
    save: ({ id, name }) => ipcRenderer.invoke("accounts:save", { id, name }),
    test: ({ id }) => ipcRenderer.invoke("accounts:test", { id }),
    getLog: ({ id }) => ipcRenderer.invoke("accounts:getLog", { id }),
    clearLog: ({ id }) => ipcRenderer.invoke("accounts:clearLog", { id }),
    updateMeta: ({ id, patch }) => ipcRenderer.invoke("accounts:updateMeta", { id, patch }),
    remove: ({ id }) => ipcRenderer.invoke("accounts:remove", { id }),
    reveal: ({ id }) => ipcRenderer.invoke("accounts:reveal", { id }),
    groupsList: () => ipcRenderer.invoke("accounts:groupsList"),
    groupsSave: ({ group }) => ipcRenderer.invoke("accounts:groupsSave", { group }),
    groupsRemove: ({ id }) => ipcRenderer.invoke("accounts:groupsRemove", { id })
  },
  videoTemplate: {
    list: () => ipcRenderer.invoke("videoTemplate:list"),
    reveal: ({ id }) => ipcRenderer.invoke("videoTemplate:reveal", { id }),
    remove: ({ id }) => ipcRenderer.invoke("videoTemplate:remove", { id }),
    saveConfig: ({ id, config }) => ipcRenderer.invoke("videoTemplate:saveConfig", { id, config }),
    importAssets: ({ id, filePaths }) => ipcRenderer.invoke("videoTemplate:importAssets", { id, filePaths }),
    importMainVideo: ({ id, filePath }) => ipcRenderer.invoke("videoTemplate:importMainVideo", { id, filePath }),
    loadRecognizedSubtitles: ({ id }) => ipcRenderer.invoke("videoTemplate:loadRecognizedSubtitles", { id }),
    render: ({ taskId, id, baseVideoPath, config }) => ipcRenderer.invoke("videoTemplate:render", { taskId, id, baseVideoPath, config })
  },
  media: {
    listFonts: () => invokeIpcWithFallback("media:listFonts", undefined, { ok: false, missingHandler: true, items: [] }),
    listBgms: () => invokeIpcWithFallback("media:listBgms", undefined, { ok: false, missingHandler: true, items: [] })
  },
  shell: {
    reveal: ({ path }) => ipcRenderer.invoke("shell:reveal", { path }),
    openExternal: ({ url }) => ipcRenderer.invoke("shell:openExternal", { url })
  },
  ollama: {
    status: () => ipcRenderer.invoke("ollama:status"),
    install: () => ipcRenderer.invoke("ollama:install"),
    start: () => ipcRenderer.invoke("ollama:start"),
    stop: () => ipcRenderer.invoke("ollama:stop"),
    chat: ({ model, messages }) => ipcRenderer.invoke("ollama:chat", { model, messages })
  },
  window: {
    minimize: () => ipcRenderer.send("window:minimize"),
    toggleMaximize: () => ipcRenderer.send("window:toggleMaximize"),
    close: () => ipcRenderer.send("window:close"),
    getDataScreenPopoutState: () =>
      invokeIpcWithFallback(
        "window:getDataScreenPopoutState",
        undefined,
        { ok: false, missingHandler: true, open: false, id: 0 }
      ),
    closeDataScreenPopout: () =>
      invokeIpcWithFallback(
        "window:closeDataScreenPopout",
        undefined,
        { ok: false, missingHandler: true, closed: false, message: "数据大屏恢复接口未就绪" }
      ),
    openDataScreenPopout: ({ sceneId, mode } = {}) =>
      invokeIpcWithFallback(
        "window:openDataScreenPopout",
        { sceneId, mode },
        { ok: false, missingHandler: true, message: "数据大屏弹出窗口接口未就绪" }
      )
  },
  auth: {
    safeEncrypt: ({ text }) => ipcRenderer.invoke("auth:safeEncrypt", { text }),
    safeDecrypt: ({ data }) => ipcRenderer.invoke("auth:safeDecrypt", { data }),
    setRuntimeUser: ({ userId }) => ipcRenderer.invoke("auth:setRuntimeUser", { userId })
  },
  device: {
    getId: () => ipcRenderer.invoke("device:getId")
  },
  machine: {
    readCode: () => ipcRenderer.invoke("machine:readCode")
  },
  domain: {
    read: () => ipcRenderer.invoke("domain:read"),
    write: ({ domain }) => ipcRenderer.invoke("domain:write", { domain }),
    syncFromCloud: ({ scene, token }) => ipcRenderer.invoke("domain:syncFromCloud", { scene, token })
  },
  appUpdate: {
    readConfig: () => ipcRenderer.invoke("appUpdate:readConfig"),
    writeConfig: ({ config }) => ipcRenderer.invoke("appUpdate:writeConfig", { config }),
    getState: () => ipcRenderer.invoke("appUpdate:getState"),
    getDiagnostics: () => ipcRenderer.invoke("appUpdate:getDiagnostics"),
    check: ({ manifestUrl, forceSync, allowCachedOnSyncFailure, scene, token } = {}) =>
      ipcRenderer.invoke("appUpdate:check", { manifestUrl, forceSync, allowCachedOnSyncFailure, scene, token }),
    syncFromCloud: ({ scene, token } = {}) => ipcRenderer.invoke("appUpdate:syncFromCloud", { scene, token }),
    downloadLatestInstaller: ({ downloadUrl, artifactName, latestVersion, size, sha512, providerBaseUrl, manifestOnly } = {}) =>
      ipcRenderer.invoke("appUpdate:downloadLatestInstaller", {
        downloadUrl,
        artifactName,
        latestVersion,
        size,
        sha512,
        providerBaseUrl,
        manifestOnly: manifestOnly === true
      }),
    downloadAndInstall: ({ downloadUrl, artifactName, latestVersion, providerBaseUrl, binaryDiffPatch, manifestOnly } = {}) =>
      ipcRenderer.invoke("appUpdate:downloadAndInstall", {
        downloadUrl,
        artifactName,
        latestVersion,
        providerBaseUrl,
        binaryDiffPatch: binaryDiffPatch && typeof binaryDiffPatch === "object" ? binaryDiffPatch : undefined,
        manifestOnly: manifestOnly === true
      }),
    installFromDirectory: ({ directoryPath, localPath, filePath, expectedVersion } = {}) =>
      ipcRenderer.invoke("appUpdate:installFromDirectory", { directoryPath, localPath, filePath, expectedVersion }),
    openLocalFile: ({ localPath, filePath } = {}) => ipcRenderer.invoke("appUpdate:openLocalFile", { localPath, filePath }),
    closeApp: ({ reason } = {}) => ipcRenderer.invoke("appUpdate:closeApp", { reason }),
    openDownload: ({ downloadUrl }) => ipcRenderer.invoke("appUpdate:openDownload", { downloadUrl }),
    onState: (callback) => {
      if (typeof callback !== "function") return () => {};
      const handler = (_, payload) => callback(payload);
      ipcRenderer.on("appUpdate:state", handler);
      return () => ipcRenderer.removeListener("appUpdate:state", handler);
    }
  },
  openClaw: {
    readConfig: () => ipcRenderer.invoke("openClaw:readConfig"),
    writeConfig: ({ config } = {}) => ipcRenderer.invoke("openClaw:writeConfig", { config }),
    getState: () => ipcRenderer.invoke("openClaw:getState"),
    setSessionAuth: ({ ready } = {}) => ipcRenderer.invoke("openClaw:setSessionAuth", { ready }),
    generateSkillPackage: ({ outputDir, openFolder } = {}) =>
      ipcRenderer.invoke("openClaw:generateSkillPackage", { outputDir, openFolder: openFolder !== false })
  },
  feedback: {
    submit: ({ body, token } = {}) =>
      invokeIpcWithFallback("feedback:submit", { body, token }, { ok: false, missingHandler: true, errMsg: "意见反馈接口未就绪" }),
    list: ({ body, token } = {}) =>
      invokeIpcWithFallback("feedback:list", { body, token }, { ok: false, missingHandler: true, errMsg: "反馈记录接口未就绪", list: [] })
  },
  detection: {
    read: () => ipcRenderer.invoke("detection:read"),
    write: ({ config }) => ipcRenderer.invoke("detection:write", { config })
  },
  cloudAuth: {
    login: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:login", { url, body, token }),
    register: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:register", { url, body, token }),
    getProfile: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:getProfile", { url, body, token }),
    updateProfile: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:updateProfile", { url, body, token }),
    redeemKami: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:redeemKami", { url, body, token }),
    issueSessionToken: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:issueSessionToken", { url, body, token }),
    verifySessionToken: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:verifySessionToken", { url, body, token }),
    verifyFeatureAccess: ({ url, body, token }) =>
      invokeIpcWithFallback(
        "cloudAuth:verifyFeatureAccess",
        { url, body, token },
        { ok: false, missingHandler: true, errMsg: "未配置云端功能权限接口URL" }
      ),
    submitMachineRequest: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:submitMachineRequest", { url, body, token }),
    touchLastLogin: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:touchLastLogin", { url, body, token }),
    getMenuConfig: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:getMenuConfig", { url, body, token }),
    getIdentityConfig: ({ url, body, token }) => ipcRenderer.invoke("cloudAuth:getIdentityConfig", { url, body, token })
  },
  cloudTemplate: {
    list: ({ url, body, token }) => ipcRenderer.invoke("cloudTemplate:list", { url, body, token }),
    upsert: ({ url, body, token }) => ipcRenderer.invoke("cloudTemplate:upsert", { url, body, token }),
    delete: ({ url, body, token }) => ipcRenderer.invoke("cloudTemplate:delete", { url, body, token })
  },
  cloudInstallLog: {
    append: ({ url, body, token }) => ipcRenderer.invoke("cloudInstallLog:append", { url, body, token }),
    list: ({ url, body, token }) => ipcRenderer.invoke("cloudInstallLog:list", { url, body, token })
  },
  cloudStorage: {
    uploadReferenceAudio: ({ url, body, token }) => ipcRenderer.invoke("cloudStorage:uploadReferenceAudio", { url, body, token })
  }
});
