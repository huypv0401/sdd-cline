// Simple test script to verify PBT status tracking implementation
const { TasksParser } = require('./out/core/spec-system/TasksParser.js');

const parser = new TasksParser();

// Test 1: Parse PBT status
console.log('Test 1: Parse PBT status metadata');
const content1 = `- [ ] 1 Write property test
  _PBT: status=passed_
- [ ] 2 Another test
  _PBT: status=failed, failingExample="counterexample: x=5"_
`;

try {
  const taskTree1 = parser.parseContent(content1);
  console.log('✓ Parsed successfully');
  console.log('  Task 1 PBT status:', taskTree1.tasks[0].pbtStatus);
  console.log('  Task 2 PBT status:', taskTree1.tasks[1].pbtStatus);
} catch (error) {
  console.error('✗ Parse failed:', error.message);
}

// Test 2: Pretty print PBT status
console.log('\nTest 2: Pretty print PBT status');
try {
  const taskTree2 = parser.parseContent(content1);
  const output = parser.prettyPrint(taskTree2);
  console.log('✓ Pretty print successful');
  console.log('Output:\n', output);
} catch (error) {
  console.error('✗ Pretty print failed:', error.message);
}

// Test 3: Round-trip preservation
console.log('\nTest 3: Round-trip preservation');
try {
  const taskTree3a = parser.parseContent(content1);
  const printed = parser.prettyPrint(taskTree3a);
  const taskTree3b = parser.parseContent(printed);
  
  const match = 
    taskTree3b.tasks[0].pbtStatus?.status === taskTree3a.tasks[0].pbtStatus?.status &&
    taskTree3b.tasks[1].pbtStatus?.status === taskTree3a.tasks[1].pbtStatus?.status &&
    taskTree3b.tasks[1].pbtStatus?.failingExample === taskTree3a.tasks[1].pbtStatus?.failingExample;
  
  if (match) {
    console.log('✓ Round-trip preservation successful');
  } else {
    console.error('✗ Round-trip preservation failed');
  }
} catch (error) {
  console.error('✗ Round-trip test failed:', error.message);
}

console.log('\nAll tests completed!');
