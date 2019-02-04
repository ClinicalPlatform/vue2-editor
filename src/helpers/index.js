import _Quill from "quill";
const Quill = window.Quill || _Quill;

const template = new Quill(document.createElement("div"));

class CustomQuill extends Quill {
  constructor(container, options = {}) {
    super(container, options);
    this.selection.emitter.listenDOM('selectionchange', document, () => {
      const [lastRange, nativeRange] = this.selection.getRange();
      if(lastRange !== null){
        this.selection.savedRange = lastRange;
      }
    });
    this.setPreview(this.options.preview);
  }

  setPreview(preview = true) {
    this.container.classList.toggle('ql-preview', preview);
  }

  isPreview() {
    return this.container.classList.contains('ql-preview');
  }

  getHTML(delta = this.getContents()) {
    template.setContents(delta);
    return template.root.innerHTML;
  }
}

export default CustomQuill;
