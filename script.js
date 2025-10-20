/* =========================================================
   Utils
========================================================= */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
function escapeCSS(s) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(s);
  return String(s).replace(/[\0-\x1F\x7F-\uFFFF]/g, (ch) => "\\" + ch.charCodeAt(0).toString(16) + " ");
}
const sanitizeId = (s="") =>
  s.toString().trim().toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");
const enc = (obj) => encodeURIComponent(JSON.stringify(obj ?? []));
const dec = (str) => { try { return JSON.parse(decodeURIComponent(str || "[]")); } catch { return []; } };
async function loadJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error("Erreur chargement:", url, e);
    return null;
  }
}
/* =========================================================
   État global (sélections + UI)
========================================================= */
let competencesSelectionnees = [];   // [{id, nom, description, comportements[]}]
let expertisesSelectionnees  = [];   // [{nom, titre, depuis, description}]
/* Zones d’affichage (colonne 1, 2) */
const col1 = $("#colonne1");
const col2 = $("#colonne2");
const exp1 = $("#expertise1");
const exp2 = $("#expertise2");
/* =========================================================
   Rendu : Détails des comportements (2 colonnes)
========================================================= */
function renderComportements() {
  if (!col1 || !col2) return;
  col1.innerHTML = ""; col2.innerHTML = "";
  competencesSelectionnees.slice(0,2).forEach((item, idx) => {
    const cible = idx === 0 ? col1 : col2;
    const ul = (Array.isArray(item.comportements) && item.comportements.length)
      ? `<ul class="list-disc ml-5 mt-2 text-sm text-gray-700">
           ${item.comportements.map(c => `<li>${c}</li>`).join("")}
         </ul>` : "";
    const card = document.createElement("div");
    card.className = "p-2 bg-white rounded shadow-sm border relative";
    card.innerHTML = `
      <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs remove-btn" data-id="${item.id}">❌</button>
      <h4 class="font-semibold">${item.nom}</h4>
      ${item.description ? `<p class="text-xs text-gray-500">${item.description}</p>` : ""}
      ${ul}
    `;
    cible.appendChild(card);
  });
}
/* =========================================================
   Rendu : Détails des expertises techniques (2 colonnes)
========================================================= */
function renderExpertises() {
  if (!exp1 || !exp2) return;
  exp1.innerHTML = ""; exp2.innerHTML = "";
  expertisesSelectionnees.slice(0,2).forEach((e, idx) => {
    const cible = idx === 0 ? exp1 : exp2;
    const ligne1 = `
      <p class="font-semibold text-green-700">
        ${e.nom}
        ${(e.titre || e.depuis) ? `<span class="text-gray-600 text-sm">
          — ${e.titre || ""}${e.depuis ? ` — Depuis : ${e.depuis}` : ""}</span>` : ""}
      </p>`;
    const card = document.createElement("div");
    card.className = "p-2 bg-white rounded shadow-sm border relative";
    card.innerHTML = `
      <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs remove-exp" data-nom="${e.nom}">❌</button>
      ${ligne1}
      ${e.description ? `<p class="text-xs text-gray-600 mt-1">${e.description}</p>` : ""}
    `;
    cible.appendChild(card);
  });
}
/* =========================================================
   Surbrillance du parcours selon expertises (optionnel)
========================================================= */
function clearTimelineHighlight() {
  $$("#timeline > div").forEach(d => d.classList.remove("bg-yellow-100","border-yellow-400"));
}
function highlightTimelineByKeywords(words=[]) {
  if (!words.length) return;
  $$("#timeline > div").forEach(d => {
    const t = d.textContent.toLowerCase();
    if (words.some(w => w && t.includes(w.toLowerCase()))) {
     d.classList.add("bg-amber-100","border-amber-400");
    }
  });
}
function recomputeTimelineHighlight() {
  clearTimelineHighlight();
  highlightTimelineByKeywords(expertisesSelectionnees.map(e => e.nom));
}
/* =========================================================
   Parcours professionnel (parcours.json)
   - Supporte faits_sailants : string OU { texte, liens_comportements }
========================================================= */
async function chargerParcours() {
  const timeline = $("#timeline");
  if (!timeline) return;
  timeline.innerHTML = `<p class="text-gray-500 italic">Chargement du parcours professionnel...</p>`;
  const data = await loadJSON("parcours.json");
  if (!data) {
    timeline.innerHTML = `<p class="text-red-500">Erreur de chargement du parcours.</p>`;
    return;
  }
  const items = Array.isArray(data) ? data : [];
  timeline.innerHTML = items.map(it => {
    const titre = it.titre || `${it.periode ?? ""} - ${it.role ?? ""}`.replace(/ - $/,"");
    const detailsArr = Array.isArray(it.details) ? it.details : (it.details ? [it.details] : []);
    const faits = Array.isArray(it.faits_sailants) ? it.faits_sailants :
                  Array.isArray(it.faitsSaillants) ? it.faitsSaillants : [];
    const faitsNorm = faits.map(f => {
      if (typeof f === "string") return { texte: f, liens_comportements: [], resultat: "" };
      const texte = f.texte ?? f.text ?? "";
      const liens = Array.isArray(f.liens_comportements) ? f.liens_comportements : [];
      const resultat = f.resultat ?? f.resultant ?? f.résultat ?? "";
      return { texte, liens_comportements: liens, resultat };
    });
    return `
      <div class="timeline-card bg-white p-3 rounded shadow-sm border border-gray-200 hover:bg-blue-50 transition">
        <h3 class="font-bold text-blue-700 flex justify-between items-center select-none">
          <span>${titre}</span>
          <span class="text-blue-600 font-bold text-sm">▼</span>
        </h3>
        <div id="details-${sanitizeId(titre)}" class="hidden mt-2 text-sm text-gray-700">
          ${detailsArr.map(d => `<p class="mb-1">${d}</p>`).join("")}
          ${faitsNorm.length ? `
            <h4 class="font-semibold mt-2 text-gray-800">Faits saillants :</h4>
            <ul class="list-disc ml-6 mt-1">
              ${faitsNorm.map(f => `
                <li class="fait-sailant cursor-pointer hover:bg-blue-50 transition p-1 rounded"
                    data-liens='${JSON.stringify(f.liens_comportements || [])}'
                    data-resultat="${(f.resultat || '').replace(/"/g, '&quot;')}">
                  ${f.texte}
                </li>`).join("")}
            </ul>
          ` : ""}
        </div>
      </div>`;
  }).join("");
  // Toggle uniquement au clic sur le header (H3), pas sur tout le bloc
  timeline.addEventListener("click", (e) => {
    const header = e.target.closest(".timeline-card > h3");
    if (!header) return;
    const card   = header.closest(".timeline-card");
    const details= card.querySelector("div[id^='details-']");
    const arrow  = header.querySelector("span.text-blue-600");
    if (!details || !arrow) return;
    details.classList.toggle("hidden");
    arrow.textContent = details.classList.contains("hidden") ? "▼" : "▲";
    saveState();
  });
}
/* =========================================================
   Compétences comportementales (competences.json)
   + 🔍 Filtrage dynamique par mot-clé et catégorie
========================================================= */
async function chargerCompetencesComportementales() {
  const zone = $("#competencesComportementales");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences comportementales...</p>`;
  // 🔒 On charge 'competences.json' (nom conservé)
  const raw = await loadJSON("competences.json");
  if (!raw) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences.</p>`;
    return;
  }
  // Support des 2 formats : ancien (objet par catégories) OU nouveau (tableau plat)
  let data = [];
  if (Array.isArray(raw)) {
    data = raw;
  } else if (typeof raw === "object") {
    Object.keys(raw).forEach(k => {
      const arr = Array.isArray(raw[k]) ? raw[k] : [];
      data.push(...arr);
    });
  } else {
    zone.innerHTML = `<p class="text-red-500">Format de données non reconnu.</p>`;
    return;
  }
  // Sélectionne uniquement les compétences non techniques pour cette colonne
  // Sélectionne uniquement les compétences actives (actif = true)
const visibles = data.filter(c => c.actif === true);

  // Groupement par categorie + sousCategorie
  const grouped = {};
  visibles.forEach(c => {
    const cat = c.categorie || "Autres";
    const sous = c.sousCategorie || "";
    const key = sous ? `${cat} / ${sous}` : cat;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });
  // Construction de l’interface
  const html = Object.entries(grouped).map(([key, arr]) => {
    const catId = sanitizeId(key);
    return `
      <div class="mb-2 border rounded bg-white shadow-sm">
        <div class="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-blue-50 cat-header" data-cat="${catId}">
          <span class="font-semibold text-blue-700">${key}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div id="bloc-${catId}" class="hidden px-3 pb-2">
          ${arr.map(c => `
            <div class="competence-item mb-2 bg-gray-50 p-2 rounded hover:bg-blue-50 cursor-pointer transition"
                 data-id="${c.id}"
                 data-nom="${c.nom ?? c.name ?? "Sans titre"}"
                 data-description="${((c.description ?? c.definition ?? "") + "").replace(/"/g,'&quot;')}"
                 data-comportements='${enc(c.comportements ?? c.comportementsAttendus ?? [])}'
                 data-motscles='${enc(c.motsCles ?? [])}'
                 data-reference="${(c.referencePDF ?? "") + ""}">
              <p class="font-medium">${c.nom ?? c.name ?? "Sans titre"}</p>
              ${c.description ? `<p class="text-xs text-gray-600">${c.description}</p>` : ""}
              ${c.sousCategorie ? `<p class="text-[11px] text-gray-400 italic">${c.sousCategorie}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>`;
  }).join("");
  zone.innerHTML = html || `<p class="text-gray-400 italic">Aucune compétence trouvée.</p>`;
  // === Délégation : ouvrir/fermer catégories et sélectionner compétences ===
  zone.addEventListener("click", (e) => {
    const head = e.target.closest(".cat-header");
    if (head) {
      const bloc = $(`#bloc-${head.dataset.cat}`);
      if (bloc) {
        bloc.classList.toggle("hidden");
        const arrow = head.querySelector("span.text-blue-500");
        if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
        saveState();
      }
      return;
    }
    const item = e.target.closest(".competence-item");
    if (!item) return;
    const id = item.dataset.id;
    const nom = item.dataset.nom;
    const description = item.dataset.description.replace(/&quot;/g, '"');
    const comportements = dec(item.dataset.comportements);
    const idx = competencesSelectionnees.findIndex(x => x.id === id);
    if (idx === -1) {
      if (competencesSelectionnees.length < 2) {
        competencesSelectionnees.push({ id, nom, description, comportements });
        item.classList.add("bg-sky-100","border","border-sky-400");
      }
    } else {
      competencesSelectionnees.splice(idx,1);
      item.classList.remove("bg-sky-100","border","border-sky-400");
    }
    renderComportements();
    saveState();
  });
  /* === 🔍 Filtrage dynamique (texte + catégorie) === */
  const input  = $("#filtreCompetences");
  const select = $("#filtreCategorie");
  if (select) {
    select.innerHTML = `<option value="">Toutes les catégories</option>` +
      Object.keys(grouped).map(k => `<option value="${sanitizeId(k)}">${k}</option>`).join("");
  }
  function normaliserTexte(t) {
    return (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function appliquerFiltreCompetences() {
    const texteBrut = input?.value || "";
    const texte = normaliserTexte(texteBrut);
    const catSel = (select?.value || "").trim();
    let resultats = 0;
    $$("#competencesComportementales > div").forEach(catBloc => {
      const header = catBloc.querySelector(".cat-header");
      const blocId = header?.dataset.cat;
      const bloc = $(`#bloc-${blocId}`);
      if (!bloc) return;
      const visibleCat = !catSel || blocId === catSel;
      const items = bloc.querySelectorAll(".competence-item");
      let anyVisible = false;
      items.forEach(it => {
        const nom = normaliserTexte(it.dataset.nom || "");
        const desc = normaliserTexte(it.dataset.description || "");
        const comportements = normaliserTexte((dec(it.dataset.comportements) || []).join(" "));
        const motscles = normaliserTexte((dec(it.dataset.motscles) || []).join(" "));
        const visibleTxt = !texte || nom.includes(texte) || desc.includes(texte) || comportements.includes(texte) || motscles.includes(texte);
        const visible = visibleCat && visibleTxt;
        it.style.display = visible ? "block" : "none";
        if (visible) { anyVisible = true; resultats++; }
      });
      catBloc.style.display = anyVisible ? "block" : "none";
    });
    // Message résultat
    let msg = zone.querySelector(".aucun-resultat");
    if (!msg) {
      msg = document.createElement("p");
      msg.className = "aucun-resultat text-gray-500 italic mt-2";
      zone.appendChild(msg);
    }
    msg.textContent = resultats === 0 ? "Aucun résultat ne correspond à votre recherche." : "";
    // Sauvegarde filtre
    localStorage.setItem("filtreCompetencesDashboard", JSON.stringify({ texte: texteBrut, categorie: catSel }));
  }
  if (input && select) {
    input.addEventListener("input", appliquerFiltreCompetences);
    select.addEventListener("change", appliquerFiltreCompetences);
  }
  // 🧹 Effacer champ individuel
  const clearBtn = $("#clearFiltre");
  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      appliquerFiltreCompetences();
      clearBtn.classList.add("hidden");
      localStorage.removeItem("filtreCompetencesDashboard");
    });
    input.addEventListener("input", () => {
      clearBtn.classList.toggle("hidden", !input.value.trim());
    });
    // Afficher l'icône si texte restauré
    const mem = JSON.parse(localStorage.getItem("filtreCompetencesDashboard") || "{}");
    if (mem.texte) clearBtn.classList.remove("hidden");
  }
  // 🔄 Reset global
  const resetBtn = $("#resetFiltres");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (input) input.value = "";
      if (select) select.value = "";
      localStorage.removeItem("filtreCompetencesDashboard");
      appliquerFiltreCompetences();
      clearBtn?.classList.add("hidden");
      // Effacer surbrillances & sélections (cohérence UI globale)
      document.querySelectorAll(`
        .bg-sky-100, .bg-green-200, .bg-purple-200, .bg-orange-100, 
        .bg-amber-100, .bg-yellow-100, .bg-pink-100, .bg-pink-50,
        .border-sky-400, .border-green-500, .border-purple-500,
        .border-orange-400, .border-amber-400, .border-yellow-400, .border-pink-400
      `).forEach(el => el.classList.remove(
        "bg-sky-100","border-sky-400",
        "bg-green-200","border-green-500",
        "bg-purple-200","border-purple-500",
        "bg-orange-100","border-orange-400",
        "bg-amber-100","border-amber-400",
        "bg-yellow-100","border-yellow-400",
        "bg-pink-100","bg-pink-50","border-pink-400",
        "highlighted"
      ));
      $$("#timeline > div").forEach(d =>
        d.classList.remove("bg-yellow-100","border-yellow-400","bg-amber-100","border-amber-400","bg-pink-50","highlighted")
      );
      competencesSelectionnees = [];
      expertisesSelectionnees = [];
      renderComportements();
      renderExpertises();
      clearTimelineHighlight();
      resetHighlights();
      saveState();
    });
  }
  // Restauration et application initiale
  const mem = JSON.parse(localStorage.getItem("filtreCompetencesDashboard") || "{}");
  if (mem.texte && input) input.value = mem.texte;
  if (mem.categorie && select) select.value = mem.categorie;
  if (input || select) appliquerFiltreCompetences();
}
/* =========================================================
   Compétences techniques (competences_techniques.json)
========================================================= */
async function chargerCompetencesTechniques() {
  const zone = $("#competencesTechniques");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences techniques...</p>`;
  const data = await loadJSON("competences_techniques.json");
  if (!data) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences techniques.</p>`;
    return;
  }
  const arr = Array.isArray(data) ? data : (data.expertises_techniques ?? []);
  zone.innerHTML = arr.map((c, i) => {
    const nom   = c.bouton ?? c.nom ?? `Expertise ${i+1}`;
    const titre = typeof c.titre === "string" ? c.titre : "";
    const depuis= (typeof c.depuis === "string" || typeof c.depuis === "number") ? String(c.depuis) : "";
    const desc  = typeof c.description === "string" ? c.description : "";
    return `
      <button class="tech-btn bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium transition mr-2 mb-2"
              data-nom="${nom}"
              data-titre="${titre.replace(/"/g,'&quot;')}"
              data-depuis="${depuis.replace(/"/g,'&quot;')}"
              data-description="${desc.replace(/"/g,'&quot;')}">
        ${nom}
      </button>`;
  }).join("");
  // Délégation : clic sur un bouton technique
  zone.addEventListener("click", (e) => {
    const btn = e.target.closest(".tech-btn");
    if (!btn) return;
    const nom     = btn.dataset.nom;
    const titre   = btn.dataset.titre.replace(/&quot;/g,'"');
    const depuis  = btn.dataset.depuis.replace(/&quot;/g,'"');
    const desc    = btn.dataset.description.replace(/&quot;/g,'"');
    const idx = expertisesSelectionnees.findIndex(x => x.nom === nom);
    if (idx === -1) {
      if (expertisesSelectionnees.length < 2) {
        expertisesSelectionnees.push({ nom, titre, depuis, description: desc });
        btn.classList.add("bg-green-200","border","border-green-500");
      }
    } else {
      expertisesSelectionnees.splice(idx,1);
      btn.classList.remove("bg-blue-300");
    }
    renderExpertises();
    recomputeTimelineHighlight();
    saveState();
  });
}
/*=========================================================
   Compétences strategique (competences_techniques.json)
========================================================= */
async function chargerCompetencesStrategiques() {
  const zone = $("#competencesStrategiques");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences stratégiques...</p>`;
  const data = await loadJSON("competences_strategiques.json");
  if (!data) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences stratégiques.</p>`;
    return;
  }
  const arr = Array.isArray(data) ? data : (data.competences_strategiques ?? []);
  zone.innerHTML = arr.map((c, i) => {
    const nom   = c.bouton ?? c.nom ?? `Stratégique ${i+1}`;
    const titre = typeof c.titre === "string" ? c.titre : "";
    const depuis= (typeof c.depuis === "string" || typeof c.depuis === "number") ? String(c.depuis) : "";
    const desc  = typeof c.description === "string" ? c.description : "";
    return `
      <button class="strategique-btn bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-sm font-medium transition mr-2 mb-2"
              data-nom="${nom}"
              data-titre="${titre.replace(/"/g,'&quot;')}"
              data-depuis="${depuis.replace(/"/g,'&quot;')}"
              data-description="${desc.replace(/"/g,'&quot;')}">
        ${nom}
      </button>`;
  }).join("");
  zone.addEventListener("click", (e) => {
    const btn = e.target.closest(".strategique-btn");
    if (!btn) return;
    const nom     = btn.dataset.nom;
    const titre   = btn.dataset.titre.replace(/&quot;/g,'"');
    const depuis  = btn.dataset.depuis.replace(/&quot;/g,'"');
    const desc    = btn.dataset.description.replace(/&quot;/g,'"');
    const idx = expertisesSelectionnees.findIndex(x => x.nom === nom);
    if (idx === -1) {
      if (expertisesSelectionnees.length < 2) {
        expertisesSelectionnees.push({ nom, titre, depuis, description: desc });
       btn.classList.add("bg-purple-200","border","border-purple-500");
      }
    } else {
      expertisesSelectionnees.splice(idx,1);
      btn.classList.remove("bg-purple-300");
    }
    renderExpertises();
    recomputeTimelineHighlight();
    saveState();
  });
}
/* =========================================================
   Formations & certifications (formations_certifications.json)
========================================================= */
async function chargerFormations() {
  const zone = $("#formations");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des formations...</p>`;
  const data = await loadJSON("formations_certifications.json");
  if (!data) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des formations.</p>`;
    return;
  }
  zone.innerHTML = data.map(cat => {
    const catId = sanitizeId(cat.categorie || "categorie");
    return `
      <div class="mb-2 border rounded bg-white shadow-sm">
        <div class="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-blue-50 formation-header" data-cat="${catId}">
          <span class="font-semibold text-blue-700">${cat.categorie}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div id="sous-${catId}" class="hidden px-3 pb-2">
          ${cat.sous_sections.map(f => `
            <button class="formation-btn text-left w-full hover:text-blue-700"
                    data-titre="${(f.titre ?? "").replace(/"/g,'&quot;')}"
                    data-periode="${(f.periode ?? "").replace(/"/g,'&quot;')}"
                    data-details='${enc(f.details)}'>
              <strong>${f.titre}</strong> <span class="text-gray-500 text-xs">(${f.periode})</span>
            </button>
          `).join("")}
        </div>
      </div>`;
  }).join("");
  // Délégation : open/close catégories + injection vers colonnes de gauche
  zone.addEventListener("click", (e) => {
    const head = e.target.closest(".formation-header");
    if (head) {
      const id = head.dataset.cat;
      const bloc = $(`#sous-${id}`);
      if (bloc) {
        bloc.classList.toggle("hidden");
        const arrow = head.querySelector("span.text-blue-500");
        if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
        saveState();
      }
      return;
    }
    const btn = e.target.closest(".formation-btn");
    if (btn) {
      const titre   = btn.dataset.titre.replace(/&quot;/g,'"');
      const periode = btn.dataset.periode.replace(/&quot;/g,'"');
      const details = dec(btn.dataset.details);
      const id = `formation-${sanitizeId(titre)}`;
      const existing = competencesSelectionnees.findIndex(x => x.id === id);
      if (existing === -1) {
        if (competencesSelectionnees.length < 2) {
          competencesSelectionnees.push({ id, nom: titre, description: periode, comportements: details });
        } else {
          competencesSelectionnees[1] = { id, nom: titre, description: periode, comportements: details };
        }
      } else {
        competencesSelectionnees.splice(existing,1);
      }
      renderComportements();
      saveState();
    }
  });
}
/* =========================================================
   Exemples STAR (star_examples.json avec liens_comportements)
   - Accepte objet par catégories OU tableau plat
========================================================= */
async function chargerExemplesSTAR() {
  const zone = $("#exemplesSTAR");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des exemples STAR...</p>`;
  const data = await loadJSON("star_examples.json");
  if (!data) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des exemples STAR.</p>`;
    return;
  }
  zone.innerHTML = "";
  if (!Array.isArray(data)) {
    // Objet catégorisé
    Object.keys(data).forEach(cat => {
      const catId = sanitizeId(cat);
      const wrap = document.createElement("div");
      wrap.className = "bg-white border rounded shadow-sm mb-2";
      wrap.innerHTML = `
        <div class="flex justify-between items-center cursor-pointer px-3 py-2 hover:bg-blue-50 star-header" data-cat="${catId}">
          <span class="font-semibold text-blue-700">${cat}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div id="star-${catId}" class="hidden px-4 pb-2"></div>
      `;
      zone.appendChild(wrap);
      const content = wrap.querySelector(`#star-${catId}`);
      (data[cat] || []).forEach(ex => {
        const liens = Array.isArray(ex.liens_comportements) ? ex.liens_comportements : [];
        const card = document.createElement("div");
        card.className = "star-card border-l-4 border-blue-300 bg-gray-50 p-3 my-2 rounded cursor-pointer hover:bg-blue-50 transition";
        card.dataset.liens = JSON.stringify(liens);
        card.innerHTML = `
          <p class="font-semibold text-gray-800">${ex.titre}</p>
          <p><strong>S :</strong> ${ex.situation}</p>
          <p><strong>T :</strong> ${ex.tache}</p>
          <p><strong>A :</strong> ${ex.action}</p>
          <p><strong>R :</strong> ${ex.resultat}</p>
          <button class="mt-2 text-sm text-blue-600 font-semibold hover:underline">→ Utiliser cet exemple</button>
        `;
        // Sélection visuelle locale (bleu)
        card.addEventListener("click", (e) => {
          if (e.target.tagName.toLowerCase() === "button") return;
          $$("#exemplesSTAR .selected").forEach(el => el.classList.remove("bg-blue-100","selected"));
          card.classList.add("bg-orange-100","border","border-orange-400","selected");
        });
        // Focus situation (si #starFocus existe)
        card.querySelector("button").addEventListener("click", (e) => {
          e.stopPropagation();
          const focus = $("#starFocus");
          if (focus) {
            focus.innerHTML = `
              <div class="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow">
                <p class="font-bold text-gray-800 mb-1">${ex.titre}</p>
                <p><strong>Situation :</strong> ${ex.situation}</p>
              </div>`;
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
        content.appendChild(card);
      });
    });
    // Toggle catégories STAR
    zone.addEventListener("click", (e) => {
      const head = e.target.closest(".star-header");
      if (!head) return;
      const id = head.dataset.cat;
      const bloc = $(`#star-${id}`);
      if (!bloc) return;
      bloc.classList.toggle("hidden");
      const arrow = head.querySelector("span.text-blue-500");
      if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
      saveState();
    });
  } else {
    // Tableau plat
    zone.innerHTML = data.map(ex => `
      <div class="bg-white border rounded shadow-sm mb-2">
        <div class="flex justify-between items-center cursor-pointer px-3 py-2 hover:bg-blue-50 star-item">
          <span class="font-semibold text-blue-700">${ex.theme ?? ex.titre ?? "Exemple"}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div class="hidden px-4 pb-2 star-card" data-liens='${JSON.stringify(ex.liens_comportements || [])}'>
          <p><strong>S :</strong> ${ex.situation}</p>
          <p><strong>T :</strong> ${ex.tache}</p>
          <p><strong>A :</strong> ${ex.action}</p>
          <p><strong>R :</strong> ${ex.resultat}</p>
          <button class="mt-2 text-sm text-blue-600 font-semibold hover:underline">→ Utiliser cet exemple</button>
        </div>
      </div>
    `).join("");
    // Toggle + focus
    zone.addEventListener("click", (e) => {
      const head = e.target.closest("div.star-item");
      if (head) {
        const bloc = head.nextElementSibling;
        bloc.classList.toggle("hidden");
        const arrow = head.querySelector("span.text-blue-500");
        if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
        return;
      }
      const btn = e.target.closest("button");
      if (btn) {
        const wrap = btn.closest("div");
        const titre = wrap.previousElementSibling.querySelector("span")?.textContent || "Exemple";
        const situation = (wrap.querySelector("p")?.innerText || "").replace(/^S\s*:\s*/,"");
        const focus = $("#starFocus");
        if (focus) {
          focus.innerHTML = `
            <div class="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded shadow">
              <p class="font-bold text-gray-800 mb-1">${titre}</p>
              <p><strong>Situation :</strong> ${situation}</p>
            </div>`;
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  }
}
/* =========================================================
   Suppressions (icônes ❌ dans les colonnes de gauche)
========================================================= */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;
    competencesSelectionnees = competencesSelectionnees.filter(x => x.id !== id);
    const src = document.querySelector(`.competence-item[data-id="${escapeCSS(id)}"]`);
    if (src) src.classList.remove("bg-blue-100","border","border-blue-400");
    renderComportements();
    saveState();
  }
  if (e.target.classList.contains("remove-exp")) {
    const nom = e.target.dataset.nom;
    expertisesSelectionnees = expertisesSelectionnees.filter(x => x.nom !== nom);
    const btn = $(`#competencesTechniques .tech-btn[data-nom="${escapeCSS(nom)}"]`);
    if (btn) btn.classList.remove("bg-blue-300");
    renderExpertises();
    recomputeTimelineHighlight();
    saveState();
  }
});
/* =========================================================
   Ouvrir TOUT par clic sur H2 principaux
========================================================= */
function openAllInZone(zoneId, prefix) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.querySelectorAll(`div[id^="${prefix}"]`).forEach(bloc => {
    bloc.classList.remove("hidden");
    const header = bloc.previousElementSibling;
    if (header) {
      const arrow = header.querySelector("span.text-blue-500");
      if (arrow) arrow.textContent = "▴";
    }
  });
}
function openAllCompetencesComportementales() {
  const zone = $("#competencesComportementales");
  if (!zone) return;
  zone.querySelectorAll("[data-cat]").forEach(head => {
    const catId = head.dataset.cat;
    const bloc = $(`#bloc-${catId}`);
    if (bloc) {
      bloc.classList.remove("hidden");
      const arrow = head.querySelector("span.text-blue-500");
      if (arrow) arrow.textContent = "▴";
      bloc.querySelectorAll(".competence-item, div[id^='sous-']").forEach(el => {
        el.classList.remove("hidden");
        el.style.display = "block";
      });
    }
  });
}
document.addEventListener("click", (e) => {
  const h = e.target.closest("h2");
  if (!h) return;
  const txt = (h.textContent || "").trim();
  if (txt.includes("Compétences comportementales")) {
    openAllCompetencesComportementales();
    saveState();
  }
  if (txt.includes("Formations et certifications")) {
    openAllInZone("formations","sous-");
    saveState();
  }
  if (txt.toLowerCase().includes("exemples star")) {
    openAllInZone("exemplesSTAR","star-");
    saveState();
  }
});
/* =========================================================
   🔄 Sauvegarde/restauration (localStorage)
========================================================= */
const ETAT_KEY = "etatDashboardEntrevue";
function showSaveIndicator() {
  const el = document.getElementById("saveIndicator");
  if (!el) return;
  el.classList.remove("hidden");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add("hidden"), 1000);
}
function computeSectionsOuvertes() {
  const opened = [];
  document.querySelectorAll('[id^="bloc-"]').forEach(div => { if (!div.classList.contains("hidden")) opened.push(div.id); });
  document.querySelectorAll('[id^="sous-"]').forEach(div => { if (!div.classList.contains("hidden")) opened.push(div.id); });
  document.querySelectorAll('[id^="star-"]').forEach(div => { if (!div.classList.contains("hidden")) opened.push(div.id); });
  // Parcours : on mémorise les details-* ouverts
  document.querySelectorAll('[id^="details-"]').forEach(div => { if (!div.classList.contains("hidden")) opened.push(div.id); });
  return opened;
}
function saveState() {
  const etat = {
    competences: competencesSelectionnees,
    expertises: expertisesSelectionnees,
    sectionsOuvertes: computeSectionsOuvertes()
  };
  try {
    localStorage.setItem(ETAT_KEY, JSON.stringify(etat));
    showSaveIndicator();
  } catch (e) {
    console.warn("Erreur sauvegarde", e);
  }
}
function openBlockById(id) {
  const bloc = document.getElementById(id);
  if (!bloc) return;
  bloc.classList.remove("hidden");
  const header = bloc.previousElementSibling;
  if (header) {
    const arrow = header.querySelector("span.text-blue-500");
    if (arrow) arrow.textContent = "▴";
  }
}
function restoreState() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(ETAT_KEY) || "{}"); } catch {}
  if (!data) return;
  competencesSelectionnees = Array.isArray(data.competences) ? data.competences : [];
  expertisesSelectionnees  = Array.isArray(data.expertises)  ? data.expertises  : [];
  renderComportements();
  renderExpertises();
  recomputeTimelineHighlight();
  (data.sectionsOuvertes || []).forEach(openBlockById);
  // Ré-applique l’état visuel sur les listes/boutons source
  competencesSelectionnees.forEach(c => {
    const el = document.querySelector(`.competence-item[data-id="${escapeCSS(c.id)}"]`);
    if (el) el.classList.add("bg-blue-100","border","border-blue-400");
  });
  expertisesSelectionnees.forEach(e => {
    const btn = document.querySelector(`#competencesTechniques .tech-btn[data-nom="${escapeCSS(e.nom)}"]`);
    if (btn) btn.classList.add("bg-blue-300");
  });
}
/* =========================================================
   🔗 Liaison bidirectionnelle : Compétences ↔ STAR ↔ Parcours
   - Inclut surbrillance du BLOC DE PARCOURS parent
   - 2e clic = reset
========================================================= */
function resetHighlights() {
  $$(".highlighted").forEach(el =>
    el.classList.remove("highlighted","bg-pink-100","bg-pink-50","border-pink-400")
  );
}
// Clic sur compétence → STAR + Faits saillants + Bloc parcours
document.addEventListener("click", (e) => {
  const comp = e.target.closest(".competence-item");
  if (!comp) return;
  const compId = comp.dataset.id;
  if (!compId) return;
  const wasActive = comp.classList.contains("highlighted");
  resetHighlights();
  if (wasActive) return;
  comp.classList.add("highlighted","bg-pink-100","border-pink-400");
  // STAR
  $$("#exemplesSTAR .star-card").forEach(star => {
    const liens = star.dataset.liens ? JSON.parse(star.dataset.liens) : [];
    if (liens.includes(compId)) {
      star.classList.add("highlighted","bg-pink-100","border-pink-400");
    }
  });
  // Parcours → faits saillants + bloc parent
  $$("#timeline .fait-sailant").forEach(fs => {
    const liens = fs.dataset.liens ? JSON.parse(fs.dataset.liens) : [];
    if (liens.includes(compId)) {
      fs.classList.add("highlighted","bg-pink-100","border-pink-400");
      const parent = fs.closest(".timeline-card");
      if (parent) parent.classList.add("highlighted","bg-pink-50","border-pink-400");
    }
  });
});
// Clic sur STAR → compétences
document.addEventListener("click", (e) => {
  const star = e.target.closest(".star-card");
  if (!star) return;
  const liens = star.dataset.liens ? JSON.parse(star.dataset.liens) : [];
  if (!liens.length) return;
  const wasActive = star.classList.contains("highlighted");
  resetHighlights();
  if (wasActive) return;
  star.classList.add("highlighted","bg-pink-100","border-pink-400");
  liens.forEach(cid => {
    const comp = document.querySelector(`.competence-item[data-id="${escapeCSS(cid)}"]`);
    if (comp) comp.classList.add("highlighted","bg-pink-100","border-pink-400");
  });
});
// Clic sur Fait saillant → compétences + bloc parent
document.addEventListener("click", (e) => {
  const fs = e.target.closest(".fait-sailant");
  if (!fs) return;
  const liens = fs.dataset.liens ? JSON.parse(fs.dataset.liens) : [];
  if (!liens.length) return;
  const wasActive = fs.classList.contains("highlighted");
  resetHighlights();
  if (wasActive) return;
  fs.classList.add("highlighted","bg-pink-100","border-pink-400");
  const parent = fs.closest(".timeline-card");
  if (parent) parent.classList.add("highlighted","bg-pink-50","border-pink-400");
  liens.forEach(cid => {
    const comp = document.querySelector(`.competence-item[data-id="${escapeCSS(cid)}"]`);
    if (comp) comp.classList.add("highlighted","bg-pink-100","border-pink-400");
  });
});
/* =========================================================
   Init
========================================================= */
window.addEventListener("DOMContentLoaded", async () => {
  await chargerParcours();
  await chargerCompetencesComportementales();
  await chargerCompetencesTechniques();
  await chargerCompetencesStrategiques();
  await chargerFormations();
  await chargerExemplesSTAR();
  restoreState();
});
// === Toggle du texte "résultat" au clic sur un fait saillant ===
document.addEventListener("click", (e) => {
  const fs = e.target.closest(".fait-sailant");
  if (!fs) return;
  const alreadyOpen = fs.classList.contains("result-open");
  // Ferme les autres blocs résultats
  document.querySelectorAll(".fait-sailant.result-open").forEach(el => {
    el.classList.remove("result-open");
    const res = el.querySelector(".resultat-texte");
    if (res) res.remove();
  });
  if (alreadyOpen) return;
  const resultatTexte = fs.getAttribute("data-resultat");
  if (resultatTexte && resultatTexte.trim() !== "") {
    const p = document.createElement("p");
    p.className = "resultat-texte mt-1 text-sm text-gray-700 bg-yellow-50 border-l-4 border-yellow-300 pl-2 pr-1 py-1 rounded";
    p.textContent = resultatTexte;
    fs.appendChild(p);
    fs.classList.add("result-open");
  }
});