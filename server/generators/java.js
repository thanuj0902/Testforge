function generateJavaTests(code) {
  const classes = extractClasses(code);

  let tests = `import org.junit.jupiter.api.Test;\nimport org.junit.jupiter.api.BeforeEach;\nimport org.junit.jupiter.api.DisplayName;\nimport static org.junit.jupiter.api.Assertions.*;\n\n`;

  for (const cls of classes) {
    tests += generateClassTest(cls);
  }

  if (classes.length === 0) {
    tests += generateDefaultTest();
  }

  return tests;
}

function extractClasses(code) {
  const classes = [];
  const classRegex = /(?:public\s+)?class\s+(\w+)[\s\S]*?(?=public\s+class|$)/g;
  let match;

  while ((match = classRegex.exec(code)) !== null) {
    const name = match[1];
    const body = match[0];
    const methods = [];
    const methodRegex = /(?:public|private|protected)\s+(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*(?:throws\s+\w+)?\s*{/g;
    let m;

    while ((m = methodRegex.exec(body)) !== null) {
      const methodName = m[1];
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(methodName) && !methodName.startsWith('_') && methodName !== name) {
        const params = m[2].split(',').map(p => {
          const parts = p.trim().split(/\s+/);
          return parts.length > 1 ? { name: parts[parts.length - 1], type: parts.slice(0, -1).join(' ') } : null;
        }).filter(Boolean);
        methods.push({ name: methodName, params, hasReturn: !m[0].includes('void ') });
      }
    }

    classes.push({ name, methods });
  }

  return classes;
}

function generateClassTest(cls) {
  let testBody = `class ${cls.name}Test {\n\n`;
  testBody += `    private ${cls.name} instance;\n\n`;
  testBody += `    @BeforeEach\n`;
  testBody += `    void setUp() {\n`;
  testBody += `        instance = new ${cls.name}();\n`;
  testBody += `    }\n\n`;

  for (const method of cls.methods) {
    const paramsStr = method.params.map(p => p.name).join(', ');
    testBody += `    @Test\n`;
    testBody += `    @DisplayName("${method.name} should work with valid input")\n`;
    testBody += `    void test${capitalize(method.name)}() {\n`;
    if (method.params.length > 0) {
      for (const p of method.params) {
        testBody += `        ${p.type} ${p.name} = ${getJavaTestValue(p.type)};\n`;
      }
    }
    testBody += `        ${method.hasReturn ? 'Object result = ' : ''}instance.${method.name}(${paramsStr || ''});\n`;
    if (method.hasReturn) {
      testBody += `        assertNotNull(result);\n`;
    }
    testBody += `    }\n\n`;
  }

  const isPrimitive = (t) => ['int','byte','short','long','float','double','boolean','char'].includes(t);
  const nullMethod = cls.methods.find(m => m.params.length > 0 && m.params.every(p => !isPrimitive(p.type)));
  if (nullMethod) {
    testBody += `    @Test\n`;
    testBody += `    @DisplayName("Should handle null inputs")\n`;
    testBody += `    void testNullInputs() {\n`;
    testBody += `        assertThrows(Exception.class, () -> {\n`;
    testBody += `            instance.${nullMethod.name}(${nullMethod.params.map(p => `(${p.type}) null`).join(', ')});\n`;
    testBody += `        });\n`;
    testBody += `    }\n`;
  }

  testBody += `}\n`;

  return testBody;
}

function getJavaTestValue(type) {
  switch (type) {
    case 'int': case 'byte': case 'short': case 'long':
      return '42';
    case 'float': return '3.14f';
    case 'double': return '3.14';
    case 'boolean': return 'true';
    case 'char': return "'a'";
    default: return '"test"';
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDefaultTest() {
  return `class DefaultTest {\n    @Test\n    @DisplayName("Basic test")\n    void basicTest() {\n        assertTrue(true);\n    }\n}\n`;
}

module.exports = { generateJavaTests };
