// Simulation temporaire du JSON pour le parcours
const parcoursData = [
  {
    annee: "2024-2025",
    projets: [
      {
        titre: "Responsable produit – équipes GIA",
        details: "Pilotage des feuilles de route Entra ID, Active Directory et CyberArk. Alignement architecture/Plan 2035."
      },
      {
        titre: "Projet CyberArk 12.2",
        details: "Migration vers nouvelle version et intégration MFA pour comptes à privilèges."
      }
    ]
  },
  {
    annee: "2022-2023",
    projets: [
      {
        titre: "Modernisation Entra ID",
        details: "Refonte de la gouvernance des identités cloud et intégration AWS."
      }
    ]
  }
];

// Charger la section Parcours
function chargerParcours() {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = parcoursData.map(periode => `
    <div class="bg-white p-4 rounded shadow">
      <h3 class="text-lg font-bold mb-2 flex items-center justify-between">
        ${periode.annee}
        <button class="text-blue-600 toggle-details" data-annee="${periode.annee}">▼</button>
      </h3>
      <div id="details-${periode.annee}" class="hidden">
        ${periode.projets.map(p => `
          <div class="border-t border-gray-200 mt-2 pt-2">
            <strong>${p.titre}</strong>
            <p>${p.details}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Gestion du dépliage
document.addEventListener("click", e => {
  if (e.target.classList.contains("toggle-details")) {
    const annee = e.target.dataset.annee;
    const section = document.getElementById(`details-${annee}`);
    section.classList.toggle("hidden");
    e.target.textContent = section.classList.contains("hidden") ? "▼" : "▲";
  }
});

window.addEventListener("DOMContentLoaded", chargerParcours);