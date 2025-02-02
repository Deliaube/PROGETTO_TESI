/*SCRIPT DROP DOWN MENù - LATERALE DOVE DENTRO STA IL RESET BUTTON*/
      /* When the user clicks on the button, 
      toggle between hiding and showing the dropdown content */
      function myFunction() {
        document.getElementById("myDropdown").classList.toggle("show");
      }
      
      // Close the dropdown if the user clicks outside of it
      window.onclick = function(event) {
        if (!event.target.matches('.dropbtn')) {
          var dropdowns = document.getElementsByClassName("dropdown-content");
          var i;
          for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
              openDropdown.classList.remove('show');
            }
          }
        }
      }

/*SCRIPT DEL RESET*/ 

function resetChoices() {
    try {
      // Verifica se la chiave esiste prima di rimuoverla
      if (localStorage.getItem('totalSum') !== null) {
        localStorage.removeItem('totalSum');
      }
      
      // Ricarica la pagina senza cache per evitare problemi
      window.location.reload(true);
    } catch (error) {
      console.error("Errore durante il reset:", error);
      alert("Si è verificato un errore durante il reset. Riprova.");
    }
  }
  
/*UPDATE IMAGE BASED ON SUM*/
function updateImageBasedOnSum() {
    // Ottieni la somma salvata
    const totalSum = localStorage.getItem('totalSum') || '';
  
    // Seleziona l'immagine e il messaggio
    const placeholder = document.getElementById('placeholder');
    const message = document.getElementById('message');
  
    // Controllo per le combinazioni - cambia immagini con compatibili 
    if (totalSum === 'AAA') {
      placeholder.src = 'images/microwave.png';
      message.textContent = 'Combinazione AAA scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum === 'ABC') {
      placeholder.src = 'images/closet.png';
      message.textContent = 'Combinazione ABC scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum === 'BBB') {
      placeholder.src = 'images/pill.png';
      message.textContent = 'Combinazione BBB scelta!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else if (totalSum.includes('A') && totalSum.includes('B') && totalSum.includes('C')) {
      placeholder.src = 'images/Designer(8).jpeg';
      message.textContent = 'Tutte le opzioni sono state selezionate!';
      placeholder.style.width = '300px';
      placeholder.style.height = 'auto';
    } else {
      message.textContent = 'Completa le scelte per vedere il risultato.';
    }
  }
  
  // Esegui al caricamento
  window.onload = updateImageBasedOnSum;
