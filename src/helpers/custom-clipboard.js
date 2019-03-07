import _Quill from 'quill'

const Quill = window.Quill || _Quill
const Clipboard = Quill.import('modules/clipboard');
const Delta = Quill.import('delta');

class CustomClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options);
  }

  dangerouslyPasteHTML(index, html, source = Quill.sources.API) {
    if (typeof index === 'string') {
      this.quill.setContents(this.convert(`${index}<p><br></p>`), html);
      this.quill.setSelection(this.quill.getLength(), Quill.sources.SILENT);
    } else {
      const _html = typeof html === 'string' ? `${html}<p><br></p>` : html;
      const paste = this.convert(_html);
      this.quill.updateContents(new Delta().retain(index).concat(paste), source);
      this.quill.setSelection(index + paste.length(), Quill.sources.SILENT);
    }
  }
}

export default CustomClipboard;
