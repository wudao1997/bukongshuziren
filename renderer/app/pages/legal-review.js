import { elFromHTML, pageHeader } from "../ui.js";

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlight(text, words) {
  const src = String(text || "");
  const list = Array.from(new Set((words || []).map((w) => String(w || "").trim()).filter(Boolean)));
  if (!src || !list.length) return escapeHtml(src);

  const escaped = list
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  return escapeHtml(src).replace(re, `<span class="risk-mark">$1</span>`);
}

export const route = {
  path: "/legal-review",
  title: "AI法务审核报告",
  cache: false,
  async render() {
    let payload = null;
    try {
      payload = JSON.parse(localStorage.getItem("ipfactory.legal.latest") || "null");
    } catch {
      payload = null;
    }

    const originalText = String(payload?.originalText || "");
    const report = payload?.report || null;
    const risks = Array.isArray(report?.risks) ? report.risks : [];
    const riskWords = risks.map((r) => r?.word).filter(Boolean);
    const fixedText = String(report?.fixedText || "");
    const analysis = String(report?.analysis || "");
    const hasRisk = Boolean(report?.hasRisk);

    const root = elFromHTML(`
      <div>
        ${pageHeader({
          title: "AI 法务审核报告",
          subtitle: report ? `共发现 ${risks.length} 处风险` : "暂无审核结果",
          actionsHTML: `<button class="btn" id="btn-back-home">返回首页</button>`
        })}

        ${
          report
            ? `
              <div class="legal-report">
                <div class="legal-summary ${hasRisk ? "is-risk" : "is-safe"}">
                  <div class="legal-summary-title">${hasRisk ? "⚠️ 发现风险" : "✅ 未发现明显风险"}</div>
                  <div class="legal-summary-sub">${hasRisk ? `共发现 ${risks.length} 处风险` : "可正常使用（仍建议人工复核）"}</div>
                </div>

                <div class="legal-section">
                  <div class="legal-sec-title">原文案分析</div>
                  <div class="legal-sec-body mono legal-text">${highlight(originalText, riskWords) || "（空）"}</div>
                </div>

                <div class="legal-section">
                  <div class="legal-sec-title">优化后文案</div>
                  <div class="legal-sec-body mono legal-text">${escapeHtml(fixedText) || "（空）"}</div>
                </div>

                <div class="legal-section">
                  <div class="legal-sec-title">AI 审核解读</div>
                  <div class="legal-sec-body">${escapeHtml(analysis) || "（空）"}</div>
                </div>

                <div class="legal-section">
                  <div class="legal-sec-title">风险详情</div>
                  <div class="legal-sec-body">
                    ${
                      risks.length
                        ? `<table class="table">
                            <thead>
                              <tr>
                                <th style="width: 140px">风险词</th>
                                <th style="width: 180px">建议替换</th>
                                <th>原因</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${risks
                                .map(
                                  (r) => `
                                    <tr>
                                      <td class="mono"><span class="risk-chip">${escapeHtml(r?.word || "")}</span></td>
                                      <td class="mono">${escapeHtml(r?.recommendation || "")}</td>
                                      <td>${escapeHtml(r?.reason || "")}</td>
                                    </tr>
                                  `
                                )
                                .join("")}
                            </tbody>
                          </table>`
                        : `<div class="empty">无风险项。</div>`
                    }
                  </div>
                </div>

                <div class="legal-actions">
                  <button class="btn" id="btn-close">关闭</button>
                  <button class="btn btn-primary" id="btn-apply-fixed">采用优化文案</button>
                </div>
              </div>
            `
            : `<div class="empty">没有可展示的审核报告，请先在首页点击“AI法务”。</div>`
        }
      </div>
    `);

    root.querySelector("#btn-back-home").addEventListener("click", () => {
      window.location.hash = "#/home";
    });

    const btnClose = root.querySelector("#btn-close");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        window.location.hash = "#/home";
      });
    }

    const btnApply = root.querySelector("#btn-apply-fixed");
    if (btnApply) {
      btnApply.addEventListener("click", () => {
        const text = fixedText.trim();
        if (!text) {
          window.location.hash = "#/home";
          return;
        }
        window.dispatchEvent(new CustomEvent("ipfactory:applyOptimizedCopy", { detail: { text } }));
        window.location.hash = "#/home";
      });
    }

    return root;
  }
};

