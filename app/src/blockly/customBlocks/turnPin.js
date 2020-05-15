const BLOCK_NAME = "turn_pin"; // this is referenced in toolbox.xml and workspace.xml

export default (Blockly) => {
  Blockly.Blocks[BLOCK_NAME] = {
    init: function () {
      this.jsonInit({
        type: BLOCK_NAME,
        message0: "Set Pin %1 Port %2 On? %3",
        args0: [
          {
            type: "input_dummy",
          },
          {
            type: "input_value",
            name: "pin",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "on",
            check: "Boolean",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 20,
        tooltip: "",
        helpUrl: "",
      });
    },
  };

  Blockly.Python[BLOCK_NAME] = function (block) {
    const port = Blockly.Python.valueToCode(
      block,
      "pin",
      Blockly.Python.ORDER_ATOMIC
    );
    const on = Blockly.Python.valueToCode(
      block,
      "on",
      Blockly.Python.ORDER_ATOMIC
    );
    return `roo_blocks.turn_pin(${port}, ${on})\n`;
  };
};
