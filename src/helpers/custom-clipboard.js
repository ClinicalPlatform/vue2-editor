import Quill from "./index";
import { overload } from 'quill/core/quill';
const TextBlot = Quill.import('blots/text')
const Clipboard = Quill.import('modules/clipboard');
const Delta = Quill.import('delta');

class CustomClipboard extends Clipboard {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('copy', e => this.onCaptureCopy(e, false));
    this.quill.root.addEventListener('cut', e => this.onCaptureCopy(e, true));
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

  onCaptureCopy(e, isCut = false) {
    // clipboardData items がない場合はデフォルトの挙動を取る
    // See: https://webkit.org/blog/8170/clipboard-api-improvements/
    if (!e.clipboardData.items) return;

    if (e.defaultPrevented) return;
    e.preventDefault();

    const [range] = this.quill.selection.getRange();
    if (range == null) return;

    e.clipboardData.setData('text/plain', this.quill.getText(range));
    if (!this.quill.isPreview()) {
      const html = this.getSemanticHTML(range);
      e.clipboardData.setData('application/json', JSON.stringify(this.convert(html)));
    }

    if (isCut) {
      this.quill.deleteText(range, Quill.sources.USER);
    }
  }

  getDelta(index = 0, length = this.quill.getLength() - index) {
    [index, length] = overload(index, length);
    return this.quill.getContents(index, length);
  }

  getSemanticHTML(index = 0, length = this.quill.getLength() - index) {
    [index, length] = overload(index, length);
    return this.getHTML(index, length);
  }

  getHTML(index, length) {
    const [line, lineOffset] = this.quill.getLine(index);
    if (line.length() >= lineOffset + length) {
      return convertHTML(line, lineOffset, length, false);
    }
    return convertHTML(this.quill.scroll, index, length, true);
  }

  isDelta(str) {
    try {
      const json = JSON.parse(str);
      const delta = new Delta(json);
      return !!delta.length;
    } catch (e) {
      return false;
    }
  }

  onPaste (e) {
    // clipboardData items がない場合はデフォルトの挙動を取る
    // See: https://webkit.org/blog/8170/clipboard-api-improvements/
    if (!e.clipboardData.items) {
      super.onPaste(e);
      return;
    };

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

    const json = JSON.parse(e.clipboardData.getData('application/json'));
    const pastedDelta = new Delta(json);

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

function convertHTML(blot, index, length, isRoot = false) {
  if (typeof blot.html === 'function') {
    return blot.html(index, length);
  }
  if (blot instanceof TextBlot) {
    return blot.value().slice(index, index + length);
  }
  if (blot.children) {
    const parts = [];
    if (blot.statics.blotName === 'list') {
      const listFormats = blot.formats();
      blot.children.forEachAt(index, length, (child, offset, childLength) => {
        const childFormats = child.formats();
        parts.push({
          child,
          offset,
          length: childLength,
          indent: childFormats.indent || 0,
          type: listFormats.list,
        });
      });
      return convertListHTML(parts, -1, []);
    }
    blot.children.forEachAt(index, length, (child, offset, childLength) => {
      parts.push(convertHTML(child, offset, childLength));
    });
    if (isRoot || blot.statics.blotName === 'list-item') {
      return parts.join('');
    }
    const { outerHTML, innerHTML } = blot.domNode;
    const [start, end] = outerHTML.split(`>${innerHTML}<`);
    return `${start}>${parts.join('')}<${end}`;
  }
  return blot.domNode.outerHTML;
}

function convertListHTML(items, lastIndent, types) {
  if (items.length === 0) {
    const [endTag] = getListType(types.pop());
    if (lastIndent <= 0) {
      return `</li></${endTag}>`;
    }
    return `</li></${endTag}>${convertListHTML([], lastIndent - 1, types)}`;
  }
  const [{ child, offset, length, indent, type }, ...rest] = items;
  const [tag, attribute] = getListType(type);
  if (indent > lastIndent) {
    types.push(type);
    return `<${tag}><li${attribute}>${convertHTML(
      child,
      offset,
      length,
    )}${convertListHTML(rest, indent, types)}`;
  }
  if (indent === lastIndent) {
    return `</li><li${attribute}>${convertHTML(
      child,
      offset,
      length,
    )}${convertListHTML(rest, indent, types)}`;
  }
  const [endTag] = getListType(types.pop());
  return `</li></${endTag}>${convertListHTML(items, lastIndent - 1, types)}`;
}

function getListType(type) {
  const tag = type === 'ordered' ? 'ol' : 'ul';
  switch (type) {
    case 'checked':
      return [tag, ' data-list="checked"'];
    case 'unchecked':
      return [tag, ' data-list="unchecked"'];
    default:
      return [tag, ''];
  }
}

export default CustomClipboard;
