document.addEventListener("DOMContentLoaded", () => {
    const confirmBtn = document.getElementById("confirmBtn");
    const dropAreas = document.querySelectorAll(".drop-area");
  
    const resultTexts = [
      document.getElementById("resultText1"),
      document.getElementById("resultText2"),
      document.getElementById("resultText3"),
      document.getElementById("resultText4")
    ];
  
    confirmBtn.addEventListener("click", () => {
      let maxCount = 0;
      let maxIndex = 0;
  
      dropAreas.forEach((area, index) => {
        const itemCount = area.querySelectorAll(".draggable").length;
        console.log(`Area ${index + 1} contiene ${itemCount} elementi`);
  
        if (itemCount > maxCount) {
          maxCount = itemCount;
          maxIndex = index;
        }
      });
  
      resultTexts.forEach((text, index) => {
        text.style.display = index === maxIndex ? "block" : "none";
      });
      
      console.log("Il file counter.js è stato caricato correttamente.");

      console.log(`Mostrando il risultato ${maxIndex + 1}`);
      document.getElementById("resultSection").style.display = "flex";
    });
  });
  