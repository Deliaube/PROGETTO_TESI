
 // Sparkle Effect on Mouse Move
    document.addEventListener('mousemove', (e) => {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = e.clientX + 'px';
    sparkle.style.top = e.clientY + 'px';
    
    // Piccola variazione casuale per non farli uscire tutti dallo stesso punto
    const randomX = (Math.random() - 0.5) * 20;
    const randomY = (Math.random() - 0.5) * 20;
    sparkle.style.marginLeft = randomX + 'px';
    sparkle.style.marginTop = randomY + 'px';

    document.body.appendChild(sparkle);

    // Rimuoviamo l'elemento dopo l'animazione per non intasare il browser
    setTimeout(() => {
        sparkle.remove();
    }, 800);
});


