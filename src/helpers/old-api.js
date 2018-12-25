export default {
  props: {
    customModules: {
      type: Array,
      default: () => ([])
    },
  },
  methods: {
    registerCustomModules(Quill) {
      if (Array.isArray(this.customModules)) {
        this.customModules.forEach(customModule => {
          Quill.register("modules/" + customModule.alias, customModule.module, customModule.overwrite);
        });
      }
    }
  }
};
