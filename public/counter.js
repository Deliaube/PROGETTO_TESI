document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirmBtn");
    const resultSection = document.getElementById("resultSection");
    const dropAreas = document.querySelectorAll(".drop-area");
  
    const resultTexts = [
      document.getElementById("resultText1"),
      document.getElementById("resultText2"),
      document.getElementById("resultText3"),
      document.getElementById("resultText4"),
      document.getElementById("resultText5")
    ];

    if (!confirmBtn || !resultSection || !dropAreas.length) {
      return;
    }

    const getAreaCounts = () => Array.from(dropAreas, (area) => {
      return area.querySelectorAll(".draggable").length;
    });

    const areAllCountsEqual = (counts) => {
      return counts.length > 0 && counts.every((count) => count === counts[0]);
    };
  
    confirmBtn.addEventListener("click", () => {
      const counts = getAreaCounts();
      let maxCount = -1;
      let maxIndex = 0;
  
      counts.forEach((itemCount, index) => {
        console.log(`Area ${index + 1} contiene ${itemCount} elementi`);
  
        if (itemCount > maxCount) {
          maxCount = itemCount;
          maxIndex = index;
        }
      });

      const shouldShowBalancedResult = areAllCountsEqual(counts) && Boolean(resultTexts[4]);
      const resultIndexToShow = shouldShowBalancedResult ? 4 : maxIndex;
  
      resultTexts.forEach((text, index) => {
        if (!text) {
          return;
        }

        text.style.display = index === resultIndexToShow ? "block" : "none";
      });
      
      console.log("Il file counter.js è stato caricato correttamente.");

      console.log(`Mostrando il risultato ${resultIndexToShow + 1}`);
      resultSection.style.display = "flex";
    });
  });
  