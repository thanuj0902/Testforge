function generatePythonTests(code) {
  const functions = extractFunctions(code);
  const classes = extractClasses(code);

  let tests = `import pytest\nimport sys\nfrom unittest.mock import MagicMock, patch\n\n`;

  for (const fn of functions) {
    tests += generateFunctionTest(fn);
  }

  for (const cls of classes) {
    tests += generateClassTest(cls);
  }

  if (functions.length === 0 && classes.length === 0) {
    tests += generateDefaultTest();
  }

  return tests;
}

function extractFunctions(code) {
  const functions = [];
  const fnRegex = /^def\s+(\w+)\s*\(([^)]*)\)/gm;
  let match;

  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2].split(',').map(p => p.trim().split(':')[0].split('=')[0].trim()).filter(Boolean);
    if (name && !name.startsWith('_')) {
      functions.push({ name, params });
    }
  }

  return functions;
}

function extractClasses(code) {
  const classes = [];
  const lines = code.split('\n');
  let i = 0;
  while (i < lines.length) {
    const classMatch = lines[i].match(/^class\s+(\w+)/);
    if (classMatch) {
      const name = classMatch[1];
      const methods = [];
      i++;
      while (i < lines.length && lines[i].startsWith(' ')) {
        const methodMatch = lines[i].match(/def\s+(\w+)\s*\(([^)]*)\)/);
        if (methodMatch) {
          const methodName = methodMatch[1];
          if (!methodName.startsWith('_')) {
            const params = methodMatch[2].split(',').map(p => p.trim().split(':')[0].split('=')[0].trim()).filter(Boolean).filter(p => p !== 'self');
            methods.push({ name: methodName, params });
          }
        }
        i++;
      }
      classes.push({ name, methods });
    } else {
      i++;
    }
  }

  return classes;
}

function guessPyType(name) {
  if (/^[a-f]$|num|count|index|id|age|year|size|length|max|min|total/.test(name)) return 'number';
  if (/name|str|msg|email|text|url|title|label|desc|slug|key/.test(name)) return 'string';
  if (/items|arr|list|data|entries|collection/.test(name)) return 'list';
  if (/obj|config|opts|options|settings|params|props/.test(name)) return 'dict';
  if (/^is|^has|flag|enabled|disabled|active|visible/.test(name)) return 'bool';
  return 'string';
}

function getPyValue(name) {
  const type = guessPyType(name);
  if (type === 'number') return { val: '42', zero: '0' };
  if (type === 'string') return { val: '"hello"', zero: '""' };
  if (type === 'bool') return { val: 'True', zero: 'False' };
  if (type === 'list') return { val: '[1, 2, 3]', zero: '[]' };
  if (type === 'dict') return { val: '{"key": "value"}', zero: '{}' };
  return { val: '"test"', zero: '""' };
}

function generateFunctionTest(fn) {
  const paramsStr = fn.params.join(', ');
  const paramTypes = fn.params.map(p => ({ name: p, type: guessPyType(p) }));
  let testBody = `\nclass Test${capitalize(fn.name)}:\n`;
  testBody += `    def test_basic_functionality(self):\n`;
  if (fn.params.length > 0) {
    for (const p of paramTypes) {
      testBody += `        ${p.name} = ${getPyValue(p.name).val}\n`;
    }
  }
  testBody += `        result = ${fn.name}(${paramsStr || ''})\n`;
  testBody += `        assert result is not None\n\n`;

  if (fn.params.length > 0) {
    testBody += `    def test_empty_input(self):\n`;
    for (const p of paramTypes) {
      testBody += `        ${p.name} = ${getPyValue(p.name).zero}\n`;
    }
    testBody += `        result = ${fn.name}(${paramsStr})\n`;
    testBody += `        assert result is not None\n\n`;

    testBody += `    def test_none_input(self):\n`;
    for (const p of fn.params) {
      testBody += `        ${p} = None\n`;
    }
    testBody += `        with pytest.raises(TypeError):\n`;
    testBody += `            ${fn.name}(${paramsStr})\n`;
  }

  return testBody;
}

function generateClassTest(cls) {
  let testBody = `\nclass Test${cls.name}:\n`;
  testBody += `    def setup_method(self):\n`;
  testBody += `        self.instance = ${cls.name}()\n\n`;

  for (const method of cls.methods) {
    const paramsStr = method.params.join(', ');
    const paramTypes = method.params.map(p => ({ name: p, type: guessPyType(p) }));
    testBody += `    def test_${method.name}(self):\n`;
    if (method.params.length > 0) {
      for (const p of paramTypes) {
        testBody += `        ${p.name} = ${getPyValue(p.name).val}\n`;
      }
    }
    testBody += `        result = self.instance.${method.name}(${paramsStr || ''})\n`;
    testBody += `        assert result is not None\n\n`;
  }

  return testBody;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDefaultTest() {
  return `\ndef test_module_imports():\n    assert True\n`;
}

module.exports = { generatePythonTests };
