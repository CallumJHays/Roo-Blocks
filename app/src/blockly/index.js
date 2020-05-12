import raw from "raw.macro";

import parseWorkspaceXml from "./parseWorkspaceXml";
import * as customBlocks from "./customBlocks";

export const WORKSPACE_XML = raw("./workspace.xml");

export const TOOLBOX_CATEGORIES = parseWorkspaceXml(raw("./toolbox.xml"));

export function setupCustomBlocks(Blockly) {
  Object.values(customBlocks).forEach((setupFn) => setupFn(Blockly));
}
