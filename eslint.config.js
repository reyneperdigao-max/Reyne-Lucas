import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.next/**', 'firestore.rules.test.ts'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['firestore.rules'],
    ...firebaseRulesPlugin.configs['flat/recommended'],
  }
);
