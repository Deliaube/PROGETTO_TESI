document.getElementById('navigateButton').addEventListener('click', function() {
    // Aggiunge la classe per la transizione
    document.body.classList.add('fade-out');
    
    // Reindirizza dopo il completamento della transizione (1s)
    setTimeout(function() {
      window.location.href = 'pagina2.html';
    }, 1000);
  });
  