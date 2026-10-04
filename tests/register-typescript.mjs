// Test-only loader using the project's existing TypeScript dependency.
// Node 22.15+; no application bundler or additional test package needed.
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const base = specifier.startsWith('@/')
      ? new URL('../src/' + specifier.slice(2), import.meta.url)
      : specifier.startsWith('.') ? new URL(specifier, context.parentURL) : null;
    if (base) {
      for (const extension of ['', '.ts', '.tsx']) {
        const url = new URL(base.href + extension);
        if (/\.tsx?$/.test(url.pathname) && existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});