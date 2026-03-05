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

(function initDragAndDrop() {
    if (window.__dragDropInitialized) {
        return;
    }
    window.__dragDropInitialized = true;

    const dropAreas = Array.from(document.querySelectorAll('.drop-area'));
    const images = Array.from(document.querySelectorAll('.draggable'));

    if (!dropAreas.length || !images.length) {
        return;
    }

    const clearDropHighlight = () => {
        dropAreas.forEach((area) => area.classList.remove('dragover'));
    };

    // Drag and drop desktop
    dropAreas.forEach((dropArea) => {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        });

        dropArea.addEventListener('dragleave', () => {
            dropArea.classList.remove('dragover');
        });

        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            clearDropHighlight();

            const imageId = e.dataTransfer.getData('text');
            const draggedImage = document.getElementById(imageId);

            if (draggedImage && !dropArea.contains(draggedImage)) {
                dropArea.appendChild(draggedImage);
            }
        });
    });

    images.forEach((image) => {
        image.addEventListener('dragstart', (e) => {
            if (!e.dataTransfer) {
                return;
            }
            e.dataTransfer.setData('text', e.target.id);
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    // Fallback touch per mobile
    let activeImage = null;
    let activeDropArea = null;
    let touchOffsetX = 0;
    let touchOffsetY = 0;
    let savedInlineStyle = null;

    const saveCurrentStyle = (element) => {
        savedInlineStyle = {
            position: element.style.position,
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            zIndex: element.style.zIndex,
            pointerEvents: element.style.pointerEvents,
            touchAction: element.style.touchAction,
        };
    };

    const restoreCurrentStyle = (element) => {
        if (!savedInlineStyle) {
            return;
        }

        element.style.position = savedInlineStyle.position;
        element.style.left = savedInlineStyle.left;
        element.style.top = savedInlineStyle.top;
        element.style.width = savedInlineStyle.width;
        element.style.zIndex = savedInlineStyle.zIndex;
        element.style.pointerEvents = savedInlineStyle.pointerEvents;
        element.style.touchAction = savedInlineStyle.touchAction;
    };

    const setTouchDraggingStyle = (element, touch) => {
        const rect = element.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;

        element.style.position = 'fixed';
        element.style.left = `${touch.clientX - touchOffsetX}px`;
        element.style.top = `${touch.clientY - touchOffsetY}px`;
        element.style.width = `${rect.width}px`;
        element.style.zIndex = '9999';
        element.style.pointerEvents = 'none';
        element.style.touchAction = 'none';
    };

    const findDropAreaAtPoint = (x, y) => {
        const target = document.elementFromPoint(x, y);
        return target ? target.closest('.drop-area') : null;
    };

    const onTouchStart = (e) => {
        if (e.touches.length !== 1) {
            return;
        }

        activeImage = e.currentTarget;
        const touch = e.touches[0];

        saveCurrentStyle(activeImage);
        setTouchDraggingStyle(activeImage, touch);

        e.preventDefault();
    };

    const onTouchMove = (e) => {
        if (!activeImage || e.touches.length !== 1) {
            return;
        }

        const touch = e.touches[0];
        activeImage.style.left = `${touch.clientX - touchOffsetX}px`;
        activeImage.style.top = `${touch.clientY - touchOffsetY}px`;

        const hoveredDropArea = findDropAreaAtPoint(touch.clientX, touch.clientY);
        if (activeDropArea !== hoveredDropArea) {
            if (activeDropArea) {
                activeDropArea.classList.remove('dragover');
            }
            if (hoveredDropArea) {
                hoveredDropArea.classList.add('dragover');
            }
            activeDropArea = hoveredDropArea;
        }

        e.preventDefault();
    };

    const onTouchEnd = (e) => {
        if (!activeImage) {
            return;
        }

        if (e.changedTouches && e.changedTouches.length) {
            const touch = e.changedTouches[0];
            const finalDropArea = findDropAreaAtPoint(touch.clientX, touch.clientY);
            if (finalDropArea) {
                activeDropArea = finalDropArea;
            }
        }

        if (activeDropArea && !activeDropArea.contains(activeImage)) {
            activeDropArea.appendChild(activeImage);
        }

        clearDropHighlight();
        restoreCurrentStyle(activeImage);

        activeImage = null;
        activeDropArea = null;
        savedInlineStyle = null;
    };

    images.forEach((image) => {
        image.addEventListener('touchstart', onTouchStart, { passive: false });
    });

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
})();
