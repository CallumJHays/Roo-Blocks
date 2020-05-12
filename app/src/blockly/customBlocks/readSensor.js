const BLOCK_NAME = "read_sensor"; // this is referenced in toolbox.xml and workspace.xml

export default (Blockly) => {
  Blockly.Blocks[BLOCK_NAME] = {
    init: function () {
      this.jsonInit({
        type: BLOCK_NAME,
        message0: "Read Sensor %1 Port %2",
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
        ],
        output: "Number",
        colour: 20,
        tooltip: "Reads a sensor. Returns a number between 0 and 100",
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
    return [`roo_blocks.read_sensor(${port})`, Blockly.Python.ORDER_NONE];
  };
};
