function generateGoTests(code) {
  const functions = extractFunctions(code);
  let tests = `package main\n\nimport (\n\t"testing"\n)\n\n`;
  for (const fn of functions) {
    tests += generateFunctionTest(fn);
  }
  if (functions.length === 0) {
    tests += generateDefaultTest();
  }
  return tests;
}
function extractFunctions(code) {
  const functions = [];
  const fnRegex = /func\s+(\w+)\s*\(([^)]*)\)(?:\s+\(([\s\S]*?)\)|\s+(\S+))?\s*{/g;
  let match;
  while ((match = fnRegex.exec(code)) !== null) {
    const name = match[1];
    if (name === 'main' || name === 'init') continue;
    const paramsStr = match[2];
    const params = [];
    const parts = paramsStr.split(',').map(p => p.trim());
    let pendingNames = [];
    for (const part of parts) {
      const tokens = part.split(/\s+/);
      if (tokens.length === 1) {
        pendingNames.push(tokens[0]);
      } else {
        const pType = tokens.slice(1).join(' ');
        for (const name of pendingNames) {
          params.push({ name, type: pType });
        }
        params.push({ name: tokens[0], type: pType });
        pendingNames = [];
      }
    }
    const returns = match[3] || match[4] || '';
    functions.push({ name, params, returns });
  }
  return functions;
}
function getTypeValue(type) {
  const t = type.replace(/^\*/, '');
  if (t.startsWith('[]')) return `[]${t.slice(2)}{}`;
  if (t.startsWith('map[')) return `${t}{}`;
  switch (t) {
    case 'int': case 'int8': case 'int16': case 'int32': case 'int64':
      return '42';
    case 'uint': case 'uint8': case 'uint16': case 'uint32': case 'uint64':
      return '42';
    case 'float32': case 'float64':
      return '3.14';
    case 'bool':
      return 'true';
    case 'string':
      return '"hello"';
    case 'byte':
      return "'a'";
    case 'rune':
      return "'世'";
    case 'error':
      return 'nil';
    default:
      return type.startsWith('*') ? 'nil' : 'new(' + t + ')';
  }
}
function getZeroValue(type) {
  const t = type.replace(/^\*/, '');
  if (t.startsWith('[]')) return 'nil';
  if (t.startsWith('map[')) return 'nil';
  if (t.endsWith('interface{}')) return 'nil';
  switch (t) {
    case 'int': case 'int8': case 'int16': case 'int32': case 'int64':
    case 'uint': case 'uint8': case 'uint16': case 'uint32': case 'uint64':
      return '0';
    case 'float32': case 'float64':
      return '0.0';
    case 'bool':
      return 'false';
    case 'string':
      return '""';
    case 'byte': case 'rune':
      return '0';
    case 'error':
      return 'nil';
    default:
      return type.startsWith('*') ? 'nil' : t + '{}';
  }
}
function isComparable(type) {
  const t = type;
  if (t.startsWith('[]') || t.startsWith('map[') || t.startsWith('*'))
    return false;
  if (t === 'error' || t.includes('interface'))
    return false;
  return true;
}
function structFieldName(name) {
  return name === 'name' ? 'nameVal' : name;
}

function generateFunctionTest(fn) {
  const paramsForCall = fn.params.map(p => 'tt.' + structFieldName(p.name)).join(', ');
  const values = fn.params.map(p => getTypeValue(p.type));
  const testName = capitalize(fn.name);
  const comparable = isComparable(fn.returns);
  const isVoid = fn.returns === '' || fn.returns === '()';
  let testBody = `func Test${testName}(t *testing.T) {\n`;
  testBody += `\ttests := []struct {\n`;
  testBody += `\t\tname string\n`;
  for (const p of fn.params) {
    testBody += `\t\t${structFieldName(p.name)} ${p.type}\n`;
  }
  if (!isVoid) {
    testBody += `\t\twant ${fn.returns}\n`;
  }
  testBody += `\t}{\n`;
  testBody += `\t\t{name: "basic case"`;
  for (let i = 0; i < fn.params.length; i++) {
    testBody += `, ${structFieldName(fn.params[i].name)}: ${values[i]}`;
  }
  if (!isVoid) {
    testBody += `, want: ${getTypeValue(fn.returns)}`;
  }
  testBody += `},\n`;
  testBody += `\t\t{name: "zero values"`;
  for (const p of fn.params) {
    testBody += `, ${structFieldName(p.name)}: ${getZeroValue(p.type)}`;
  }
  if (!isVoid) {
    testBody += `, want: ${getZeroValue(fn.returns)}`;
  }
  testBody += `},\n`;
  testBody += `\t}\n\n`;
  testBody += `\tfor _, tt := range tests {\n`;
  testBody += `\t\tt.Run(tt.name, func(t *testing.T) {\n`;
  testBody += `\t\t\tgot := ${fn.name}(${paramsForCall || ''})\n`;
  if (isVoid) {
    testBody += `\t\t\tt.Logf("${fn.name}() executed")\n`;
  } else if (comparable) {
    testBody += `\t\t\tif got != tt.want {\n`;
    testBody += `\t\t\t\tt.Errorf("${fn.name}() = %v, want %v", got, tt.want)\n`;
    testBody += `\t\t\t}\n`;
  } else {
    testBody += `\t\t\tt.Logf("${fn.name}() = %v", got)\n`;
  }
  testBody += `\t\t})\n`;
  testBody += `\t}\n`;
  testBody += `}\n\n`;
  return testBody;
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function generateDefaultTest() {
  return `func TestPlaceholder(t *testing.T) {\n\tt.Log("Placeholder test")\n}\n`;
}
module.exports = { generateGoTests };