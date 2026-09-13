import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const noComments = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, message: 'Comments are not allowed.' });
        }
      },
    };
  },
};

const emDash = '/—/';
const rawColour = '/#[0-9a-fA-F]{3,8}$|rgba?[(]|hsla?[(]/';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'src/design-system/**'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks, house: { rules: { 'no-comments': noComments } } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'house/no-comments': 'error',
      'max-lines': ['error', { max: 100, skipBlankLines: true, skipComments: false }],
      'max-lines-per-function': ['error', { max: 20, skipBlankLines: true, skipComments: false }],
      'max-params': ['error', 2],
      'max-depth': ['error', 2],
      'max-nested-callbacks': ['error', 3],
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=${emDash}]`, message: 'No em dashes.' },
        { selector: `TemplateElement[value.raw=${emDash}]`, message: 'No em dashes.' },
        { selector: `JSXText[value=${emDash}]`, message: 'No em dashes.' },
        { selector: `Literal[value=${rawColour}]`, message: 'Use design tokens, not raw colours.' },
        { selector: `TemplateElement[value.raw=${rawColour}]`, message: 'Use design tokens, not raw colours.' },
        { selector: 'ClassBody[body.length>5]', message: 'At most 5 members per class.' },
      ],
    },
  },
);
