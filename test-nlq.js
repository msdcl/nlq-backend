const { AdvancedNLQService } = require('./src/services/AdvancedNLQService');

async function testNLQ() {
  try {
    console.log('Testing NLQ Service...');
    
    const nlqService = new AdvancedNLQService();
    await nlqService.initialize();
    
    console.log('Service initialized successfully');
    
    // Test a simple query
    const result = await nlqService.processQuery('show top 5 customers by order value');
    
    console.log('Query result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNLQ();
