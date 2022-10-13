import { enableLogs } from "../config";
import { click, elementExists, wait, waitForElement } from "../rule-executors";
import { RunContext } from "../rules";
import { waitFor } from "../utils";
import AutoConsentCMPBase from "./base";

export default class SourcePoint extends AutoConsentCMPBase {

  ccpaMode = false;

  runContext: RunContext = {
    main: false,
    frame: true,
  }

  constructor() {
    super("Sourcepoint-frame");
  }

  get hasSelfTest(): boolean {
    return false; // self-test is done by parent frame
  }

  get isIntermediate(): boolean {
    return false;
  }

  async detectCmp() {
    const url = new URL(location.href);
    if (url.searchParams.has('message_id') && url.hostname === 'ccpa-notice.sp-prod.net') {
      this.ccpaMode = true;
      return true;
    }
    return (url.pathname === '/index.html' || url.pathname === '/privacy-manager/index.html')
        && (url.searchParams.has('message_id') || url.searchParams.has('requestUUID') || url.searchParams.has('consentUUID'));
  }

  async detectPopup() {

    // we only return true if the manager is open and we can actually perform an opt-out
    // otherwise the rule might produce a dialogue in our browser asking the user whether to
    // enable autoconsent, and then if the user clicks "yes" nothing will happen as the
    // autoconsent won't work for this CPM unless the manager is open...
    if (!this.isManagerOpen()) {
      const actionable = await waitForElement('.sp_choice_type_12,.sp_choice_type_13', 2000);
      if (!actionable) {
        return false;
      }
    }

    return true;
  }

  async optIn() {
    await waitForElement(".sp_choice_type_11,.sp_choice_type_ACCEPT_ALL", 2000);
    if (click(".sp_choice_type_11")) {
      return true;
    }

    if (click('.sp_choice_type_ACCEPT_ALL')) {
      return true;
    }
    return false;
  }

  isManagerOpen() {
    return (new URL(location.href)).pathname === "/privacy-manager/index.html";
  }

  async optOut() {
    if (!this.isManagerOpen()) {
      const actionable = await waitForElement('.sp_choice_type_12,.sp_choice_type_13');
      if (!actionable) {
        return false;
      }
      if (!elementExists(".sp_choice_type_12")) {
        // do not sell button
        return click(".sp_choice_type_13");
      }

      click(".sp_choice_type_12");
      // the page may navigate at this point but that's okay
      await waitFor(
        () => location.pathname === "/privacy-manager/index.html",
        200,
        100
      );
    }

    await waitForElement('.type-modal', 20000);
    // reject all button is offered by some sites
    try {
      const rejectSelector1 = '.sp_choice_type_REJECT_ALL';
      const rejectSelector2 = '.reject-toggle';
      const path = await Promise.race([
        waitForElement(rejectSelector1, 2000).then(success => success ? 0: -1),
        waitForElement(rejectSelector2, 2000).then(success => success ? 1: -1),
        waitForElement('.pm-features', 2000).then(success => success ? 2: -1),
      ]);
      if (path === 0) {
        await wait(1000);
        return click(rejectSelector1);
      } else if (path === 1) {
        click(rejectSelector2);
      } else if (path === 2) {
        await waitForElement('.pm-features', 10000);
        click('.checked > span', true);

        click('.chevron');
      }
    } catch (e) {
      enableLogs && console.warn(e);
    }
    click('.sp_choice_type_SAVE_AND_EXIT');
    return true;
  }
}
