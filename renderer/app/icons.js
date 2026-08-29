const svg = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const icons = {
  home: svg(`<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>`),
  monitor: svg(`<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 20h10"/>`),
  parse: svg(`<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>`),
  copy: svg(`<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`),
  storyboard: svg(`<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><path d="M8 6v12"/>`),
  asset: svg(`<path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M12 22V12"/><path d="M3.3 7.3L12 12l8.7-4.7"/>`),
  audio: svg(`<path d="M9 18V5l12-2v13"/><circle cx="7" cy="18" r="3"/><circle cx="19" cy="16" r="3"/>`),
  mic: svg(`<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"/><path d="M19 11a7 7 0 0 1-14 0"/><path d="M12 18v4"/><path d="M8 22h8"/>`),
  model: svg(`<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M1 9h3"/><path d="M1 15h3"/><path d="M20 9h3"/><path d="M20 15h3"/><path d="M9 9h6v6H9z"/>`),
  avatar: svg(`<circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/>`),
  synthesis: svg(`<path d="M12 2v6"/><path d="M12 16v6"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M2 12h6"/><path d="M16 12h6"/><path d="M4.93 19.07l4.24-4.24"/><path d="M14.83 9.17l4.24-4.24"/>`),
  video: svg(`<rect x="3" y="6" width="15" height="12" rx="2"/><path d="M18 10l3-2v8l-3-2z"/>`),
  videoTemplate: svg(`<path d="M3 6h18v14H3z"/><path d="M3 10h18"/><path d="M7 6v4"/><path d="M11 6v4"/><path d="M15 6v4"/><path d="M6 13h6"/><path d="M6 16h10"/>`),
  subtitleTemplate: svg(`<path d="M4 5h16v14H4z"/><path d="M7 9h10"/><path d="M7 13h7"/><path d="M7 17h10"/>`),
  coverTemplate: svg(`<path d="M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 9h8"/><path d="M8 13h6"/><path d="M8 17h8"/>`),
  accounts: svg(`<path d="M16 11a4 4 0 1 0-8 0"/><path d="M12 15c-4 0-8 2-8 6"/><path d="M20 21c0-3.3-2.3-5.8-6-5.8"/>`),
  dataScreen: svg(`<path d="M3 4h18v12H3z"/><path d="M7 20h10"/><path d="M9 8v4"/><path d="M13 6v6"/><path d="M17 10v2"/>`),
  privateDomain: svg(`<path d="M4 12a8 8 0 0 1 16 0"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12v9"/><path d="M8 21h8"/>`),
  agentManagement: svg(`<path d="M12 2l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5L4.8 7.2l5-.7z"/><path d="M7 20h10"/><path d="M9 16h6"/>`),
  contentManagement: svg(`<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>`),
  publish: svg(`<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>`),
  tasks: svg(`<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`),
  chart: svg(`<path d="M3 3v18h18"/><path d="M7 14v4"/><path d="M11 10v8"/><path d="M15 6v12"/><path d="M19 8v10"/>`),
  settings: svg(`<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-2l2-1.6-2-3.4-2.4.5a7.7 7.7 0 0 0-1.7-1L14.8 3h-5.6l-.6 2.5a7.7 7.7 0 0 0-1.7 1L4.5 6 2.5 9.4l2 1.6a7.8 7.8 0 0 0 .1 2l-2 1.6 2 3.4 2.4-.5a7.7 7.7 0 0 0 1.7 1L9.2 21h5.6l.6-2.5a7.7 7.7 0 0 0 1.7-1l2.4.5 2-3.4z"/>`),
  help: svg(`<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"/><path d="M12 17h.01"/>`),
  search: svg(`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`),
  minimize: svg(`<path d="M6 18h12"/>`),
  maximize: svg(`<rect x="6" y="6" width="12" height="12" rx="2"/>`),
  close: svg(`<path d="M18 6L6 18"/><path d="M6 6l12 12"/>`)
};
