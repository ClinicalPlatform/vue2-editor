<template>
  <div class="quill-wrapper" :class="{ 'ql-preview': preview, 'quill-hide': hide }"><slot name="toolbar"></slot><div :id="id" ref="quillContainer"></div><input v-if="useCustomImageHandler" @change="emitImageInfo($event)" ref="fileInput" id="file-upload" type="file" accept="image/*" style="display:none;"></div>
</template>

<script>
import Quill from "./helpers/index";
import defaultToolbar from "./helpers/default-toolbar";
import merge from "lodash.merge";
import oldApi from "./helpers/old-api";
import MarkdownShortcuts from "./helpers/markdown-shortcuts";

export default {
  name: "VueEditor",
  mixins: [oldApi],
  props: {
    id: {
      type: String,
      default: "quill-container"
    },
    placeholder: {
      type: String,
      default: ""
    },
    value: {
      type: String,
      default: ""
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    preview: {
      type: Boolean,
      default: false,
    },
    editorToolbar: {
      type: Array,
      default: null,
    },
    editorOptions: {
      type: Object,
      required: false,
      default: () => ({})
    },
    useCustomImageHandler: {
      type: Boolean,
      default: false
    },
    useMarkdownShortcuts: {
      type: Boolean,
      default: false
    },
  },

  data: () => ({
    quill: null,
    _content: ''
  }),

  computed: {
    hide() { return this.preview && this.value === '' },
    readOnly() { return this.preview || this.disabled }
  },

  created() {
    this.registerCustomModules(Quill);
  },

  mounted() {
    this.initializeEditor();
  },

  methods: {
    initializeEditor() {
      this.setupQuillEditor();
      this.checkForCustomImageHandler();
      this.initialContent(this.value);
      this.registerEditorEventListeners();
      this.disableDropEvent();
      this.$emit("ready", this.quill);
    },

    setupQuillEditor() {
      let editorConfig = {
        debug: false,
        modules: this.setModules(),
        theme: "snow",
        placeholder: this.placeholder ? this.placeholder : "",
        preview: this.preview,
        readOnly: this.readOnly
      };

      this.prepareEditorConfig(editorConfig);
      this.quill = new Quill(this.$refs.quillContainer, editorConfig);
    },

    setModules() {
      let modules = {
        toolbar: this.editorToolbar ? this.editorToolbar : defaultToolbar
      };
      if (this.useMarkdownShortcuts) {
        Quill.register("modules/markdownShortcuts", MarkdownShortcuts, true);
        modules["markdownShortcuts"] = {};
      }
      return modules;
    },

    prepareEditorConfig(editorConfig) {
      if (
        Object.keys(this.editorOptions).length > 0 &&
        this.editorOptions.constructor === Object
      ) {
        if (
          this.editorOptions.modules &&
          typeof this.editorOptions.modules.toolbar !== "undefined"
        ) {
          // We don't want to merge default toolbar with provided toolbar.
          delete editorConfig.modules.toolbar;
        }
        merge(editorConfig, this.editorOptions);
      }
    },


    registerEditorEventListeners() {
      this.quill.on("text-change", this.handleTextChange);
      this.quill.on("selection-change", this.handleSelectionChange);
      this.listenForEditorEvent("text-change");
      this.listenForEditorEvent("selection-change");
      this.listenForEditorEvent("editor-change");
    },

    listenForEditorEvent(type) {
      this.quill.on(type, (...args) => {
        this.$emit(type, ...args);
      });
    },

    handleSelectionChange(range, oldRange) {
      if (!range && oldRange) this.$emit("blur", this.quill);
      else if (range && !oldRange) this.$emit("focus", this.quill);
    },

    handleTextChange() {
      const html = this.quill.getHTML();
      this._content = html === "<p><br></p>" ? "" : html;
      this.$emit("input", this._content);
    },

    checkForCustomImageHandler() {
      this.useCustomImageHandler === true ? this.setupCustomImageHandler() : "";
    },

    setupCustomImageHandler() {
      let toolbar = this.quill.getModule("toolbar");
      toolbar.addHandler("image", this.customImageHandler);
    },

    customImageHandler(image, callback) {
      this.$refs.fileInput.click();
    },

    emitImageInfo($event) {
      const resetUploader = function() {
        var uploader = document.getElementById("file-upload");
        uploader.value = "";
      };
      let file = $event.target.files[0];
      let Editor = this.quill;
      let range = Editor.getSelection();
      let cursorLocation = range.index;
      this.$emit("imageAdded", file, Editor, cursorLocation, resetUploader);
    },

    disableDropEvent() {
      this.quill.root.addEventListener("drop", e => {
        e.preventDefault();
        return false;
      });
    },

    initialContent(value) {
      this.quill.root.innerHTML = value;
      this.quill.update(Quill.sources.API);
    }
  },

  watch: {
    value(val) {
      if (val !== this._content) {
        this.initialContent(val);
      }
    },
    readOnly(status) {
      this.quill.enable(!status);
      this.quill.setPreview(this.preview);
    }
  },

  beforeDestroy() {
    this.quill = null;
    delete this.quill;
  }
};
</script>

<style src="quill/dist/quill.snow.css"></style>
<style src="./styles/vue2-editor.scss" lang='scss'></style>
