const BLOCK_NAME = "drive_motor"; // this is referenced in toolbox.xml and workspace.xml

export default (Blockly) => {
  Blockly.Blocks[BLOCK_NAME] = {
    init: function () {
      this.jsonInit({
        type: BLOCK_NAME,
        message0: "Drive Motor %1 Port %2 Speed %3",
        args0: [
          {
            type: "input_dummy",
          },
          {
            type: "input_value",
            name: "port",
            check: "Number",
            align: "RIGHT",
          },
          {
            type: "input_value",
            name: "speed",
            check: "Number",
            align: "RIGHT",
          },
        ],
        previousStatement: null,
        nextStatement: null,
        colour: 20,
        tooltip: "Speed between -100 and 100",
        helpUrl: "",
      });
    },
  };

  Blockly.Python[BLOCK_NAME] = function (block) {
    const port = Blockly.Python.valueToCode(
      block,
      "port",
      Blockly.Python.ORDER_ATOMIC
    );
    const speed = Blockly.Python.valueToCode(
      block,
      "speed",
      Blockly.Python.ORDER_ATOMIC
    );

    return `roo_blocks.drive_motor(${port}, ${speed})\n`;
  };
};
