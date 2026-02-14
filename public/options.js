function updateSum(value) {
    // Recupera la somma attuale da localStorage
    const totalSum = localStorage.getItem('totalSum') || '';
    
    // Aggiorna la somma concatenando la scelta fatta
    const newSum = totalSum + value;
    
    // Salva la nuova somma in localStorage
    localStorage.setItem('totalSum', newSum);
    
    console.log(`Somma aggiornata: ${newSum}`); // Log per debugging
    
    // Reindirizza alla homepage (index.html)
    window.location.href = 'new_index_CHANGES REVISED.html';
  }
