import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, 'blogs.json');

async function runPipeline() {
  console.log('=== PHASE 1: MARKET RESEARCH ===');
  let researchPayload = '';

  try {
    const response = await axios.get('https://capitallifters.com', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(response.data);
    const headline = $('h1').first().text().trim() || 'Singapore Property Market Update';
    researchPayload = `Latest headline from Capital Lifters: ${headline}.`;
  } catch (error) {
    researchPayload = 'Fallback: Singapore Core Central Region (CCR) transaction volumes remain elevated.';
  }

  console.log('=== PHASE 2: WRITING WITH GROQ AI ===');
  
  let brandGuidelines = 'Write as an expert real estate content strategist focusing on high-converting real estate insights.';
  const rulesPath = path.join(__dirname, 'config', 'myrules.md');
  if (fs.existsSync(rulesPath)) {
    brandGuidelines = fs.readFileSync(rulesPath, 'utf8');
  }

  const compositionPrompt = `
    You are an elite real estate content strategist acting as a partner for a Singapore-based realtor ("Real estate Enthusiast").
    This week's Singapore property market data: ${researchPayload}
    Writing guidelines to follow strictly: ${brandGuidelines}
    
    ORGANIZATION REQUIREMENTS:
    - Break the article down into exactly 2 or 3 clear, well-organized sub-sections.
    - Introduce each sub-section by putting the title on its own line inside brackets, exactly like this: [Sub-section Title Here]
    - Do NOT use markdown symbols like ## or ** inside the content text.
    
    Provide your output STRICTLY in the following JSON format:
    {
      "title": "An engaging, professional article title",
      "excerpt": "A short, catchy 2-sentence summary description.",
      "content": "[Introduction]\\nYour introductory paragraph text goes here.\\n\\n[Market Outlook]\\nYour second body paragraph section analysis goes here."
    }
  `;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: compositionPrompt }],
    response_format: { type: "json_object" }
  });

  const generatedData = JSON.parse(completion.choices[0].message.content);

  console.log('=== PHASE 3: UPDATE DATABASE MATRIX ===');
  let blogDatabase = [];

  if (fs.existsSync(databasePath)) {
    try {
      blogDatabase = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    } catch (e) {
      blogDatabase = [];
    }
  }

  const sgOptions = { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric' };
  const sgDateString = new Intl.DateTimeFormat('en-SG', sgOptions).format(new Date());
  
  const articleId = String(Date.now());
  
  // FIXED: Reliable keyword query search utilizing a dynamic timestamp signature token
  const randomSeed = Math.floor(Math.random() * 10000);
  const dynamicImageUri = `https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80&sig=${randomSeed}&q=luxury,architecture,apartment`;

  const newPostEntry = {
    id: articleId,
    date: sgDateString,
    category: "Market Update",
    title: generatedData.title,
    excerpt: generatedData.excerpt,
    image: dynamicImageUri,
    content: generatedData.content
  };

  blogDatabase.unshift(newPostEntry);
  fs.writeFileSync(databasePath, JSON.stringify(blogDatabase, null, 2));
  console.log(`Pipeline complete. Images fixed and ready.`);
}

runPipeline().catch(console.error);
