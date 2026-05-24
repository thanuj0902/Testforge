function generateTypeScriptTests(code) {
  const functions = extractFunctions(code);
  const classes = extractClasses(code);
  const interfaces = extractInterfaces(code);
  let tests = [];

  for (const fn of functions) {
    tests.push(generateFunctionTest(fn, code));
  }
  for (const cls of classes) {
    tests.push(generateClassTest(cls, code));
  }
  if (interfaces.length > 0) {
    tests.push(generateInterfaceTests(interfaces));
  }
  if (tests.length === 0) {
    tests.push(generateDefaultTest());
  }
  return `import { describe, it, expect } from '@jest/globals';\n${tests.join('\n\n')}`;
}

function extractFunctions(code) {
  const functions = [];
  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*<[^>]*>?\s*\(([^)]*)\)/g,
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*:\s*\w+\s*=\s*(?:async\s+)?(?:\(([^)]*)\)|(\w+)\s*\))\s*=>/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*)?\(([^)]*)\)\s*=>/g,
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g,
  ];
  const reserved = new Set(['if', 'for', 'while', 'switch', 'catch', 'describe', 'it', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'then', 'catch']);

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(code)) !== null) {
      const name = match[1];
      const params = (match[2] || match[3] || '').split(',').map(p => {
        return p.trim().replace(/:?\s*\w+(\[\])?\s*$/, '').trim();
      }).filter(Boolean);
      if (name && !reserved.has(name) && !functions.some(f => f.name === name)) {
        const isAsync = /\basync\s/.test(match[0]);
        functions.push({ name, params, isAsync });
      }
    }
  }
  return functions;
}

function extractClasses(code) {
  const classes = [];
  const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+\w+(?:\s*,\s*\w+)*)?\s*{/g;
  let match;
  while ((match = classRegex.exec(code)) !== null) {
    const name = match[1];
    const startIdx = match.index + match[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++;
      if (code[i] === '}') depth--;
      i++;
    }
    const body = code.slice(startIdx, i - 1);
    const methods = [];
    const methodRegex = /(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*:/g;
    let m;
    while ((m = methodRegex.exec(body)) !== null) {
      if (!['constructor', 'if', 'for', 'while', 'switch', 'catch'].includes(m[1])) {
        methods.push({
          name: m[1],
          params: (m[2] || '').split(',').map(p => {
            return p.trim().replace(/:?\s*\w+(\[\])?\s*$/, '').trim();
          }).filter(Boolean),
        });
      }
    }
    classes.push({ name, methods });
  }
  return classes;
}

function extractInterfaces(code) {
  const interfaces = [];
  const ifaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+\w+(?:\s*,\s*\w+)*)?\s*{/g;
  let match;
  while ((match = ifaceRegex.exec(code)) !== null) {
    const name = match[1];
    const startIdx = match.index + match[0].length;
    let depth = 1;
    let i = startIdx;
    while (i < code.length && depth > 0) {
      if (code[i] === '{') depth++;
      if (code[i] === '}') depth--;
      i++;
    }
    const body = code.slice(startIdx, i - 1);
    const props = [];
    const propRegex = /(\w+)\s*(?:\??)\s*:\s*(\w+(?:\[\])?)/g;
    let p;
    while ((p = propRegex.exec(body)) !== null) {
      props.push({ name: p[1], type: p[2] });
    }
    interfaces.push({ name, props });
  }
  return interfaces;
}

function guessType(name) {
  if (/^[a-f]$|num|count|index|id|age|year|size|length|max|min|total/.test(name)) return 'number';
  if (/name|str|msg|email|text|url|title|label|desc|slug|key/.test(name)) return 'string';
  if (/items|arr|list|data|entries|collection/.test(name)) return 'array';
  if (/obj|config|opts|options|settings|params|props/.test(name)) return 'object';
  if (/^is|^has|flag|enabled|disabled|active|visible/.test(name)) return 'boolean';
  return 'string';
}

function getTestValue(name, type) {
  if (type === 'number') {
    if (/^[abij]$|count|index/.test(name)) return { val: '2', zero: '0' };
    return { val: '42', zero: '0' };
  }
  if (type === 'string') {
    if (/email/.test(name)) return { val: "'user@example.com'", zero: "''" };
    if (/url/.test(name)) return { val: "'https://example.com'", zero: "''" };
    return { val: "'hello'", zero: "''" };
  }
  if (type === 'boolean') return { val: 'true', zero: 'false' };
  if (type === 'array') return { val: '[1, 2, 3]', zero: '[]' };
  if (type === 'object') return { val: '({ key: "value" })', zero: '({})' };
  return { val: "'test'", zero: "''" };
}

function generateFunctionTest(fn, code) {
  const hasAsync = fn.isAsync || /\basync\s/.test(code.slice(0, Math.max(0, code.indexOf(fn.name)) + fn.name.length + 20));
  const safeName = fn.name.replace(/'/g, "\\'");
  const paramTypes = fn.params.map(p => ({ name: p, type: guessType(p) }));

  if (paramTypes.length === 0) {
    return `describe('${safeName}()', () => {\n  it('should execute successfully', ${hasAsync ? 'async ' : ''}() => {\n    const result = ${hasAsync ? 'await ' : ''}${fn.name}();\n    expect(result).toBeDefined();\n  });\n});\n`;
  }

  const row = `    { ${paramTypes.map(p => {
    const v = getTestValue(p.name, p.type);
    return `${p.name}: ${v.val}`;
  }).join(', ')} }`;
  const rowZero = `    { ${paramTypes.map(p => {
    const v = getTestValue(p.name, p.type);
    return `${p.name}: ${v.zero}`;
  }).join(', ')} }`;
  const paramsStr = paramTypes.map(p => 'tt.' + p.name).join(', ');

  let body = `describe('${safeName}()', () => {\n`;
  body += `  it.each([\n${row},\n  ])('should handle ${
    paramTypes.map(p => p.name).join(', ')
  }', ${hasAsync ? 'async ' : ''}(tt: { ${paramTypes.map(p => `${p.name}: ${p.type}`).join(', ')} }) => {\n`;
  body += `    const result = ${hasAsync ? 'await ' : ''}${fn.name}(${paramsStr});\n`;
  body += `    expect(result).toBeDefined();\n`;
  body += `  });\n\n`;
  body += `  it.each([\n${rowZero},\n  ])('should handle zero/empty values', ${hasAsync ? 'async ' : ''}(tt: { ${paramTypes.map(p => `${p.name}: ${p.type}`).join(', ')} }) => {\n`;
  body += `    const result = ${hasAsync ? 'await ' : ''}${fn.name}(${paramsStr});\n`;
  body += `    expect(result).toBeDefined();\n`;
  body += `  });\n\n`;
  body += `  it('should handle null input', ${hasAsync ? 'async ' : ''}() => {\n`;
  body += `    ${hasAsync ? 'await ' : ''}expect(${hasAsync ? '' : '() => '}${fn.name}(${paramTypes.map(() => 'null').join(', ')})).${hasAsync ? 'rejects.' : ''}toThrow();\n`;
  body += `  });\n`;
  body += `});\n`;
  return body;
}

function generateClassTest(cls) {
  const safeName = cls.name.replace(/'/g, "\\'");
  let body = `describe('${safeName}', () => {\n`;
  body += `  let instance: ${cls.name};\n\n`;
  body += `  beforeEach(() => {\n`;
  body += `    instance = new ${cls.name}();\n`;
  body += `  });\n\n`;

  for (const method of cls.methods) {
    const safeMethod = method.name.replace(/'/g, "\\'");
    const paramTypes = method.params.map(p => ({ name: p, type: guessType(p) }));
    const paramsStr = paramTypes.map(p => 'tt.' + p.name).join(', ');

    if (paramTypes.length === 0) {
      body += `  describe('${safeMethod}()', () => {\n`;
      body += `    it('should execute', () => {\n`;
      body += `      instance.${method.name}();\n`;
      body += `    });\n`;
      body += `  });\n\n`;
      continue;
    }

    const rows = paramTypes.map(p => {
      const v = getTestValue(p.name, p.type);
      return `      { ${p.name}: ${v.val} }`;
    }).join(',\n');

    body += `  describe('${safeMethod}()', () => {\n`;
    body += `    it.each([\n${rows},\n    ])('should work', (tt: { ${paramTypes.map(p => `${p.name}: ${p.type}`).join(', ')} }) => {\n`;
    body += `      const result = instance.${method.name}(${paramsStr});\n`;
    body += `      expect(result).toBeDefined();\n`;
    body += `    });\n`;
    body += `  });\n\n`;
  }
  body += `});\n`;
  return body;
}

function generateInterfaceTests(interfaces) {
  let body = `describe('Types & Interfaces', () => {\n`;
  for (const iface of interfaces) {
    body += `  describe('${iface.name}', () => {\n`;
    if (iface.props.length > 0) {
      body += `    it('should create valid object', () => {\n`;
      body += `      const obj: ${iface.name} = {\n`;
      body += iface.props.map(p => {
        const v = getTestValue(p.name, p.type.toLowerCase());
        return `        ${p.name}: ${v.val}`;
      }).join(',\n');
      body += `\n      };\n`;
      body += `      expect(obj).toBeDefined();\n`;
      body += `    });\n`;
    }
    body += `  });\n\n`;
  }
  body += `});\n`;
  return body;
}

function generateDefaultTest() {
  return `describe('Module', () => {\n  it('should be defined', () => {\n    expect(true).toBe(true);\n  });\n});`;
}

module.exports = { generateTypeScriptTests };
