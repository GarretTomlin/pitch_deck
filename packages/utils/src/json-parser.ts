import { z } from 'zod';

export class JsonResponseParser {
  private static readonly JSON_PATTERNS = [
    /```json\s*\n([\s\S]*?)\n```/,
    /```\s*\n([\s\S]*?)\n```/,
    /\{[\s\S]*\}/,
  ];

  static parse<T>(
    content: string,
    schema?: z.ZodSchema<T>,
    options: {
      cleanMarkdown?: boolean;
      extractArrays?: boolean;
      fuzzyMatch?: boolean;
    } = {}
  ): T | null {
    const { cleanMarkdown = true, extractArrays = true, fuzzyMatch = true } = options;

    let jsonString = content;

    // Clean markdown formatting
    if (cleanMarkdown) {
      jsonString = this.cleanMarkdownFormatting(content);
    }

    // Try multiple patterns to extract JSON
    for (const pattern of this.JSON_PATTERNS) {
      const match = jsonString.match(pattern);
      if (match) {
        jsonString = match[1] || match[0];
        break;
      }
    }

    // Try to parse JSON
    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate with schema if provided
      if (schema) {
        return schema.parse(parsed);
      }
      
      return parsed;
    } catch (error) {
      // Try fuzzy matching
      if (fuzzyMatch) {
        const fuzzyParsed = this.fuzzyJsonParse(jsonString);
        if (fuzzyParsed) {
          if (schema) {
            try {
              return schema.parse(fuzzyParsed);
            } catch {
              // Schema validation failed
            }
          }
          return fuzzyParsed;
        }
      }

      // Extract arrays if requested
      if (extractArrays) {
        const arrayMatch = jsonString.match(/\[([\s\S]*?)\]/);
        if (arrayMatch) {
          try {
            const parsed = JSON.parse(arrayMatch[0]);
            return parsed;
          } catch {
            // Array parsing failed
          }
        }
      }

      return null;
    }
  }

  private static cleanMarkdownFormatting(content: string): string {
    return content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\n\n/g, '\n')
      .replace(/^\s*#.*$/gm, '') // Remove markdown headers
      .trim();
  }

  private static fuzzyJsonParse(content: string): any {
    try {
      // Try to extract key-value pairs
      const lines = content.split('\n');
      const result: any = {};
      let currentKey = '';
      let currentValue: any = '';
      let inArray = false;
      let arrayContent: any[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Check for key-value pattern
        const keyValueMatch = trimmed.match(/^"?(\w+)"?\s*:\s*(.*)$/);
        if (keyValueMatch) {
          if (currentKey && !inArray) {
            result[currentKey] = this.parseValue(currentValue);
          }
          
          currentKey = keyValueMatch[1];
          currentValue = keyValueMatch[2];
          
          // Check if value starts an array
          if (currentValue.startsWith('[')) {
            inArray = true;
            arrayContent = [];
            currentValue = currentValue.substring(1);
          }
        } else if (inArray) {
          // Handle array content
          if (trimmed.endsWith(']')) {
            arrayContent.push(this.parseValue(trimmed.slice(0, -1)));
            result[currentKey] = arrayContent;
            inArray = false;
            currentKey = '';
          } else {
            arrayContent.push(this.parseValue(trimmed));
          }
        } else if (currentKey) {
          // Multi-line value
          currentValue += ' ' + trimmed;
        }
      }

      // Handle last key-value pair
      if (currentKey && !inArray) {
        result[currentKey] = this.parseValue(currentValue);
      }

      return Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  }

  private static parseValue(value: string): any {
    // Remove quotes
    value = value.trim().replace(/^["']|["']$/g, '');
    
    // Parse numbers
    if (/^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }
    
    // Parse booleans
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Parse null
    if (value.toLowerCase() === 'null') return null;
    
    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        // Return as string if parsing fails
      }
    }
    
    // Return as string
    return value;
  }
}

// Response schemas
export const MarketResearchSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    marketShare: z.string().optional(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })),
  marketSize: z.string(),
  trends: z.array(z.string()),
  insights: z.array(z.string()),
});

export const DeckOutlineSchema = z.object({
  suggestedSlides: z.array(z.object({
    type: z.string(),
    title: z.string(),
    mainPoints: z.array(z.string()),
    suggestedVisuals: z.array(z.string()),
  })),
  narrative: z.string(),
  keyMessages: z.array(z.string()),
});

export const SlideContentSchema = z.object({
  text: z.string(),
  bulletPoints: z.array(z.string()).optional(),
  speakerNotes: z.string(),
  suggestedImages: z.array(z.string()).optional(),
  chartData: z.any().optional(),
});