import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_STUDIO_DATASET;
if (!projectId || !dataset) throw new Error('Set SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET in studio/.env.local.');
export default defineConfig({name:'setlist-surgery',title:'Setlist Surgery',projectId,dataset,plugins:[structureTool()],schema:{types:schemaTypes}});
