(function () {
  'use strict';

  function applyVariazioneSafe(code) {
    if (typeof window.Variazione === 'function') {
      window.Variazione(code);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.initDosaggioDynamicPopups = function initDosaggioDynamicPopups() {
    const points = Array.from(document.querySelectorAll('.point'));
    const darkPopup = document.getElementById('darkPopup');
    const openPopups = {};
    let zTop = 1000;

    function loadNote(pointId) {
      if (window.DosaggioNote && typeof window.DosaggioNote.loadNote === 'function') {
        return window.DosaggioNote
          .loadNote(pointId)
          .then((noteResult) => {
            if (noteResult && typeof noteResult.text === 'string') {
              return noteResult.text;
            }
            return '';
          })
          .catch(() => '');
      }

      return Promise.resolve(localStorage.getItem(pointId) || '');
    }

    function saveNote(pointId, text, textarea) {
      if (window.DosaggioNote && typeof window.DosaggioNote.queueSave === 'function') {
        window.DosaggioNote.queueSave(pointId, text, textarea);
        return;
      }

      localStorage.setItem(pointId, text);
    }

    function showDarkPopup() {
      if (!darkPopup) {
        return;
      }

      darkPopup.style.top = `${Math.random() * 80}%`;
      darkPopup.style.left = `${Math.random() * 80}%`;
      darkPopup.style.display = 'block';

      setTimeout(() => {
        darkPopup.style.display = 'none';
      }, 2000);
    }

    function makeDraggable(el) {
      let startX;
      let startY;
      let originLeft;
      let originTop;

      el.addEventListener('mousedown', (event) => {
        if (event.target.tagName === 'TEXTAREA' || event.target.classList.contains('close')) {
          return;
        }

        zTop += 1;
        el.style.zIndex = String(zTop);

        startX = event.clientX;
        startY = event.clientY;
        originLeft = parseInt(el.style.left, 10) || 0;
        originTop = parseInt(el.style.top, 10) || 0;

        function onMove(moveEvent) {
          el.style.left = `${originLeft + moveEvent.clientX - startX}px`;
          el.style.top = `${originTop + moveEvent.clientY - startY}px`;
        }

        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    function closePopup(pointId, popup) {
      if (!popup) {
        return;
      }

      popup.remove();
      delete openPopups[pointId];
      applyVariazioneSafe('D');
      showDarkPopup();
    }

    function setPopupPosition(popup, anchorEl) {
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        const maxTop = Math.max(8, window.innerHeight - 190);
        const maxLeft = Math.max(8, window.innerWidth - 240);

        popup.style.top = `${clamp(rect.top + 10, 8, maxTop)}px`;
        popup.style.left = `${clamp(rect.left + 20, 8, maxLeft)}px`;
        return;
      }

      popup.style.top = `${10 + Math.random() * 60}%`;
      popup.style.left = `${5 + Math.random() * 80}%`;
    }

    function createPopup(pointId, message, anchorEl) {
      if (openPopups[pointId]) {
        zTop += 1;
        openPopups[pointId].style.zIndex = String(zTop);
        return openPopups[pointId];
      }

      const popup = document.createElement('div');
      popup.className = 'dynamic-popup';
      popup.dataset.pointId = pointId;

      const closeButton = document.createElement('span');
      closeButton.className = 'close';
      closeButton.innerHTML = '&times;';

      const messageEl = document.createElement('p');
      messageEl.className = 'popup-msg';
      messageEl.textContent = message;

      const textarea = document.createElement('textarea');
      textarea.placeholder = 'Write here...';

      popup.appendChild(closeButton);
      popup.appendChild(messageEl);
      popup.appendChild(textarea);

      zTop += 1;
      popup.style.zIndex = String(zTop);
      setPopupPosition(popup, anchorEl);

      document.body.appendChild(popup);
      popup.style.display = 'block';
      openPopups[pointId] = popup;

      closeButton.addEventListener('click', () => {
        closePopup(pointId, popup);
      });

      loadNote(pointId).then((text) => {
        if (openPopups[pointId] === popup) {
          textarea.value = text;
        }
      });

      textarea.addEventListener('input', () => {
        saveNote(pointId, textarea.value, textarea);
      });

      makeDraggable(popup);
      applyVariazioneSafe('C');

      return popup;
    }

    points.forEach((point) => {
      point.style.top = `${Math.random() * 80}%`;
      point.style.left = `${Math.random() * 95}%`;

      point.addEventListener('click', function () {
        createPopup(
          this.getAttribute('data-id'),
          this.getAttribute('data-message'),
          this
        );
      });
    });

    function startRepeatSequence() {
      points.forEach((point, index) => {
        const delay = index * 500;

        setTimeout(() => {
          const pointId = point.getAttribute('data-id');
          const message = point.getAttribute('data-message');
          const popup = createPopup(pointId, message, null);

          popup.style.top = `${10 + Math.random() * 60}%`;
          popup.style.left = `${5 + Math.random() * 80}%`;

          setTimeout(() => {
            if (openPopups[pointId] === popup) {
              popup.remove();
              delete openPopups[pointId];
            }
          }, 3000);
        }, delay);
      });
    }

    return {
      startRepeatSequence: startRepeatSequence
    };
  };
})();