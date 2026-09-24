const STORAGE_KEY = "khorshid_cv_updates_v1";
const SECTION_LABELS = {
  overview: "Professional biography",
  appointments: "Appointments",
  training: "Education and training",
  leadership: "Leadership and program building",
  innovation: "Education and innovation",
  research: "Research",
  grants: "Grants and funding",
  publications: "Publications",
  talks: "Lectures, workshops and conferences",
  media: "Media and features",
  awards: "Honours and awards"
};
const PRESETS = {
  bio: ["overview","appointments","leadership","awards","contact"],
  academic: Object.keys(SECTION_LABELS).concat("contact"),
  clinical: ["overview","appointments","training","leadership","research","awards","contact"],
  education: ["overview","training","leadership","innovation","talks","awards","contact"],
  research: ["overview","appointments","research","grants","publications","talks","awards","contact"],
  focused: ["overview","research","publications","contact"]
};

let updates = loadUpdates();

function escapeHtml(value="") {
  return value.replace(/[&<>"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[char]);
}

function loadUpdates() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveUpdates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
  renderUpdates();
  renderUpdateList();
}

function detectSection(text) {
  const value = text.toLowerCase();
  const rules = [
    ["publications", /doi|journal|publication|manuscript|article|pubmed|volume|pages/],
    ["grants", /grant|funding|award amount|cihr|foundation|principal investigator|co-applicant/],
    ["awards", /honou?r|award|prize|medal|recognition/],
    ["talks", /lecture|speaker|conference|workshop|presentation|symposium|keynote/],
    ["training", /degree|fellowship|certification|diploma|university|residency|training/],
    ["appointments", /appointed|appointment|professor|director|physician|neonatologist|faculty/],
    ["leadership", /chair|committee|leadership|founder|co-chair|medical director|program lead/],
    ["innovation", /education|curriculum|simulation|app|platform|digital|artificial intelligence|ai /],
    ["media", /podcast|interview|news|media|video|press/],
    ["research", /study|research|trial|cohort|project|investigator|protocol/]
  ];
  return rules.find(([,pattern]) => pattern.test(value))?.[0] || "overview";
}

function parseUpdateText(text) {
  const clean = text.replace(/\r/g, "").trim();
  const lines = clean.split("\n").map(line => line.trim()).filter(Boolean);
  const year = clean.match(/\b(19|20)\d{2}\b/)?.[0] || new Date().getFullYear().toString();
  return {title: lines[0] || "New CV update", year, details: lines.slice(1).join(" "), section: detectSection(clean), link: ""};
}

function renderUpdates() {
  document.querySelectorAll(".cv-added").forEach(node => node.remove());
  for (const item of updates) {
    const section = document.getElementById(item.section);
    if (!section) continue;
    let host = section.querySelector(".cv-added");
    if (!host) {
      host = document.createElement("div");
      host.className = "cv-added";
      host.innerHTML = "<h3>Recent updates</h3>";
      section.appendChild(host);
    }
    const entry = document.createElement("div");
    entry.className = "entry";
    const title = item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
    entry.innerHTML = `<div class="top"><span class="yr">${escapeHtml(item.year)}</span><div><span class="title">${title}</span>${item.details ? `<div class="meta">${escapeHtml(item.details)}</div>` : ""}</div></div>`;
    host.appendChild(entry);
  }
}

function toast(message) {
  const node = document.createElement("div"); node.className = "cv-toast"; node.textContent = message;
  document.body.appendChild(node); setTimeout(() => node.remove(), 2600);
}

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function createEditor() {
  const backdrop = document.createElement("div"); backdrop.className = "cv-backdrop";
  const panel = document.createElement("aside"); panel.className = "cv-panel"; panel.setAttribute("aria-label", "CV update editor");
  panel.innerHTML = `<div class="cv-panel-head"><h2>Update CV</h2><button type="button" data-close>Close</button></div>
    <p class="cv-help">Paste an update or upload a text, JSON, HTML, Markdown, Word, or PDF file. The suggested section is selected automatically and remains editable.</p>
    <label for="cvRaw">Paste an update</label><textarea id="cvRaw" placeholder="Paste a citation, appointment, grant, award, talk, or other update"></textarea>
    <button type="button" id="cvAnalyze">Analyse and place</button>
    <div class="cv-file"><label for="cvFile">Upload an update</label><input id="cvFile" type="file" accept=".txt,.md,.json,.html,.docx,.pdf"><div class="cv-help">Files are processed in your browser and are not uploaded to a server.</div></div>
    <div class="row"><div><label for="cvYear">Year/date</label><input id="cvYear"></div><div><label for="cvSection">Section</label><select id="cvSection">${Object.entries(SECTION_LABELS).map(([id,label])=>`<option value="${id}">${label}</option>`).join("")}</select></div></div>
    <label for="cvTitle">Title</label><input id="cvTitle">
    <label for="cvDetails">Details/citation</label><textarea id="cvDetails"></textarea>
    <label for="cvLink">Web link or DOI URL</label><input id="cvLink" type="url" placeholder="https://...">
    <div class="actions"><button type="button" class="primary" id="cvSave">Insert update</button><button type="button" id="cvBackup">Download backup</button></div>
    <div class="cv-update-list"><h3>Saved updates</h3><div id="cvUpdateList"></div></div>`;
  document.body.append(backdrop, panel);
  const close = () => {panel.classList.remove("open");backdrop.classList.remove("open")};
  panel.querySelector("[data-close]").addEventListener("click", close); backdrop.addEventListener("click", close);
  document.getElementById("cvEditBtn").addEventListener("click", () => {panel.classList.add("open");backdrop.classList.add("open");renderUpdateList()});
  document.getElementById("cvAnalyze").addEventListener("click", () => fillForm(parseUpdateText(document.getElementById("cvRaw").value)));
  document.getElementById("cvFile").addEventListener("change", handleFile);
  document.getElementById("cvSave").addEventListener("click", () => {
    const item = {id: crypto.randomUUID(), year: value("cvYear") || new Date().getFullYear().toString(), section: value("cvSection"), title: value("cvTitle"), details: value("cvDetails"), link: value("cvLink")};
    if (!item.title) return toast("Add a title before inserting the update.");
    updates.push(item); saveUpdates(); clearForm(); toast(`Added to ${SECTION_LABELS[item.section]}.`);
  });
  document.getElementById("cvBackup").addEventListener("click", () => download("khorshid-cv-updates.json", JSON.stringify({version:1,exported:new Date().toISOString(),updates}, null, 2), "application/json"));
}

function value(id) { return document.getElementById(id).value.trim(); }
function fillForm(item) { document.getElementById("cvYear").value=item.year; document.getElementById("cvSection").value=item.section; document.getElementById("cvTitle").value=item.title; document.getElementById("cvDetails").value=item.details; document.getElementById("cvLink").value=item.link || ""; toast(`Suggested section: ${SECTION_LABELS[item.section]}.`); }
function clearForm() { ["cvRaw","cvYear","cvTitle","cvDetails","cvLink"].forEach(id=>document.getElementById(id).value=""); }

async function handleFile(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(await file.text()); const incoming = Array.isArray(parsed) ? parsed : parsed.updates;
      if (!Array.isArray(incoming)) throw new Error("No update list found");
      updates = incoming.map(item => ({...item,id:item.id || crypto.randomUUID()})); saveUpdates(); toast(`Imported ${updates.length} updates.`); return;
    }
    let text = "";
    if (file.name.toLowerCase().endsWith(".docx")) {
      if (!window.mammoth) throw new Error("Word reader is still loading; try again in a moment");
      text = (await window.mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()})).value;
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
      const pdf = await pdfjs.getDocument({data: await file.arrayBuffer()}).promise;
      const pages = [];
      for (let n=1;n<=pdf.numPages;n++) pages.push((await (await pdf.getPage(n)).getTextContent()).items.map(i=>i.str).join(" "));
      text = pages.join("\n");
    } else text = await file.text();
    document.getElementById("cvRaw").value = text; fillForm(parseUpdateText(text));
  } catch (error) { toast(`Could not read file: ${error.message}`); }
}

function renderUpdateList() {
  const host = document.getElementById("cvUpdateList"); if (!host) return;
  host.innerHTML = updates.length ? "" : "<p class='cv-help'>No browser-saved updates yet.</p>";
  updates.forEach(item => {
    const node = document.createElement("div"); node.className="cv-update-item";
    node.innerHTML=`<strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.year)} · ${escapeHtml(SECTION_LABELS[item.section] || item.section)}</small><div class="cv-update-actions"><button data-edit>Edit</button><button data-delete>Delete</button></div>`;
    node.querySelector("[data-edit]").addEventListener("click",()=>{fillForm(item);updates=updates.filter(x=>x.id!==item.id);saveUpdates()});
    node.querySelector("[data-delete]").addEventListener("click",()=>{updates=updates.filter(x=>x.id!==item.id);saveUpdates()});
    host.appendChild(node);
  });
}

function createExportDialog() {
  const dialog=document.createElement("div"); dialog.className="cv-dialog"; dialog.setAttribute("role","dialog"); dialog.setAttribute("aria-modal","true");
  dialog.innerHTML=`<h2>Format and export</h2><p class="cv-help">Choose a tailored format, refine its sections, then export to PDF, Word, HTML, or plain-text biography.</p>
    <div class="cv-presets">${Object.keys(PRESETS).map(key=>`<button type="button" data-preset="${key}">${key[0].toUpperCase()+key.slice(1)}</button>`).join("")}</div>
    <div class="cv-checks">${[...Object.entries(SECTION_LABELS),["contact","Contact and links"]].map(([id,label])=>`<label><input type="checkbox" value="${id}" checked> ${label}</label>`).join("")}</div>
    <div class="cv-dialog-actions"><button class="primary" data-export="pdf">Print / PDF</button><button data-export="word">Word</button><button data-export="html">HTML</button><button data-export="text">Bio text</button><button data-close>Close</button></div>`;
  document.body.appendChild(dialog);
  document.getElementById("cvExportBtn").addEventListener("click",()=>dialog.classList.add("open"));
  dialog.querySelector("[data-close]").addEventListener("click",()=>dialog.classList.remove("open"));
  dialog.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>selectPreset(dialog,button.dataset.preset)));
  dialog.querySelectorAll("[data-export]").forEach(button=>button.addEventListener("click",()=>exportCV(dialog,button.dataset.export)));
}

function selectPreset(dialog, preset) {
  const selected=new Set(PRESETS[preset]); dialog.querySelectorAll("input[type=checkbox]").forEach(box=>box.checked=selected.has(box.value)); toast(`${preset[0].toUpperCase()+preset.slice(1)} format selected.`);
}

function exportCV(dialog, format) {
  const selected=new Set([...dialog.querySelectorAll("input:checked")].map(box=>box.value));
  const sections=[...document.querySelectorAll("main section")].filter(section=>selected.has(section.id)).map(section=>section.outerHTML).join("\n");
  const title=`Khorshid Mohammad — ${[...selected].map(id=>SECTION_LABELS[id]).filter(Boolean).slice(0,2).join(" & ") || "Curriculum Vitae"}`;
  const documentHtml=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${exportStyles()}</style></head><body><header><h1>Khorshid Mohammad, MD</h1><p>Neonatologist · Clinical Professor of Pediatrics · University of Calgary</p></header><main>${sections}</main></body></html>`;
  if(format==="html") download("Khorshid_Mohammad_CV.html",documentHtml,"text/html");
  if(format==="word") download("Khorshid_Mohammad_CV.doc",documentHtml,"application/msword");
  if(format==="text") {
    const text=[...document.querySelectorAll("#overview, #appointments, #leadership, #awards")].filter(s=>selected.has(s.id)||selected.has("overview")).map(s=>s.innerText.trim()).join("\n\n");
    download("Khorshid_Mohammad_Bio.txt",text,"text/plain");
  }
  if(format==="pdf") { const win=window.open("","_blank"); win.document.write(documentHtml); win.document.close(); win.focus(); setTimeout(()=>win.print(),350); }
}

function exportStyles() { return `@page{margin:.65in}body{font-family:Arial,sans-serif;color:#182234;line-height:1.42;font-size:10.5pt;max-width:8in;margin:auto}header{border-bottom:3px solid #1f4e79;margin-bottom:18px}h1{color:#1f4e79;margin-bottom:4px}h2{color:#1f4e79;border-bottom:1px solid #ccd7e4;padding-bottom:4px}h3{margin-bottom:5px}.entry,.pub,li{break-inside:avoid}.entry{padding:5px 0}.top{display:flex;gap:14px}.yr{font-weight:bold;min-width:70px}.title{font-weight:bold}.meta,.sub,.sec-sub{color:#485568}a{color:#1f4e79;text-decoration:none}.pub-tools,.filter-row,#pubCount,#pubEmpty{display:none}ul{padding-left:20px}`; }

createEditor();
createExportDialog();
renderUpdates();
