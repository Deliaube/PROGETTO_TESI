(function (window) {
  'use strict';

  function applyVariazioneSafe(code) {
    if (typeof window.Variazione === 'function') {
      window.Variazione(code);
    }
  }

  function install() {
    if (window.__controindicazioniRepeatResetInstalled) {
      return;
    }

    const repeatButton = document.getElementById('repeatBtn');
    const draggables = Array.from(document.querySelectorAll('.draggable'));

    if (!repeatButton || !draggables.length) {
      return;
    }

    window.__controindicazioniRepeatResetInstalled = true;

    const initialParents = draggables.map(function (image) {
      return {
        id: image.id,
        parent: image.parentElement
      };
    });

    function resetPinsToInitialPosition() {
      initialParents.forEach(function (entry) {
        const image = document.getElementById(entry.id);
        if (image && entry.parent) {
          entry.parent.appendChild(image);
        }
      });

      document.querySelectorAll('.drop-area').forEach(function (area) {
        area.classList.remove('dragover');
      });
    }

    function hideResultSection() {
      const resultSection = document.getElementById('resultSection');
      if (!resultSection) {
        return;
      }

      resultSection.style.display = 'none';
      resultSection.querySelectorAll('.result-text').forEach(function (text) {
        text.style.display = 'none';
      });
    }

    repeatButton.addEventListener('click', function () {
      resetPinsToInitialPosition();
      hideResultSection();
      applyVariazioneSafe('U');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})(window);