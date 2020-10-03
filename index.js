const fs = require('fs');
const util = require('util');
const parser = require('../node-c-parser');

async function main() {
  let parse_tree = await parser.fullParse('./test.c');

  parse_tree = purgeEpsilon(parse_tree);

  fs.writeFileSync('./test.json', JSON.stringify(parse_tree, null, 2));

  log('main', nassiTree(parse_tree));
}

function nassiTree(tree) {
  if (!tree) return { type: 'nulltree' };
  switch (tree.title) {
    case 'translation_unit':
    case 'translation_unit_p':
      return tree.children.map(nassiTree).reduce(
        (prev, curr) => {
          switch (curr.type) {
            case 'subroot':
            case 'generic':
              prev.code.push(...curr.code);
              break;
            default:
              console.log('err', curr);
              prev.code.push('Error');
          }
          return prev;
        },
        {
          type: tree.title === 'translation_unit' ? 'root' : 'subroot',
          code: [],
        },
      );

    case 'external_declaration':
      return tree.children.map(nassiTree).shift();

    case 'declaration':
      return { type: 'generic', code: [recreate(tree)] };

    case 'function_definition':
      log('f', tree);
      return {
        type: 'function',
        ftype: tree.children
          .find((c) => c.title === 'declaration_specifiers')
          .children.find((c) => c.title === 'type_specifier').children[0],
      };

    case undefined:
  }

  return {};
}

const enterChars = [';', '{'];
const noSpaceCharsBegin = ['(', '[', '{'];
const noSpaceCharsEnd = [')', ']', '}', ';', ','];

function recreate(tree) {
  if (!tree) return 'error';

  if (tree.lexeme) return tree.lexeme;

  if (tree.children)
    return tree.children.map(recreate).reduce((prev, curr) => {
      if (!curr) return prev;

      if (!prev) return curr;

      if (enterChars.indexOf(prev[prev.length - 1]) > -1)
        return prev + '\n' + curr;

      if (noSpaceCharsBegin.indexOf(prev[prev.length - 1]) > -1)
        return prev + curr;

      if (noSpaceCharsEnd.indexOf(curr[0]) > -1) return prev + curr;

      return prev + ' ' + curr;
    }, '');

  return 'Error';
}

function purgeEpsilon(tree) {
  if (tree && tree.children) {
    tree.children = tree.children
      .filter((c) => c.title !== 'EPSILON')
      .map(purgeEpsilon);
  }
  return tree;
}

main().catch(console.error);

function log(name, data) {
  console.log(name, util.inspect(data, false, Infinity, true));
}
