import { addMethod, string } from "yup";
import { toConstraintsMap } from "./constraints-map";
import { defaultConstraints, defaults } from "./defaults";

const fallBackFnMap = {
  isMagnetURI: (value, isMagnetUri) => {
    return /magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/i.test(value);
  }
};

export function extendYupApi({
  constraints,
  override = false,
  validator,
  createValidatorName,
  createTestName
}: any = {}) {
  if (!validator) {
    throw "extendYupApi: missing validator option";
  }

  if (Array.isArray(constraints)) {
    constraints = toConstraintsMap(constraints);
  }

  if (!override) {
    constraints = {
      ...defaultConstraints,
      ...(constraints || {})
    };
  } else {
    constraints = constraints || defaultConstraints;
  }

  createValidatorName = createValidatorName || defaults.createValidatorName;
  createTestName = createTestName || defaults.createTestName;

  Object.keys(constraints).map(key => {
    let { testName, optsKey, validatorName, logging } = constraints[key];
    const fullValidatorName = createValidatorName(validatorName, key);
    testName = createTestName(testName, key);

    // See https://github.com/jquense/yup#yupaddmethodschematype-schema-name-string-method--schema-void
    addMethod(string, key, (args: any = {}) => {
      const { message } = args;
      const opts = args[optsKey];
      const strInstance = string();
      return strInstance.test(testName, message, value => {
        // return this.transform(value => {
        const { path, createError } = strInstance;
        // [value] - value of the property being tested
        // [path]  - property name,
        // ...
        let validatorFn = validator[fullValidatorName];
        validatorFn = validatorFn || fallBackFnMap[fullValidatorName];

        if (typeof validatorFn !== "function") {
          throw Error("No method named ${validatorName} on validator");
        }
        const valid = validatorFn(value, opts);
        if (logging === true) {
          console.log("Yup validator bridge", {
            key,
            fullValidatorName,
            testName,
            value,
            valid
          });
        }
        return valid || createError({ path, message });
      });
    });
  });
}