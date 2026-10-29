export function rememberDialogFocus(target: HTMLElement | null): void {
  document.querySelectorAll('[data-dialog-return-focus]').forEach(element => element.removeAttribute('data-dialog-return-focus'));
  target?.setAttribute('data-dialog-return-focus', 'true');
}
export function restoreDialogFocus(target: Element | null): void {
  if (!(target instanceof HTMLElement)) return;
  const tryFocus = () => {
    if (!target.isConnected || target.closest('[hidden], [inert]') || target.matches(':disabled')) return false;
    target.focus();
    return document.activeElement === target;
  };
  // La operación libera busy después de resolver el diálogo y su solicitud HTTP.
  const observer = new MutationObserver(() => { if (tryFocus()) stop(); });
  const stop = () => { observer.disconnect(); window.clearTimeout(timeout); };
  const timeout = window.setTimeout(stop, 10000);
  observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['disabled', 'hidden', 'inert'] });
  queueMicrotask(() => { if (tryFocus()) stop(); });
}
