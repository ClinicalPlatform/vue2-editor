import Quill from 'quill';
import { overload } from 'quill/core/quill';
const Clipboard = Quill.import('modules/clipboard');
const Delta = Quill.import('delta');

class PlainClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('copy', e => this.onCaptureCopy(e, false));
    this.quill.root.addEventListener('cut', e => this.onCaptureCopy(e, true));
  }

  onCaptureCopy(e, isCut = false) {
    if (e.defaultPrevented) return;
    e.preventDefault();

    const [range] = this.quill.selection.getRange();
    if (range == null) return;

    const delta = this.getDelta(range);
    e.clipboardData.setData('text/plain', this.quill.getText(range));
    e.clipboardData.setData('text/html', this.getHTML(delta));
    if (!this.quill.isPreview()) {
      e.clipboardData.setData('application/json', JSON.stringify(delta));
    }

    if (isCut) {
      this.quill.deleteText(range, Quill.sources.USER);
    }
  }

  getDelta(index = 0, length = this.quill.getLength() - index) {
    [index, length] = overload(index, length);
    return this.quill.editor.getContents(index, length);
  }

  getHTML(delta) {
    const template = new Quill(document.createElement("div"));
    template.setContents(delta);
    return template.root.innerHTML;
  }

  isDelta(str) {
    try {
      const json = JSON.parse(str);
      const delta = new Delta(json);
      return !!delta.length();
    } catch (e) {
      return false;
    }
  }

  onPaste (e) {
    this.quill.history.cutoff();
    if (this.isDelta(e.clipboardData.getData('application/json'))) {
      super.onPaste(e);
      return;
    }
    this.onPastePlain(e);
  }

  onPastePlain (e) {
    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    e.preventDefault();

    const text = e.clipboardData.getData('text/plain');
    const range = this.quill.getSelection();
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .insert(text);

    const scrollTop = this.quill.scrollingContainer.scrollTop;
    this.container.focus();
    this.quill.selection.update(Quill.sources.SILENT);

    setTimeout(() => {
      this.quill.updateContents(delta, Quill.sources.USER);
      this.quill.setSelection((text.length + range.index), 0, Quill.sources.SILENT);
      this.quill.scrollingContainer.scrollTop = scrollTop;
      this.quill.focus();
    }, 1);
  }
}

export default PlainClipboard;
