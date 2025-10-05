// =========================
// VARIABLES GLOBALES
// =========================
const colonne1 = document.getElementById("colonne1");
const colonne2 = document.getElementById("colonne2");

function afficherDansColonnes(titre, contenuHTML) {
  const cible = colonne1.innerHTML === "" ? colonne1 : colonne2;
  cible.innerHTML = `
    <div class="p-2 border-b">
      <h4 class="font-semibold">${titre}</h4>
      ${contenuHTML}
    </div>`;
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

    // Génération du contenu interactif
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

// Gestion du clic sur toute la boîte
document.addEventListener("click", e => {
  const box = e.target.closest("[data-titre]");
  if (box) {
    const titre = box.dataset.titre;
    const bloc = document.getElementById(`details-${titre.replace(/\s+/g, '-')}`);
    const arrow = box.querySelector("span.text-blue-600");
    bloc.classList.toggle("hidden");
    arrow.textContent = bloc.classList.contains("hidden") ? "▼" : "▲";
  }
});

// =========================
// FORMATIONS ET CERTIFICATIONS
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
                      data-details='${JSON.stringify(f.details)}'>
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

// Toggle sous-sections formations
document.addEventListener("click", e => {
  const catHeader = e.target.closest("[data-cat]");
  if (catHeader) {
    const cat = catHeader.dataset.cat;
    const bloc = document.getElementById(`sous-${cat.replace(/\s+/g, '-')}`);
    const arrow = catHeader.querySelector("span.text-blue-600");
    bloc.classList.toggle("hidden");
    arrow.textContent = bloc.classList.contains("hidden") ? "▼" : "▲";
  }

  if (e.target.classList.contains("formation-btn")) {
    const titre = e.target.dataset.titre;
    const periode = e.target.dataset.periode;
    const details = JSON.parse(e.target.dataset.details);
    afficherDansColonnes(
      titre,
      `<p class="text-xs text-gray-500">${periode}</p>
       <ul class="list-disc ml-5 mt-2 text-sm text-gray-700">
         ${details.map(d => `<li>${d}</li>`).join("")}
       </ul>`
    );
  }
});

// Toggle global de la section "Formations et certifications"
document.getElementById("toggleFormations").addEventListener("click", () => {
  const zone = document.getElementById("formations");
  const bouton = document.getElementById("toggleFormations");
  zone.classList.toggle("hidden");
  bouton.textContent = zone.classList.contains("hidden") ? "▲" : "▼";
});

// =========================
// INITIALISATION
// =========================
window.addEventListener("DOMContentLoaded", () => {
  chargerParcoursProfessionnel();
  chargerFormationsCertifications();
});
