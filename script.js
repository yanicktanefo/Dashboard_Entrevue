/* =========================================================
   Utils
========================================================= */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const sanitizeId = (s="") =>
  s.toString().trim().toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");
const enc = (obj) => encodeURIComponent(JSON.stringify(obj ?? []));
const dec = (str) => JSON.parse(decodeURIComponent(str || "[]"));

async function loadJSON(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error("Erreur chargement:", url, e);
    return null;
  }
}

/* =========================================================
   État global (sélections)
========================================================= */
let competencesSelectionnees = [];   // [{id, nom, description, comportements[]}]
let expertisesSelectionnees  = [];   // [{nom, titre, depuis, description}]

/* Zones d’affichage gauche */
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
   Surbrillance du parcours selon expertises
========================================================= */
function clearTimelineHighlight() {
  $$("#timeline > div").forEach(d => d.classList.remove("bg-yellow-100","border-yellow-400"));
}
function highlightTimelineByKeywords(words=[]) {
  if (!words.length) return;
  $$("#timeline > div").forEach(d => {
    const t = d.textContent.toLowerCase();
    if (words.some(w => w && t.includes(w.toLowerCase()))) {
      d.classList.add("bg-yellow-100","border-yellow-400");
    }
  });
}
function recomputeTimelineHighlight() {
  clearTimelineHighlight();
  highlightTimelineByKeywords(expertisesSelectionnees.map(e => e.nom));
}

/* =========================================================
   Parcours professionnel (parcours.json)
   Attendus possibles:
   - [{titre, details[], faits_sailants[]}]
   - ou {periode, role, details(string), faitsSaillants[]}
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
    const detailsArr =
      Array.isArray(it.details) ? it.details :
      it.details ? [it.details] : [];
    const faits =
      Array.isArray(it.faits_sailants) ? it.faits_sailants :
      Array.isArray(it.faitsSaillants) ? it.faitsSaillants : [];

    return `
      <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition">
        <h3 class="font-bold text-blue-700 flex justify-between items-center select-none">
          <span>${titre}</span>
          <span class="text-blue-600 font-bold text-sm">▼</span>
        </h3>
        <div id="details-${sanitizeId(titre)}" class="hidden mt-2 text-sm text-gray-700">
          ${detailsArr.map(d => `<p class="mb-1">${d}</p>`).join("")}
          ${faits.length ? `
            <h4 class="font-semibold mt-2 text-gray-800">Faits saillants :</h4>
            <ul class="list-disc ml-6 mt-1">${faits.map(f => `<li>${f}</li>`).join("")}</ul>
          ` : ""}
        </div>
      </div>`;
  }).join("");

  // Toggle au clic n'importe où dans la carte
  timeline.addEventListener("click", (e) => {
    const card = e.target.closest("#timeline > div");
    if (!card) return;
    const details = card.querySelector("div[id^='details-']");
    const arrow   = card.querySelector("h3 span.text-blue-600");
    if (!details || !arrow) return;
    details.classList.toggle("hidden");
    arrow.textContent = details.classList.contains("hidden") ? "▼" : "▲";
  });
}

/* =========================================================
   Compétences comportementales (competences.json)
   Format attendu (flexible):
   { "Catégorie": [ {id?, nom, description?, comportements[]?, actif|"ACTIF": "oui|non" } ] }
========================================================= */
async function chargerCompetencesComportementales() {
  const zone = $("#competencesComportementales");
  if (!zone) return;
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences comportementales...</p>`;

  const data = await loadJSON("competences.json");
  if (!data) {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences.</p>`;
    return;
  }

  const html = Object.keys(data).map(cat => {
    const arr = Array.isArray(data[cat]) ? data[cat] : [];
    const actifs = arr.filter(c => ((c.actif ?? c.ACTIF) + "").toLowerCase() === "oui");
    if (!actifs.length) return "";

    const catId = sanitizeId(cat);
    return `
      <div class="mb-2 border rounded bg-white shadow-sm">
        <div class="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-blue-50 cat-header" data-cat="${catId}">
          <span class="font-semibold text-blue-700">${cat}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div id="bloc-${catId}" class="hidden px-3 pb-2">
          ${actifs.map((c, i) => `
            <div class="competence-item mb-2 bg-gray-50 p-2 rounded hover:bg-blue-50 cursor-pointer transition"
                 data-id="${c.id ?? `${catId}-${i}`}"
                 data-nom="${c.nom ?? "Sans titre"}"
                 data-description="${(c.description ?? "").replace(/"/g,'&quot;')}"
                 data-comportements="${enc(c.comportements)}">
              <p class="font-medium">${c.nom ?? "Sans titre"}</p>
              ${c.description ? `<p class="text-xs text-gray-600">${c.description}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>`;
  }).join("");

  zone.innerHTML = html || `<p class="text-gray-400 italic">Aucune compétence active trouvée.</p>`;

  // Délégation : ouvrir/fermer chaque catégorie
  zone.addEventListener("click", (e) => {
    const head = e.target.closest(".cat-header");
    if (!head) return;
    const catId = head.dataset.cat;
    const bloc = $(`#bloc-${catId}`);
    if (!bloc) return;
    bloc.classList.toggle("hidden");
    const arrow = head.querySelector("span.text-blue-500");
    if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
  });

  // Délégation : (dé)sélection d'une compétence → affiche dans colonnes de gauche
  zone.addEventListener("click", (e) => {
    const item = e.target.closest(".competence-item");
    if (!item) return;
    const id = item.dataset.id;
    const nom = item.dataset.nom;
    const description = item.dataset.description.replace(/&quot;/g,'"');
    const comportements = dec(item.dataset.comportements);

    const idx = competencesSelectionnees.findIndex(x => x.id === id);
    if (idx === -1) {
      if (competencesSelectionnees.length < 2) {
        competencesSelectionnees.push({ id, nom, description, comportements });
        item.classList.add("bg-blue-100","border","border-blue-400");
      }
    } else {
      competencesSelectionnees.splice(idx,1);
      item.classList.remove("bg-blue-100","border","border-blue-400");
    }
    renderComportements();
  });
}

/* =========================================================
   Compétences techniques (competences_techniques.json)
   Format flexible: tableau ou {expertises_techniques:[...]}
   Élément: { nom|bouton, titre?, depuis?, description? }
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
  const nom = c.bouton ?? c.nom ?? `Expertise ${i+1}`;
  const titre = typeof c.titre === "string" ? c.titre : "";
  const depuis = typeof c.depuis === "string" || typeof c.depuis === "number" ? String(c.depuis) : "";
  const desc = typeof c.description === "string" ? c.description : "";

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
        btn.classList.add("bg-blue-300");
        renderExpertises();
        recomputeTimelineHighlight();
      }
    } else {
      expertisesSelectionnees.splice(idx,1);
      btn.classList.remove("bg-blue-300");
      renderExpertises();
      recomputeTimelineHighlight();
    }
  });
}

/* =========================================================
   Formations & certifications (formations_certifications.json)
   Format attendu: [
     { categorie: "Formations académiques", sous_sections:[{titre, periode, details?[]}] }, ...
   ]
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
                    data-details="${enc(f.details)}">
              <strong>${f.titre}</strong> <span class="text-gray-500 text-xs">(${f.periode})</span>
            </button>
          `).join("")}
        </div>
      </div>`;
  }).join("");

  // Délégation : open/close catégories
  zone.addEventListener("click", (e) => {
    const head = e.target.closest(".formation-header");
    if (head) {
      const id = head.dataset.cat;
      const bloc = $(`#sous-${id}`);
      if (bloc) {
        bloc.classList.toggle("hidden");
        const arrow = head.querySelector("span.text-blue-500");
        if (arrow) arrow.textContent = bloc.classList.contains("hidden") ? "▾" : "▴";
      }
      return;
    }
    // Clic sur une formation → injecte dans Détails des comportements
    const btn = e.target.closest(".formation-btn");
    if (btn) {
      const titre   = btn.dataset.titre.replace(/&quot;/g,'"');
      const periode = btn.dataset.periode.replace(/&quot;/g,'"');
      const details = dec(btn.dataset.details);
      const id = `formation-${sanitizeId(titre)}`;

      // Ajouter (max 2). Si déjà 2, on remplace la seconde.
      const existing = competencesSelectionnees.findIndex(x => x.id === id);
      if (existing === -1) {
        if (competencesSelectionnees.length < 2) {
          competencesSelectionnees.push({ id, nom: titre, description: periode, comportements: details });
        } else {
          competencesSelectionnees[1] = { id, nom: titre, description: periode, comportements: details };
        }
      } else {
        // toggle = retirer si re-cliqué
        competencesSelectionnees.splice(existing,1);
      }
      renderComportements();
    }
  });
}

/* =========================================================
   Exemples STAR (star_examples.json)
   Formats tolérés:
   - { "Catégorie": [ {titre, situation, tache, action, resultat} ] }
   - ou [ {theme, situation, tache, action, resultat} ]
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

  // Cas 1: objet par catégories
  if (!Array.isArray(data)) {
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
        const card = document.createElement("div");
        card.className = "border-l-4 border-blue-300 bg-gray-50 p-3 my-2 rounded cursor-pointer hover:bg-blue-50 transition";
        card.innerHTML = `
          <p class="font-semibold text-gray-800">${ex.titre}</p>
          <p><strong>S :</strong> ${ex.situation}</p>
          <p><strong>T :</strong> ${ex.tache}</p>
          <p><strong>A :</strong> ${ex.action}</p>
          <p><strong>R :</strong> ${ex.resultat}</p>
          <button class="mt-2 text-sm text-blue-600 font-semibold hover:underline">→ Utiliser cet exemple</button>
        `;
        // Sélection visuelle
        card.addEventListener("click", (e) => {
          if (e.target.tagName.toLowerCase() === "button") return;
          $$("#exemplesSTAR .selected").forEach(el => el.classList.remove("bg-blue-100","selected"));
          card.classList.add("bg-blue-100","selected");
        });
        // Focus situation
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
    });

  } else {
    // Cas 2: tableau plat d'exemples
    zone.innerHTML = data.map(ex => `
      <div class="bg-white border rounded shadow-sm mb-2">
        <div class="flex justify-between items-center cursor-pointer px-3 py-2 hover:bg-blue-50 star-item">
          <span class="font-semibold text-blue-700">${ex.theme ?? ex.titre ?? "Exemple"}</span>
          <span class="text-blue-500">▾</span>
        </div>
        <div class="hidden px-4 pb-2">
          <p><strong>S :</strong> ${ex.situation}</p>
          <p><strong>T :</strong> ${ex.tache}</p>
          <p><strong>A :</strong> ${ex.action}</p>
          <p><strong>R :</strong> ${ex.resultat}</p>
          <button class="mt-2 text-sm text-blue-600 font-semibold hover:underline">→ Utiliser cet exemple</button>
        </div>
      </div>
    `).join("");

    // Délégation: toggle + focus
    zone.addEventListener("click", (e) => {
      const head = e.target.closest(".star-item");
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
    renderComportements();
  }
  if (e.target.classList.contains("remove-exp")) {
    const nom = e.target.dataset.nom;
    expertisesSelectionnees = expertisesSelectionnees.filter(x => x.nom !== nom);
    // retirer l'état visuel du bouton si présent
    const btn = $(`#competencesTechniques .tech-btn[data-nom="${CSS.escape(nom)}"]`);
    if (btn) btn.classList.remove("bg-blue-300");
    renderExpertises();
    recomputeTimelineHighlight();
  }
});

/* =========================================================
   Ouvrir TOUT sur clic des titres principaux
   - Compétences comportementales → ouvre toutes les catégories + sous-parties
   - Formations et certifications → ouvre toutes les catégories
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
  // Ouvre tous les blocs de catégories
  zone.querySelectorAll("[data-cat]").forEach(head => {
    const catId = head.dataset.cat;
    const bloc = $(`#bloc-${catId}`);
    if (bloc) {
      bloc.classList.remove("hidden");
      const arrow = head.querySelector("span.text-blue-500");
      if (arrow) arrow.textContent = "▴";
      // S'assure que tout inside est visible
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
  }
  if (txt.includes("Formations et certifications")) {
    openAllInZone("formations","sous-");
  }
});

/* =========================================================
   Init
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  chargerParcours();
  chargerCompetencesComportementales();
  chargerCompetencesTechniques();
  chargerFormations();
  chargerExemplesSTAR();
});

/****************************
 * 🔄 Sauvegarde automatique
 ****************************/

// Sauvegarde des sélections
function sauvegarderEtat() {
  const etat = {
    competencesComportementales: Array.from(document.querySelectorAll('#zoneComportements .competence.active')).map(el => el.dataset.id),
    competencesTechniques: Array.from(document.querySelectorAll('#zoneExpertises .expertise-item')).map(el => el.textContent.trim()),
    sectionsOuvertes: Array.from(document.querySelectorAll('.toggle.open')).map(el => el.dataset.section)
  };
  localStorage.setItem('etatDashboard', JSON.stringify(etat));
}

// Restauration au chargement
function restaurerEtat() {
  const etat = JSON.parse(localStorage.getItem('etatDashboard'));
  if (!etat) return;

  // Restaurer compétences comportementales
  etat.competencesComportementales?.forEach(id => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.add('active');
  });

  // Restaurer compétences techniques
  etat.competencesTechniques?.forEach(tech => {
    const el = document.querySelector(`#zoneExpertises .expertise-item`);
    if (el && el.textContent.includes(tech)) el.classList.add('highlight');
  });

  // Restaurer sections ouvertes
  etat.sectionsOuvertes?.forEach(sec => {
    const section = document.querySelector(`[data-section="${sec}"]`);
    if (section) section.classList.add('open');
  });
}

// Écoute des clics pour mise à jour auto
document.addEventListener('click', (e) => {
  if (
    e.target.classList.contains('competence') ||
    e.target.classList.contains('expertise-item') ||
    e.target.classList.contains('toggle')
  ) {
    setTimeout(sauvegarderEtat, 200);
  }
});

// Restaurer à l’ouverture de la page
window.addEventListener('DOMContentLoaded', restaurerEtat);
