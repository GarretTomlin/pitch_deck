import * as Handlebars from 'handlebars';
import { HelperOptions } from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface TemplateContext {
  [key: string]: any;
}

export class PromptTemplateManager {
  private readonly templates: Map<string, HandlebarsTemplateDelegate<TemplateContext>> = new Map();
  private readonly templateDir: string;

  constructor(templateDir: string) {
    this.templateDir = templateDir;
    this.loadTemplates();
    this.registerHelpers();
  }

  private loadTemplates(): void {
    try {
      if (!fs.existsSync(this.templateDir)) {
        console.warn(`Template directory ${this.templateDir} does not exist`);
        return;
      }

      const files = fs.readdirSync(this.templateDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = file.replace('.hbs', '');
          const templatePath = path.join(this.templateDir, file);
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          
          this.templates.set(
            templateName,
            Handlebars.compile<TemplateContext>(templateContent)
          );
        }
      }
    } catch (error) {
      console.error(`Error loading templates from ${this.templateDir}:`, error);
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('json', (context: any): string => {
      return JSON.stringify(context, null, 2);
    });

    Handlebars.registerHelper('list', (items: any[]): string => {
      if (!Array.isArray(items)) return '';
      return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    });

    Handlebars.registerHelper('when', function(
      this: any, 
      condition: any, 
      options: HelperOptions
    ): string {
      if (condition) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  render(templateName: string, context: TemplateContext): string {
    const template = this.templates.get(templateName);
    
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template(context);
  }

  async renderAsync(templateName: string, context: TemplateContext): Promise<string> {
    if (!this.templates.has(templateName)) {
      await this.loadTemplate(templateName);
    }
    
    return this.render(templateName, context);
  }

  private async loadTemplate(templateName: string): Promise<void> {
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
    
    try {
      const templateContent = await fs.promises.readFile(templatePath, 'utf-8');
      
      this.templates.set(
        templateName,
        Handlebars.compile<TemplateContext>(templateContent)
      );
    } catch (error: any) {
      throw new Error(`Failed to load template ${templateName}: ${error.message}`);
    }
  }

  getLoadedTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  hasTemplate(templateName: string): boolean {
    return this.templates.has(templateName);
  }
}