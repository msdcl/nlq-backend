// Test script to verify Gemini API integration
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  try {
    // You can set your API key here for testing
    const apiKey = process.env.GEMINI_API_KEY || 'your_gemini_api_key_here';
    
    if (apiKey === 'your_gemini_api_key_here') {
      console.log('Please set GEMINI_API_KEY environment variable');
      return;
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = 'Generate a simple SQL query to select all customers from a customers table';
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Gemini Response:', text);
    console.log('✅ Gemini API is working!');
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
  }
}

testGemini();
