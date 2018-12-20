import Quill from 'quill'
import { overload } from 'quill/core/quill'
const Clipboard = Quill.import('modules/clipboard')
const Delta = Quill.import('delta')

class PlainClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options)
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
    e.clipboardData.setData('application/json', JSON.stringify(delta));
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
    return template.root.innerHTML
  }

  onPaste (e) {
    if (e.clipboardData.getData('application/json')) {
      const delta = JSON.parse(e.clipboardData.getData('application/json'));
      if (delta.ops) {
        super.onPaste(e);
        return;
      }
    }
    e.preventDefault()
    const range = this.quill.getSelection()
    const text = e.clipboardData.getData('text/plain')
    const delta = new Delta()
      .retain(range.index)
      .delete(range.length)
      .insert(text);
    this.quill.updateContents(delta, 'user')
    this.quill.setSelection((text.length + range.index), 0, 'silent')
    this.quill.scrollIntoView()
  }
}

export default PlainClipboard
