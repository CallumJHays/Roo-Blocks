import raw from "raw.macro"

import parseWorkspaceXml from "./parseWorkspaceXml";

export const WORKSPACE_XML = raw("./workspace.xml");

export const TOOLBOX_CATEGORIES = parseWorkspaceXml(raw("./toolbox.xml"));
