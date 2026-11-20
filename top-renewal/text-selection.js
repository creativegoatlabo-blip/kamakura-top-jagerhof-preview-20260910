(() => {
  const dialog = document.querySelector('#menu-dialog');
  const controls = 'a[href], button, summary';
  const selectableText = controls + ', h1, h2, h3, h4, p, dt, dd, li, time, figcaption, small, .site-notice span';
  const editable = 'input, textarea, select, [contenteditable="true"]';

  for (const link of document.querySelectorAll('a[href]:not([draggable])')) {
    if (link.textContent.trim()) link.draggable = false;
  }

  function selectText(element) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection.toString().trim();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const supplyText = event => {
        event.clipboardData.setData('text/plain', text);
        event.preventDefault();
      };
      document.addEventListener('copy', supplyText);
      try {
        return document.execCommand('copy');
      } finally {
        document.removeEventListener('copy', supplyText);
      }
    }
  }

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'selection-copy';
  copyButton.hidden = true;
  copyButton.setAttribute('popover', 'manual');
  copyButton.setAttribute('aria-live', 'polite');
  let textToCopy = '';
  let press = null;

  function hideCopyButton() {
    if (copyButton.hidden) return;
    copyButton.hidePopover?.();
    copyButton.hidden = true;
    textToCopy = '';
  }

  function showCopyButton(gesture) {
    if (gesture.held || gesture.moved || !gesture.target.isConnected) return;
    textToCopy = selectText(gesture.target);
    if (gesture.control && gesture.target.querySelector('[aria-hidden="true"]')) {
      const label = gesture.target.cloneNode(true);
      label.querySelectorAll('[aria-hidden="true"]').forEach(element => element.remove());
      textToCopy = label.textContent.trim();
    }
    if (!textToCopy) return;

    gesture.held = true;
    copyButton.textContent = 'コピー';
    (dialog.open ? dialog : document.body).append(copyButton);
    copyButton.hidden = false;
    copyButton.showPopover?.();
  }

  copyButton.addEventListener('click', async () => {
    if (!textToCopy) return;
    copyButton.textContent = (await copyText(textToCopy)) ? 'コピーしました' : 'コピーできませんでした';
  });
  dialog.addEventListener('close', hideCopyButton);

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey ||
        !(event.ctrlKey || event.metaKey) || event.target.closest(editable)) return;
    const key = event.key.toLowerCase();
    if (key === 'a') {
      event.preventDefault();
      hideCopyButton();
      selectText(dialog.open ? dialog : document.body);
    }
    if (key === 'c' && event.ctrlKey && !event.metaKey && navigator.platform.startsWith('Mac')) {
      const text = window.getSelection().toString();
      if (text) {
        event.preventDefault();
        copyText(text);
      }
    }
  });

  document.addEventListener('pointerdown', event => {
    clearTimeout(press?.timer);
    press = null;
    if (event.target === copyButton) return;
    hideCopyButton();
    if (!event.isPrimary || event.button !== 0 || event.target.closest(editable)) return;

    const touch = event.pointerType === 'touch';
    const target = event.target.closest(touch ? selectableText : controls);
    if (!target?.textContent.trim()) return;
    const gesture = {
      target, touch, control: target.matches(controls), pointerId: event.pointerId,
      x: event.clientX, y: event.clientY, moved: false, held: false,
    };
    if (touch) gesture.timer = setTimeout(() => showCopyButton(gesture), 480);
    press = gesture;
  }, true);

  const distance = (event, gesture) => Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y);
  document.addEventListener('pointermove', event => {
    if (press?.touch && press.pointerId === event.pointerId && distance(event, press) >= 9) {
      press.moved = true;
      clearTimeout(press.timer);
    }
  }, { capture: true, passive: true });

  for (const type of ['pointerup', 'pointercancel']) {
    document.addEventListener(type, event => {
      if (press?.pointerId === event.pointerId) clearTimeout(press.timer);
    }, true);
  }

  document.addEventListener('contextmenu', event => {
    if (!press?.touch || press.moved || !press.target.contains(event.target)) return;
    event.preventDefault();
    clearTimeout(press.timer);
    showCopyButton(press);
  }, true);

  document.addEventListener('click', event => {
    const gesture = press;
    press = null;
    if (event.target === copyButton || !gesture || !event.detail) return;
    // Some browsers send a link click even when the pointer was used to select its text.
    if (gesture.held || (!gesture.touch && gesture.control && distance(event, gesture) >= 5)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
