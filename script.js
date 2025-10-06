// =========================
// ÉTAT GLOBAL
// =========================
let competencesSelectionnees = [];
let expertisesSelectionnees = [];

const colonne1   = document.getElementById("colonne1");
const colonne2   = document.getElementById("colonne2");
const expertise1 = document.getElementById("expertise1");
const expertise2 = document.getElementById("expertise2");

// =========================
// AFFICHAGE COMPORTEMENTS
// =========================
function rafraichirAffichageColonnes() {
  colonne1.innerHTML = "";
  colonne2.innerHTML = "";

  competencesSelectionnees.slice(0, 2).forEach((item, index) => {
    const cible = index === 0 ? colonne1 : colonne2;
    cible.innerHTML = `
      <div class="p-2 bg-white rounded shadow-sm border relative">
        <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs remove-btn" data-id="${item.id}">❌</button>
        <h4 class="font-semibold">${item.nom}</h4>
        ${item.description ? `<p class="text-xs text-gray-500">${item.description}</p>` : ""}
        ${Array.isArray(item.comportements) && item.comportements.length
          ? `<ul class="list-disc ml-5 mt-2 text-sm text-gray-700">${item.comportements.map(c => `<li>${c}</li>`).join("")}</ul>`
          : ""}
      </div>`;
  });
}

// =========================
// AFFICHAGE EXPERTISES
// =========================
function rafraichirAffichageExpertises() {
  expertise1.innerHTML = "";
  expertise2.innerHTML = "";

  expertisesSelectionnees.slice(0, 2).forEach((exp, index) => {
    const cible = index === 0 ? expertise1 : expertise2;
    const titre  = exp.titre  ?? "—";
    const depuis = exp.depuis ?? "—";

    cible.innerHTML = `
      <div class="p-2 bg-white rounded shadow-sm border relative">
        <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs remove-exp" data-nom="${exp.nom}">❌</button>
        <p class="font-semibold text-green-700">
          ${exp.nom}
          ${titre !== "—" || depuis !== "—"
            ? `<span class="text-gray-600 text-sm"> — ${titre !== "—" ? titre : ""}${depuis !== "—" ? " — Depuis : " + depuis : ""}</span>`
            : ""}
        </p>
        ${exp.description ? `<p class="text-xs text-gray-600 mt-1">${exp.description}</p>` : ""}
      </div>`;
  });
}

function surbrillanceParcours(motCle) {
  document.querySelectorAll("#timeline > div").forEach(div => {
    const texte = div.textContent.toLowerCase();
    if (texte.includes(motCle.toLowerCase())) {
      div.classList.add("bg-yellow-100", "border-yellow-400");
    }
  });
}
function retirerSurbrillance() {
  document.querySelectorAll("#timeline > div").forEach(div =>
    div.classList.remove("bg-yellow-100", "border-yellow-400")
  );
}

// =========================
// PARCOURS PROFESSIONNEL
// =========================
async function chargerParcoursProfessionnel() {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = `<p class="text-gray-500 italic">Chargement du parcours professionnel...</p>`;

  try {
    const response = await fetch("parcours.json");
    const data = await response.json();

    timeline.innerHTML = data.map(item => `
      <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition">
        <h3 class="font-bold text-blue-700 flex justify-between items-center text-sm md:text-base select-none">
          <span>${item.titre}</span>
          <span class="text-blue-600 font-bold text-sm">▼</span>
        </h3>
        <div id="details-${item.titre.replace(/\s+/g, '-')}" class="hidden mt-2 text-sm text-gray-700">
          ${item.details.map(d => `<p class="mb-1">${d}</p>`).join("")}
          ${item.faits_sailants?.length ? `
            <h4 class="font-semibold mt-2 text-gray-800">Faits saillants :</h4>
            <ul class="list-disc ml-6 mt-1">
              ${item.faits_sailants.map(f => `<li>${f}</li>`).join("")}
            </ul>` : ""}
        </div>
      </div>
    `).join('');

  } catch {
    timeline.innerHTML = `<p class="text-red-500">Erreur de chargement du parcours professionnel.</p>`;
  }
}

// =========================
// COMPÉTENCES COMPORTEMENTALES
// =========================
async function chargerCompetencesComportementales() {
  const zone = document.getElementById("competencesComportementales");
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences comportementales...</p>`;

  try {
    const response = await fetch("competences.json");
    const data = await response.json();

    const html = Object.keys(data).map(cat => {
      const val = data[cat];
      if (!Array.isArray(val)) return "";
      const actifs = val.filter(c => ((c.actif ?? c.ACTIF) || "").toString().toLowerCase() === "oui");
      if (!actifs.length) return "";

      return `
        <div class="border-b pb-2 mb-2">
          <h4 class="font-semibold text-blue-700 flex justify-between items-center cursor-pointer hover:text-blue-800"
              data-cat="${cat}">
            <span>${cat}</span><span class="text-blue-600 text-sm font-bold">▼</span>
          </h4>
          <div id="bloc-${cat.replace(/\s+/g, '-')}" class="hidden ml-3 mt-1">
            ${actifs.map((c, i) => `
              <div class="competence-item mb-2 bg-gray-50 p-2 rounded hover:bg-blue-50 cursor-pointer transition"
                   data-id="${c.id ?? cat + '-' + i}" data-nom="${c.nom}" data-description="${c.description}"
                   data-comportements='${JSON.stringify(c.comportements ?? [])}'>
                <p class="font-medium">${c.nom}</p>
                <p class="text-xs text-gray-600">${c.description}</p>
              </div>`).join("")}
          </div>
        </div>`;
    }).join("");

    zone.innerHTML = html || `<p class="text-gray-400 italic">Aucune compétence active trouvée.</p>`;

  } catch {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences comportementales.</p>`;
  }
}

// =========================
// COMPÉTENCES TECHNIQUES
// =========================
async function chargerCompetencesTechniques() {
  const zone = document.getElementById("competencesTechniques");
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des compétences techniques...</p>`;

  try {
    const response = await fetch("competences_techniques.json");
    const data = await response.json();

    const arr = Array.isArray(data) ? data : (data.expertises_techniques || []);
    zone.innerHTML = arr.map((c, i) => `
      <button class="tech-btn bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium transition"
              data-nom="${c.bouton ?? c.nom ?? `Expertise ${i + 1}`}"
              data-description="${c.description ?? ""}"
              data-titre="${c.titre ?? ""}"
              data-depuis="${c.depuis ?? ""}">
        ${c.bouton ?? c.nom ?? `Expertise ${i + 1}`}
      </button>
    `).join("");

    document.querySelectorAll(".tech-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nom = btn.dataset.nom;
        const description = btn.dataset.description;
        const titre = btn.dataset.titre;
        const depuis = btn.dataset.depuis;
        const idx = expertisesSelectionnees.findIndex(e => e.nom === nom);

        if (idx === -1) {
          if (expertisesSelectionnees.length < 2) {
            expertisesSelectionnees.push({ nom, description, titre, depuis });
            btn.classList.add("bg-blue-300");
            rafraichirAffichageExpertises();
            surbrillanceParcours(nom);
          }
        } else {
          expertisesSelectionnees.splice(idx, 1);
          btn.classList.remove("bg-blue-300");
          rafraichirAffichageExpertises();
          retirerSurbrillance();
        }
      });
    });

  } catch {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences techniques.</p>`;
  }
}

// =========================
// FORMATIONS
// =========================
async function chargerFormationsCertifications() {
  const zone = document.getElementById("formations");
  try {
    const r = await fetch("formations_certifications.json");
    const data = await r.json();
    zone.innerHTML = data.map(cat => `
      <div class="border-b pb-2 mb-2">
        <h4 class="font-semibold text-blue-700 flex justify-between items-center cursor-pointer" data-cat="${cat.categorie}">
          <span>${cat.categorie}</span><span class="text-blue-600 text-sm font-bold">▼</span>
        </h4>
        <div id="sous-${cat.categorie.replace(/\s+/g, '-')}" class="hidden ml-3 mt-1">
          ${cat.sous_sections.map(f => `
            <button class="formation-btn text-left w-full hover:text-blue-700"
                    data-titre="${f.titre}" data-periode="${f.periode}">
              <strong>${f.titre}</strong> <span class="text-gray-500 text-xs">(${f.periode})</span>
            </button>`).join("")}
        </div>
      </div>`).join("");
  } catch {
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement formations.</p>`;
  }
}

// =========================
// GESTION DES CLICS GLOBAUX
// =========================
document.addEventListener("click", (e) => {
  // Parcours
  const blocParcours = e.target.closest("#timeline > div");
  if (blocParcours) {
    const details = blocParcours.querySelector("div[id^='details-']");
    const arrow = blocParcours.querySelector("h3 span.text-blue-600");
    if (details && arrow) {
      details.classList.toggle("hidden");
      arrow.textContent = details.classList.contains("hidden") ? "▼" : "▲";
      blocParcours.classList.toggle("bg-yellow-100");
      blocParcours.classList.toggle("border-yellow-400");
    }
    return;
  }

  // Ouvrir/fermer catégories (compétences & formations)
  const catHeader = e.target.closest("[data-cat]");
  if (catHeader) {
    const cat = catHeader.dataset.cat;
    const bloc = document.getElementById(`bloc-${cat.replace(/\s+/g, '-')}`) ||
                 document.getElementById(`sous-${cat.replace(/\s+/g, '-')}`);
    if (bloc) {
      const arrow = catHeader.querySelector("span.text-blue-600");
      bloc.classList.toggle("hidden");
      arrow.textContent = bloc.classList.contains("hidden") ? "▼" : "▲";
    }
    return;
  }

  // Sélection compétence comportementale
  const competenceDiv = e.target.closest(".competence-item");
  if (competenceDiv) {
    const id = competenceDiv.dataset.id;
    const nom = competenceDiv.dataset.nom;
    const description = competenceDiv.dataset.description;
    const comportements = JSON.parse(competenceDiv.dataset.comportements || "[]");

    const index = competencesSelectionnees.findIndex(c => c.id === id);
    if (index === -1) {
      competencesSelectionnees.push({ id, nom, description, comportements });
      competenceDiv.classList.add("bg-blue-100", "border", "border-blue-400");
    } else {
      competencesSelectionnees.splice(index, 1);
      competenceDiv.classList.remove("bg-blue-100", "border", "border-blue-400");
    }
    rafraichirAffichageColonnes();
    return;
  }

  // Suppressions
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;
    competencesSelectionnees = competencesSelectionnees.filter(c => c.id !== id);
    rafraichirAffichageColonnes();
    return;
  }

  if (e.target.classList.contains("remove-exp")) {
    const nom = e.target.dataset.nom;
    expertisesSelectionnees = expertisesSelectionnees.filter(e2 => e2.nom !== nom);
    rafraichirAffichageExpertises();
    retirerSurbrillance();
    return;
  }
});

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
  chargerParcoursProfessionnel();
  chargerCompetencesComportementales();
  chargerCompetencesTechniques();
  chargerFormationsCertifications();
});
