// jsdom has no modal dialog: open and close by the attribute, firing `close`
// as browsers do. Real focus return and Escape are checked in the browser.
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
