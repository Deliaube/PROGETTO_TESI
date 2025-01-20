/* Get the drop area element
const dropArea = document.getElementById('dropArea');

// Listen for drag events
dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover'); // Highlight the drop area
});

dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover'); // Remove highlight when leaving
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover'); // Remove highlight when image is dropped
    
    // Get the dragged image's ID from the dataTransfer object
    const imageId = e.dataTransfer.getData('text');
    const draggedImage = document.getElementById(imageId);

    // Append the dragged image to the drop area
    dropArea.appendChild(draggedImage);
});

// Add dragstart event listener to draggable images
const images = document.querySelectorAll('.draggable');
images.forEach(image => {
    image.addEventListener('dragstart', (e) => {
        // Set the image's ID as the dataTransfer data
        e.dataTransfer.setData('text', e.target.id);
    });
});
*/

// Seleziona tutte le aree di drop
const dropAreas = document.querySelectorAll('.drop-area');

// Aggiungi event listener a ciascuna area di drop
dropAreas.forEach(dropArea => {
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');

        // Ottieni l'immagine trascinata
        const imageId = e.dataTransfer.getData('text');
        const draggedImage = document.getElementById(imageId);

        // Controlla che l'immagine non sia già presente nell'area
        if (!dropArea.contains(draggedImage)) {
            dropArea.appendChild(draggedImage);
        }
    });
});

// Aggiungi il dragstart a ogni immagine
const images = document.querySelectorAll('.draggable');
images.forEach(image => {
    image.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text', e.target.id);
    });
});
