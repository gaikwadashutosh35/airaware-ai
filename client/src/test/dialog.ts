// jsdom has no modal dialog: open and close by the attribute, firing `close`
// as browsers do. Real focus return and Escape are checked in the browser.
export function stubDialog(): void {
  const proto = HTMLDialogElement.prototype;
  if (!Reflect.has(proto, 'showModal')) {
    Object.assign(proto, {
      showModal(this: HTMLDialogElement) {
        this.open = true;
      },
    });
  }
  if (!Reflect.has(proto, 'close')) {
    Object.assign(proto, {
      close(this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      },
    });
  }
}
