import parseWorkspaceXml from "./parseWorkspaceXml";
import ToolboxXml from "./toolbox.xml";
export * as WORKSPACE_XML from "./workspace.xml";

export const TOOLBOX = parseWorkspaceXml(ToolboxXml);
