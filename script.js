// =========================
// ÉTAT GLOBAL
// =========================
let competencesSelectionnees = [];   // pour "Détails des comportements"
let expertisesSelectionnees = [];    // pour "Détails des expertises techniques"

const colonne1   = document.getElementById("colonne1");
const colonne2   = document.getElementById("colonne2");
const expertise1 = document.getElementById("expertise1");
const expertise2 = document.getElementById("expertise2");

// =========================
// OUTILS D’AFFICHAGE
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
        ${
          Array.isArray(item.comportements) && item.comportements.length
            ? `<ul class="list-disc ml-5 mt-2 text-sm text-gray-700">${item.comportements.map(c => `<li>${c}</li>`).join("")}</ul>`
            : ""
        }
      </div>`;
  });
}

function rafraichirAffichageExpertises() {
  expertise1.innerHTML = "";
  expertise2.innerHTML = "";

  expertisesSelectionnees.slice(0, 2).forEach((exp, index) => {
    const cible = index === 0 ? expertise1 : expertise2;
    cible.innerHTML = `
      <div class="p-2 bg-white rounded shadow-sm border relative">
        <button class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xs remove-exp" data-nom="${exp.nom}">❌</button>
        <h4 class="font-semibold text-green-700">${exp.nom}</h4>
        ${exp.description ? `<p class="text-xs text-gray-600">${exp.description}</p>` : ""}
      </div>`;
  });
}

// Surbrillance du parcours quand expertise technique sélectionnée
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
    if (!response.ok) throw new Error("Erreur de chargement du JSON");
    const data = await response.json();

    timeline.innerHTML = data.map(item => `
      <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:bg-blue-50 transition"
           data-titre="${item.titre}">
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

  } catch (error) {
    console.error("Erreur de chargement du parcours :", error);
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
    if (!response.ok) throw new Error("Erreur de chargement du JSON");
    const data = await response.json();

    const html = Object.keys(data).map(cat => {
      const val = data[cat];
      if (!Array.isArray(val)) return ""; // on ignore les clés non-listes

      // tolère "actif" ou "ACTIF"
      const actifs = val.filter(c => ((c.actif ?? c.ACTIF) || "").toString().toLowerCase() === "oui");
      if (!actifs.length) return "";

      return `
        <div class="border-b pb-2 mb-2">
          <h4 class="font-semibold text-blue-700 flex justify-between items-center cursor-pointer hover:text-blue-800"
              data-cat="${cat}">
            <span>${cat}</span>
            <span class="text-blue-600 text-sm font-bold">▼</span>
          </h4>
          <div id="bloc-${cat.replace(/\s+/g, '-')}" class="hidden ml-3 mt-1">
            ${actifs.map((c, i) => `
              <div class="competence-item mb-2 bg-gray-50 p-2 rounded hover:bg-blue-50 cursor-pointer transition"
                   data-id="${c.id ?? cat + '-' + i}"
                   data-nom="${c.nom}" data-description="${c.description}"
                   data-comportements='${JSON.stringify(c.comportements ?? [])}'>
                <p class="font-medium">${c.nom}</p>
                <p class="text-xs text-gray-600">${c.description}</p>
              </div>`).join("")}
          </div>
        </div>
      `;
    }).join("");

    zone.innerHTML = html || `<p class="text-gray-400 italic">Aucune compétence active trouvée.</p>`;

  } catch (error) {
    console.error("Erreur chargement compétences comportementales:", error);
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
    if (!response.ok) throw new Error("Erreur de chargement du JSON");
    const data = await response.json();

    // accepte soit { expertises_techniques: [...] } soit simple tableau
    const arr = Array.isArray(data) ? data : (data.expertises_techniques || []);
    zone.innerHTML = arr.map((c, i) => {
      const nom = c.bouton ?? c.nom ?? `Expertise ${i+1}`;
      const description = c.description ?? "";
      return `
        <button class="tech-btn bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium transition"
                data-nom="${nom}" data-description="${description}">
          ${nom}
        </button>`;
    }).join("");

    // clics techniques → ajout/suppression + surbrillance
    document.querySelectorAll(".tech-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const nom = btn.dataset.nom;
        const description = btn.dataset.description;
        const idx = expertisesSelectionnees.findIndex(e => e.nom === nom);

        if (idx === -1) {
          if (expertisesSelectionnees.length < 2) {
            expertisesSelectionnees.push({ nom, description });
            btn.classList.add("bg-blue-300");
            rafraichirAffichageExpertises();
            surbrillanceParcours(nom);
          }
          // si déjà 2, on ignore (comportement demandé initialement)
        } else {
          expertisesSelectionnees.splice(idx, 1);
          btn.classList.remove("bg-blue-300");
          rafraichirAffichageExpertises();
          retirerSurbrillance();
        }
      });
    });

  } catch (error) {
    console.error("Erreur chargement compétences techniques:", error);
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des compétences techniques.</p>`;
  }
}

// =========================
// FORMATIONS & CERTIFICATIONS
// =========================
async function chargerFormationsCertifications() {
  const zone = document.getElementById("formations");
  zone.innerHTML = `<p class="text-gray-500 italic">Chargement des formations...</p>`;

  try {
    const response = await fetch("formations_certifications.json");
    if (!response.ok) throw new Error("Erreur de chargement du JSON");
    const data = await response.json();

    zone.innerHTML = data.map(cat => `
      <div class="border-b pb-2 mb-2">
        <h4 class="font-semibold text-blue-700 flex justify-between items-center cursor-pointer hover:text-blue-800"
            data-cat="${cat.categorie}">
          <span>${cat.categorie}</span>
          <span class="text-blue-600 text-sm font-bold">▼</span>
        </h4>
        <div id="sous-${cat.categorie.replace(/\s+/g, '-')}" class="hidden ml-3 mt-1">
          ${cat.sous_sections.map(f => `
            <div class="mb-2">
              <button class="formation-btn text-left w-full hover:text-blue-700"
                      data-titre="${f.titre}" data-periode="${f.periode}"
                      data-details='${JSON.stringify(f.details ?? [])}'>
                <strong>${f.titre}</strong>
                <span class="text-gray-500 text-xs">(${f.periode})</span>
              </button>
            </div>`).join("")}
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error("Erreur chargement formations:", error);
    zone.innerHTML = `<p class="text-red-500">Erreur de chargement des formations et certifications.</p>`;
  }
}

// =========================
/* INTERACTIONS GLOBALES */
// =========================
document.addEventListener("click", e => {
  // Parcours : ouvrir/fermer
  const box = e.target.closest("[data-titre]");
  if (box) {
    const titre = box.dataset.titre;
    const bloc = document.getElementById(`details-${titre.replace(/\s+/g, '-')}`);
    const arrow = box.querySelector("span.text-blue-600");
    bloc.classList.toggle("hidden");
    arrow.textContent = bloc.classList.contains("hidden") ? "▼" : "▲";
  }

  // En-têtes catégories (comp. comportementales / formations)
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
  }

  // Sélection d'une compétence comportementale
  const competenceDiv = e.target.closest(".competence-item");
  if (competenceDiv) {
    const id = competenceDiv.dataset.id;
    const nom = competenceDiv.dataset.nom;
    const description = competenceDiv.dataset.description;
    const comportements = JSON.parse(competenceDiv.dataset.comportements || "[]");

    const i = competencesSelectionnees.findIndex(c => c.id === id);
    if (i === -1) {
      if (competencesSelectionnees.length < 2) {
        competencesSelectionnees.push({ id, nom, description, comportements });
        competenceDiv.classList.add("bg-blue-100", "border", "border-blue-400");
        rafraichirAffichageColonnes();
      }
      // si déjà 2, on ignore (comportement demandé initialement)
    } else {
      competencesSelectionnees.splice(i, 1);
      competenceDiv.classList.remove("bg-blue-100", "border", "border-blue-400");
      rafraichirAffichageColonnes();
    }
  }

  // Click sur une formation → affiche dans "Détails des comportements"
  if (e.target.classList.contains("formation-btn")) {
    const titre = e.target.dataset.titre;
    const periode = e.target.dataset.periode;
    const details = JSON.parse(e.target.dataset.details || "[]");
    competencesSelectionnees = [{ id: `formation-${titre}`, nom: titre, description: periode, comportements: details }];
    rafraichirAffichageColonnes();
  }

  // Boutons de suppression (croix)
  if (e.target.classList.contains("remove-btn")) {
    const id = e.target.dataset.id;
    competencesSelectionnees = competencesSelectionnees.filter(c => c.id !== id);
    rafraichirAffichageColonnes();
  }
  if (e.target.classList.contains("remove-exp")) {
    const nom = e.target.dataset.nom;
    expertisesSelectionnees = expertisesSelectionnees.filter(e2 => e2.nom !== nom);
    document.querySelectorAll(`.tech-btn[data-nom="${nom}"]`).forEach(btn => btn.classList.remove("bg-blue-300"));
    rafraichirAffichageExpertises();
    retirerSurbrillance();
  }
});

// Toggles et resets à droite des titres
document.getElementById("toggleParcours").addEventListener("click", () => {
  const zone = document.getElementById("timeline");
  const bouton = document.getElementById("toggleParcours");
  zone.classList.toggle("hidden");
  bouton.textContent = zone.classList.contains("hidden") ? "▲" : "▼";
});
document.getElementById("toggleComportementales").addEventListener("click", () => {
  const zone = document.getElementById("competencesComportementales");
  const bouton = document.getElementById("toggleComportementales");
  zone.classList.toggle("hidden");
  bouton.textContent = zone.classList.contains("hidden") ? "▲" : "▼";
});
document.getElementById("toggleTechniques").addEventListener("click", () => {
  const zone = document.getElementById("competencesTechniques");
  const bouton = document.getElementById("toggleTechniques");
  zone.classList.toggle("hidden");
  bouton.lastChild.textContent = zone.classList.contains("hidden") ? "▲" : "▼";
});
document.getElementById("toggleFormations").addEventListener("click", () => {
  const zone = document.getElementById("formations");
  const bouton = document.getElementById("toggleFormations");
  zone.classList.toggle("hidden");
  bouton.textContent = zone.classList.contains("hidden") ? "▲" : "▼";
});
document.getElementById("resetSelection").addEventListener("click", () => {
  competencesSelectionnees = [];
  rafraichirAffichageColonnes();
});
document.getElementById("resetExpertises").addEventListener("click", () => {
  expertisesSelectionnees = [];
  document.querySelectorAll(".tech-btn").forEach(btn => btn.classList.remove("bg-blue-300"));
  rafraichirAffichageExpertises();
  retirerSurbrillance();
});

// =========================
// INITIALISATION
// =========================
window.addEventListener("DOMContentLoaded", () => {
  chargerParcoursProfessionnel();
  chargerCompetencesComportementales();
  chargerCompetencesTechniques();
  chargerFormationsCertifications();
});
