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

  dangerouslyPasteHTML(index, html, source = Quill.sources.API) {
    if (typeof index === 'string') {
      this.quill.setContents(this.convert(index + '<p><br></p>'), html);
      this.quill.setSelection(this.quill.getLength(), Quill.sources.SILENT);
    } else {
      const _html = typeof html === 'string' ? html + '<p><br></p>' : html;
      const paste = this.convert(_html);
      this.quill.updateContents(new Delta().retain(index).concat(paste), source);
      this.quill.setSelection(index + paste.length(), Quill.sources.SILENT);
    }
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
    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    e.preventDefault();

    this.quill.history.cutoff();

    if (this.isDelta(e.clipboardData.getData('application/json'))) {
      this.onCapturePaste(e);
      return;
    }
    this.onPlainPaste(e);
  }

  onCapturePaste(e) {
    const range = this.quill.getSelection(true);
    if (range == null) return;

    const html = e.clipboardData.getData('text/html');
    const pastedDelta = this.convert(html);

    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .concat(pastedDelta);

    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection((delta.length() - range.length), Quill.sources.SILENT);
    this.quill.scrollIntoView();
  }

  onPlainPaste (e) {
    const range = this.quill.getSelection(true);
    if (range == null) return;

    const text = e.clipboardData.getData('text/plain');
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .insert(text);

    this.quill.updateContents(delta, Quill.sources.USER);
    this.quill.setSelection((text.length + range.index), Quill.sources.SILENT);
    this.quill.scrollIntoView();
  }
}

export default PlainClipboard;
