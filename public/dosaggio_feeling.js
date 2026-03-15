(function (window) {
  'use strict';

  const DEFAULT_ACTION = 'non mi piace';
  const CLOSE_BUTTON_SELECTOR = '.popup .close';
  const DARK_POPUP_SELECTOR = '#darkPopup';

  function getContextSafe() {
    if (
      window.FeelingService &&
      typeof window.FeelingService.getCurrentFeelingContext === 'function'
    ) {
      try {
        return window.FeelingService.getCurrentFeelingContext();
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function formatContext(context) {
    if (!context) {
      return 'context=not-available';
    }

    const combo = context.combinazione || 'N';
    const stato = context.statoPredominante || 'Neutrale';

    return 'context=' + stato + ' combo=' + combo;
  }

  function buildMissingMessage(reason, context) {
    const safeReason = String(reason || 'no-text').trim();
    return '[feeling.js] no text returned: ' + safeReason + ' | ' + formatContext(context);
  }

  function resolveDarkPopupTextElement(darkPopup) {
    if (!darkPopup) {
      return null;
    }

    const paragraph = darkPopup.querySelector('p');
    if (paragraph) {
      return paragraph;
    }

    return darkPopup;
  }

  async function resolveText(action, previousText) {
    const context = getContextSafe();

    if (
      !window.FeelingService ||
      typeof window.FeelingService.getFeelingEntryByAction !== 'function'
    ) {
      return buildMissingMessage('FeelingService-not-available', context);
    }

    const maxAttempts = 5;
    let sameTextCandidate = '';

    for (let index = 0; index < maxAttempts; index++) {
      try {
        const entry = await window.FeelingService.getFeelingEntryByAction(action, {
          path: 'feeling'
        });

        const candidate = entry && entry.testo ? String(entry.testo).trim() : '';
        if (!candidate) {
          continue;
        }

        if (candidate !== previousText) {
          return candidate;
        }

        sameTextCandidate = candidate;
      } catch (error) {
        const reason = error && error.message ? error.message : 'unknown-error';
        return buildMissingMessage(reason, context);
      }
    }

    if (sameTextCandidate) {
      return sameTextCandidate;
    }

    return buildMissingMessage('empty-result', context);
  }

  async function refreshDarkPopupText(state) {
    if (!state || !state.textElement) {
      return '';
    }

    const actionFromDom =
      state.closeButton.getAttribute('data-feeling-action') ||
      state.darkPopup.getAttribute('data-feeling-action') ||
      DEFAULT_ACTION;

    const pendingContext = getContextSafe();
    const pendingMessage = '[feeling.js] loading... | ' + formatContext(pendingContext);
    state.textElement.textContent = pendingMessage;

    const nextText = await resolveText(actionFromDom, state.lastText);
    state.textElement.textContent = nextText;
    state.lastText = nextText;
    return nextText;
  }

  function installForPage() {
    const closeButton = document.querySelector(CLOSE_BUTTON_SELECTOR);
    const darkPopup = document.querySelector(DARK_POPUP_SELECTOR);

    if (!closeButton || !darkPopup) {
      return;
    }

    const textElement = resolveDarkPopupTextElement(darkPopup);
    if (!textElement) {
      return;
    }

    const state = {
      closeButton: closeButton,
      darkPopup: darkPopup,
      textElement: textElement,
      lastText: String(textElement.textContent || '').trim()
    };

    // Warm-up cache, cosi al primo click la risposta e piu rapida.
    if (
      window.FeelingService &&
      typeof window.FeelingService.readFeelingData === 'function'
    ) {
      window.FeelingService.readFeelingData('feeling').catch(function () {
        // Il fallback viene gestito al click.
      });
    }

    // Listener in capture: parte prima del listener pagina che mostra il popup.
    closeButton.addEventListener(
      'click',
      function () {
        void refreshDarkPopupText(state);
      },
      true
    );

    window.DosaggioFeeling = {
      refresh: function () {
        return refreshDarkPopupText(state);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installForPage);
  } else {
    installForPage();
  }
})(window);
