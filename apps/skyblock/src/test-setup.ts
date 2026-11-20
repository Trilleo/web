// jsdom has <dialog> but not its modal methods: enough of them for the tests.
if (
  typeof HTMLDialogElement !== "undefined" &&
  !(
    "showModal" in HTMLDialogElement.prototype &&
    HTMLDialogElement.prototype.showModal.toString().includes("native")
  )
) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
