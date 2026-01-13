/**
 * Template Engine - orchestrates markdown generation from Tend contacts
 */

import type { TendContact } from '../models/tend-contact';
import { FrontmatterGenerator } from './frontmatter';
import { BodySectionGenerator } from './body-sections';

export class TemplateEngine {
  private frontmatterGenerator: FrontmatterGenerator;
  private bodySectionGenerator: BodySectionGenerator;

  constructor() {
    this.frontmatterGenerator = new FrontmatterGenerator();
    this.bodySectionGenerator = new BodySectionGenerator();
  }

  /**
   * Generate complete markdown content from a Tend contact
   */
  generateMarkdown(contact: TendContact): string {
    const frontmatter = this.frontmatterGenerator.generateFrontmatter(contact);
    const body = this.bodySectionGenerator.generateBody(contact);

    return this.assembleMarkdown(frontmatter, body);
  }

  /**
   * Assemble frontmatter and body into complete markdown file
   */
  private assembleMarkdown(frontmatter: string, body: string): string {
    return `---\n${frontmatter}\n---\n\n${body}`;
  }
}
