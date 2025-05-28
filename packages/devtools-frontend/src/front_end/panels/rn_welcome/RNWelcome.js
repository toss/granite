import * as UI from "../../ui/legacy/legacy.js";
import * as Host from "../../core/host/host.js";
import * as i18n from "../../core/i18n/i18n.js";
import * as SDK from "../../core/sdk/sdk.js";
import rnWelcomeStyles from "./rnWelcome.css.js";
import * as LitHtml from "../../ui/lit-html/lit-html.js";
// TODO
// const GRANITE_DOCS_BASE_URL = "";
const UIStrings = {
    /** @description Title */
    title: "React Native Debugger for Granite",
    /** @description Welcome message */
    welcomeMessage: "A solid, stable, and reliable foundation",
};
const { render, html } = LitHtml;
const str_ = i18n.i18n.registerUIStrings("panels/rn_welcome/RNWelcome.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let RNWelcomeImplInstance;
export class RNWelcomeImpl extends UI.Widget.VBox {
    options;
    #reactNativeVersion;
    static instance(options) {
        if (!RNWelcomeImplInstance) {
            RNWelcomeImplInstance = new RNWelcomeImpl(options);
        }
        return RNWelcomeImplInstance;
    }
    constructor(options) {
        super(true, true);
        this.options = options;
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.ReactNativeApplicationModel.ReactNativeApplicationModel, this);
    }
    wasShown() {
        super.wasShown();
        this.registerCSSFiles([rnWelcomeStyles]);
        this.render();
        UI.InspectorView.InspectorView.instance().showDrawer({
            focus: true,
            hasTargetDrawer: false,
        });
    }
    modelAdded(model) {
        model.ensureEnabled();
        model.addEventListener("MetadataUpdated" /* SDK.ReactNativeApplicationModel.Events.MetadataUpdated */, this.#handleMetadataUpdated, this);
        this.#reactNativeVersion = model.metadataCached?.reactNativeVersion;
    }
    modelRemoved(model) {
        model.removeEventListener("MetadataUpdated" /* SDK.ReactNativeApplicationModel.Events.MetadataUpdated */, this.#handleMetadataUpdated, this);
    }
    #handleMetadataUpdated(event) {
        this.#reactNativeVersion = event.data.reactNativeVersion;
        if (this.isShowing()) {
            this.render();
        }
    }
    #handleLinkPress(url) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
    }
    render() {
        // const {
        //   debuggerBrandName,
        //   showBetaLabel = false,
        //   showTechPreviewLabel = false,
        //   showDocs = false,
        // } = this.options;
        const logoUrl = new URL("../../Images/welcome-logo.png", import.meta.url).toString();
        // const docsImage1Url = new URL(
        //   '../../Images/react_native/learn-debugging-basics.jpg',
        //   import.meta.url,
        // ).toString();
        // const docsImage2Url = new URL(
        //   '../../Images/react_native/learn-react-native-devtools.jpg',
        //   import.meta.url,
        // ).toString();
        // const docsImage3Url = new URL(
        //   '../../Images/react_native/learn-native-debugging.jpg',
        //   import.meta.url,
        // ).toString();
        render(html `
        <div class="granite-rn-welcome">
          <header>
            <img class="granite-logo" src=${logoUrl} role="presentation" />
            <h1>${i18nString(UIStrings.title)}</h1>
            <p>${i18nString(UIStrings.welcomeMessage)}</p>
          </header>
        </div>
      `, this.contentElement, { host: this });
    }
}
//# sourceMappingURL=RNWelcome.js.map