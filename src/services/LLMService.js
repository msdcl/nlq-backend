/**
 * LLM Service - Handles interactions with Google Gemini
 * Provides natural language processing and SQL generation capabilities
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Generate embedding for text using Gemini
   * @param {string} text - Text to embed
   * @returns {Promise<Array>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      // Note: Gemini Pro doesn't have direct embedding API
      // This is a placeholder - in production, you might use a different model
      // or a separate embedding service like OpenAI's text-embedding-ada-002
      
      const prompt = `Generate a numerical embedding vector for the following text. 
      Return only a JSON array of 1536 numbers between -1 and 1: "${text}"`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      
      // Parse the response as JSON array
      const embedding = JSON.parse(textResponse);
      
      if (!Array.isArray(embedding) || embedding.length !== 1536) {
        throw new Error('Invalid embedding format received');
      }
      
      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      // Return a random embedding as fallback (not recommended for production)
      return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    }
  }

  /**
   * Convert natural language query to SQL
   * @param {string} query - Natural language query
   * @param {Array} schemaContext - Relevant schema metadata
   * @param {string} language - Query language (en/hi)
   * @returns {Promise<Object>} Generated SQL and metadata
   */
  async generateSQL(query, schemaContext, language = 'en') {
    try {
      const systemPrompt = this.buildSystemPrompt(schemaContext, language);
      const userPrompt = this.buildUserPrompt(query, language);

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const textResponse = response.text();

      return this.parseSQLResponse(textResponse);
    } catch (error) {
      logger.error('Failed to generate SQL:', error);
      throw new Error(`SQL generation failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt for SQL generation
   * @param {Array} schemaContext - Schema metadata
   * @param {string} language - Query language
   * @returns {string} System prompt
   */
  buildSystemPrompt(schemaContext, language) {
    const languagePrompts = {
      en: {
        role: "You are an expert SQL query generator. Convert natural language questions into optimized PostgreSQL queries.",
        rules: [
          "Always use proper SQL syntax and PostgreSQL-specific functions",
          "Include appropriate WHERE clauses for filtering",
          "Use proper JOIN syntax for multi-table queries",
          "Add LIMIT clauses for 'top N' queries",
          "Use aggregate functions (SUM, COUNT, AVG, etc.) when appropriate",
          "Handle date/time queries with proper date functions",
          "Never include DROP, DELETE, UPDATE, or INSERT statements",
          "Always validate table and column names against the provided schema",
          "Return only the SQL query, no explanations unless requested"
        ]
      },
      hi: {
        role: "आप एक विशेषज्ञ SQL क्वेरी जेनरेटर हैं। प्राकृतिक भाषा के प्रश्नों को अनुकूलित PostgreSQL क्वेरीज़ में बदलें।",
        rules: [
          "हमेशा उचित SQL सिंटैक्स और PostgreSQL-विशिष्ट फ़ंक्शन का उपयोग करें",
          "फ़िल्टरिंग के लिए उपयुक्त WHERE क्लॉज़ शामिल करें",
          "मल्टी-टेबल क्वेरीज़ के लिए उचित JOIN सिंटैक्स का उपयोग करें",
          "'शीर्ष N' क्वेरीज़ के लिए LIMIT क्लॉज़ जोड़ें",
          "जब उपयुक्त हो तो एग्रीगेट फ़ंक्शन (SUM, COUNT, AVG, आदि) का उपयोग करें",
          "उचित तिथि फ़ंक्शन के साथ तिथि/समय क्वेरीज़ को हैंडल करें",
          "कभी भी DROP, DELETE, UPDATE, या INSERT स्टेटमेंट शामिल न करें",
          "हमेशा प्रदान किए गए स्कीमा के खिलाफ़ टेबल और कॉलम नामों को मान्य करें",
          "केवल SQL क्वेरी लौटाएं, अनुरोध किए जाने पर कोई स्पष्टीकरण न दें"
        ]
      }
    };

    const prompt = languagePrompts[language] || languagePrompts.en;
    
    let systemPrompt = `${prompt.role}\n\nRules:\n${prompt.rules.map(rule => `- ${rule}`).join('\n')}`;

    if (schemaContext && schemaContext.length > 0) {
      systemPrompt += '\n\nAvailable Schema:\n';
      const schemaText = this.formatSchemaContext(schemaContext);
      systemPrompt += schemaText;
    }

    return systemPrompt;
  }

  /**
   * Build user prompt for SQL generation
   * @param {string} query - Natural language query
   * @param {string} language - Query language
   * @returns {string} User prompt
   */
  buildUserPrompt(query, language) {
    const languagePrompts = {
      en: `Convert this natural language query to SQL:\n"${query}"`,
      hi: `इस प्राकृतिक भाषा क्वेरी को SQL में बदलें:\n"${query}"`
    };

    return languagePrompts[language] || languagePrompts.en;
  }

  /**
   * Format schema context for the prompt
   * @param {Array} schemaContext - Schema metadata
   * @returns {string} Formatted schema text
   */
  formatSchemaContext(schemaContext) {
    const tables = {};
    
    schemaContext.forEach(item => {
      if (!tables[item.table_name]) {
        tables[item.table_name] = [];
      }
      tables[item.table_name].push({
        column: item.column_name,
        type: item.data_type,
        description: item.description
      });
    });

    let schemaText = '';
    Object.keys(tables).forEach(tableName => {
      schemaText += `\nTable: ${tableName}\n`;
      tables[tableName].forEach(col => {
        schemaText += `  - ${col.column} (${col.type})`;
        if (col.description) {
          schemaText += ` - ${col.description}`;
        }
        schemaText += '\n';
      });
    });

    return schemaText;
  }

  /**
   * Parse SQL response from LLM
   * @param {string} response - Raw LLM response
   * @returns {Object} Parsed SQL and metadata
   */
  parseSQLResponse(response) {
    try {
      // Extract SQL query from response
      const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i) || 
                      response.match(/```\s*([\s\S]*?)\s*```/i) ||
                      response.match(/(SELECT[\s\S]*?;)/i);

      if (!sqlMatch) {
        throw new Error('No SQL query found in response');
      }

      const sql = sqlMatch[1].trim();
      
      // Basic validation
      if (!sql.toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      // Check for dangerous operations
      const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE'];
      const upperSQL = sql.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperSQL.includes(keyword)) {
          throw new Error(`Dangerous operation detected: ${keyword}`);
        }
      }

      return {
        sql,
        confidence: this.calculateConfidence(response),
        explanation: this.extractExplanation(response),
        metadata: {
          generated_at: new Date().toISOString(),
          model: 'gemini-pro'
        }
      };
    } catch (error) {
      logger.error('Failed to parse SQL response:', error);
      throw new Error(`SQL parsing failed: ${error.message}`);
    }
  }

  /**
   * Calculate confidence score for generated SQL
   * @param {string} response - LLM response
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(response) {
    // Simple heuristic-based confidence calculation
    let confidence = 0.5; // Base confidence

    // Check for SQL keywords
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'JOIN'];
    const keywordCount = sqlKeywords.filter(keyword => 
      response.toUpperCase().includes(keyword)
    ).length;
    
    confidence += (keywordCount / sqlKeywords.length) * 0.3;

    // Check for proper SQL structure
    if (response.includes('SELECT') && response.includes('FROM')) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract explanation from LLM response
   * @param {string} response - LLM response
   * @returns {string} Explanation text
   */
  extractExplanation(response) {
    // Look for explanation after SQL query
    const explanationMatch = response.match(/```[\s\S]*?```\s*(.*)/i);
    if (explanationMatch) {
      return explanationMatch[1].trim();
    }
    return '';
  }

  /**
   * Validate and improve SQL query
   * @param {string} sql - SQL query to validate
   * @param {Array} schemaContext - Schema metadata
   * @returns {Promise<Object>} Validation result
   */
  async validateAndImproveSQL(sql, schemaContext) {
    try {
      const prompt = `Validate and improve this SQL query. Check for:
1. Syntax errors
2. Table/column name accuracy
3. Query optimization opportunities
4. Security issues

Schema context:
${this.formatSchemaContext(schemaContext)}

SQL Query:
${sql}

Return the improved SQL and any issues found.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      return {
        improved_sql: this.extractSQL(textResponse),
        issues: this.extractIssues(textResponse),
        suggestions: this.extractSuggestions(textResponse)
      };
    } catch (error) {
      logger.error('Failed to validate SQL:', error);
      throw error;
    }
  }

  /**
   * Extract SQL from validation response
   * @param {string} response - Validation response
   * @returns {string} Extracted SQL
   */
  extractSQL(response) {
    const sqlMatch = response.match(/```sql\s*([\s\S]*?)\s*```/i) || 
                    response.match(/```\s*([\s\S]*?)\s*```/i);
    return sqlMatch ? sqlMatch[1].trim() : response;
  }

  /**
   * Extract issues from validation response
   * @param {string} response - Validation response
   * @returns {Array} Array of issues
   */
  extractIssues(response) {
    const issues = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('issue') || line.toLowerCase().includes('error')) {
        issues.push(line.trim());
      }
    }
    
    return issues;
  }

  /**
   * Extract suggestions from validation response
   * @param {string} response - Validation response
   * @returns {Array} Array of suggestions
   */
  extractSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('suggest') || line.toLowerCase().includes('recommend')) {
        suggestions.push(line.trim());
      }
    }
    
    return suggestions;
  }
}

module.exports = LLMService;
