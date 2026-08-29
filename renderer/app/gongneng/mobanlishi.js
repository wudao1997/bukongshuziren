// 模板历史：为字幕模板和封面模板提供统一的撤销/恢复能力，支持连续输入合并为一次历史记录。

function cloneValue(input) {
  if (Array.isArray(input)) return input.map((item) => cloneValue(item));
  if (input && typeof input === "object") {
    const out = {};
    Object.keys(input).forEach((key) => {
      out[key] = cloneValue(input[key]);
    });
    return out;
  }
  return input;
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return "";
  }
}

export function createTemplateHistoryManager({ limit = 80, mergeWindowMs = 800 } = {}) {
  const maxSize = Math.max(10, Number(limit || 80) || 80);
  const mergeMs = Math.max(0, Number(mergeWindowMs || 800) || 800);
  let undoStack = [];
  let redoStack = [];
  let lastGroupKey = "";
  let lastGroupAt = 0;

  const trim = () => {
    if (undoStack.length > maxSize) undoStack = undoStack.slice(undoStack.length - maxSize);
    if (redoStack.length > maxSize) redoStack = redoStack.slice(redoStack.length - maxSize);
  };

  const state = () => ({
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoCount: undoStack.length,
    redoCount: redoStack.length
  });

  const reset = (currentValue) => {
    undoStack = [];
    redoStack = [];
    lastGroupKey = "";
    lastGroupAt = 0;
    return state();
  };

  const record = (previousValue, nextValue, { groupKey = "" } = {}) => {
    const prevKey = safeStringify(previousValue);
    const nextKey = safeStringify(nextValue);
    if (!prevKey || prevKey === nextKey) return state();

    const now = Date.now();
    const normalizedGroupKey = String(groupKey || "").trim();
    const shouldMerge = normalizedGroupKey && normalizedGroupKey === lastGroupKey && now - lastGroupAt <= mergeMs && undoStack.length > 0;
    if (!shouldMerge) {
      const lastUndoKey = undoStack.length > 0 ? safeStringify(undoStack[undoStack.length - 1]) : "";
      if (lastUndoKey !== prevKey) undoStack.push(cloneValue(previousValue));
    }
    redoStack = [];
    lastGroupKey = normalizedGroupKey;
    lastGroupAt = now;
    trim();
    return state();
  };

  const undo = (currentValue) => {
    if (!undoStack.length) return { ok: false, value: null, ...state() };
    const snapshot = cloneValue(undoStack.pop());
    redoStack.push(cloneValue(currentValue));
    lastGroupKey = "";
    lastGroupAt = 0;
    trim();
    return { ok: true, value: snapshot, ...state() };
  };

  const redo = (currentValue) => {
    if (!redoStack.length) return { ok: false, value: null, ...state() };
    const snapshot = cloneValue(redoStack.pop());
    undoStack.push(cloneValue(currentValue));
    lastGroupKey = "";
    lastGroupAt = 0;
    trim();
    return { ok: true, value: snapshot, ...state() };
  };

  return { reset, record, undo, redo, state };
}
