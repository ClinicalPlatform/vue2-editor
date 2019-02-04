/**
 * Vue2-Editor
 */
import Quill from "./helpers/index";
import VueEditor from './VueEditor.vue';
import CustomClipboard from "./helpers/custom-clipboard";

Quill.register("modules/clipboard", CustomClipboard, true);

const Vue2Editor = {
  VueEditor,
  install: function(Vue) {
    Vue.component(VueEditor.name, VueEditor)
  }
}

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(Vue2Editor)
}

export default Vue2Editor
export { VueEditor, Quill }
