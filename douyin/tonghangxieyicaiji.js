"use strict";

// 同行协议采集解析器：
// 1. 只判断浏览器会话中已经产生的抖音作品列表响应。
// 2. 不保存请求签名、Cookie、Token 或完整原始响应。
// 3. 将响应中的作品数组交给现有同行监控标准化模块处理。

function isDouyinAuthorWorksResponse(url = "") {
  const text = String(url || "").trim();
  if (!text) return false;
  return (
    /\/aweme\/v1\/web\/aweme\/post\//i.test(text) ||
    /\/web\/api\/v2\/aweme\/post\//i.test(text) ||
    /\/aweme\/post\//i.test(text)
  );
}

function extractDouyinAuthorWorksResponse(rawBody = "") {
  const text = String(rawBody || "").trim();
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data?.aweme_list)
      ? data.aweme_list
      : Array.isArray(data?.awemeList)
      ? data.awemeList
      : Array.isArray(data?.data?.aweme_list)
      ? data.data.aweme_list
      : Array.isArray(data?.data?.awemeList)
      ? data.data.awemeList
      : Array.isArray(data?.data?.list)
      ? data.data.list
      : Array.isArray(data?.list)
      ? data.list
      : [];
    return list.filter((item) => item && typeof item === "object");
  } catch {
    return [];
  }
}

function isDouyinWorkDetailResponse(url = "") {
  return /\/aweme\/v1\/web\/aweme\/detail\//i.test(String(url || ""));
}

function extractDouyinWorkDetailResponse(rawBody = "") {
  const text = String(rawBody || "").trim();
  if (!text) return null;
  try {
    const data = JSON.parse(text);
    const detail = data?.aweme_detail || data?.awemeDetail || data?.data?.aweme_detail || null;
    return detail && typeof detail === "object" ? detail : null;
  } catch {
    return null;
  }
}

module.exports = {
  isDouyinAuthorWorksResponse,
  extractDouyinAuthorWorksResponse,
  isDouyinWorkDetailResponse,
  extractDouyinWorkDetailResponse
};
