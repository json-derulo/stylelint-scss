import isRegExp from "lodash.isregexp";
import isString from "lodash.isstring";
import { utils } from "stylelint";
import { namespace } from "../../utils";
import nodeJsPath from "path";

export const ruleName = namespace("at-import-partial-extension-blacklist");

export const messages = utils.ruleMessages(ruleName, {
  rejected: ext => `Unexpected extension ".${ext}" in imported partial name`
});

export default function(blacklistOption) {
  const blacklist = [].concat(blacklistOption);

  return (root, result) => {
    const validOptions = utils.validateOptions(result, ruleName, {
      actual: blacklistOption,
      possible: [isString, isRegExp]
    });

    if (!validOptions) {
      return;
    }

    function checkPathForUnderscore(path, decl) {
      // Stripping trailing quotes and whitespaces, if any
      const pathStripped = path
        .replace(/^\s*?("|')\s*/, "")
        .replace(/\s*("|')\s*?$/, "");
      const extension = nodeJsPath.extname(pathStripped).slice(1);
      // Save this separately to be able to pass the original string to report()
      const extensionNormalized = extension.toLowerCase();

      // If the extension is empty
      if (!extension) {
        return;
      }

      // Skipping importing CSS: url(), ".css", URI with a protocol, media
      if (
        pathStripped.slice(0, 4) === "url(" ||
        pathStripped.slice(-4) === ".css" ||
        pathStripped.search("//") !== -1 ||
        pathStripped.search(/(?:\s|[,)"'])\w+$/) !== -1
      ) {
        return;
      }

      blacklist.forEach(ext => {
        if (
          (isString(ext) && extensionNormalized === ext) ||
          (isRegExp(ext) && extensionNormalized.search(ext) !== -1)
        ) {
          utils.report({
            message: messages.rejected(extension),
            node: decl,
            word: extension,
            result,
            ruleName
          });
        }
      });
    }

    root.walkAtRules("import", atRule => {
      // Processing comma-separated lists of import paths
      atRule.params.split(",").forEach(path => {
        checkPathForUnderscore(path, atRule);
      });
    });
  };
}
