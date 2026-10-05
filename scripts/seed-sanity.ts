import { catalogue } from '../lib/seed.ts';
import { sanityConfig } from '../lib/sanity.server.ts';

const config = sanityConfig(process.env);
if (!config) throw new Error('Provide SANITY_PROJECT_ID, SANITY_DATASET and SANITY_API_TOKEN in .env.local.');
const id = (type: string, value: string) => `ss.${type}.${value}`;
const refs = (type: string, values: string[]) => values.map((value,index) => ({_type:'reference',_ref:id(type,value),_key:`ref-${index}`}));
const documents = [
  ...catalogue.performers.map(({id:recordId,...fields}) => ({_id:id('performer',recordId),_type:'performer',...fields})),
  ...catalogue.instruments.map(({id:recordId,...fields}) => ({_id:id('instrument',recordId),_type:'instrument',...fields})),
  ...catalogue.songs.map(({id:recordId,performerIds,instrumentIds,...fields}) => ({_id:id('song',recordId),_type:'song',...fields,performers:refs('performer',performerIds),instruments:refs('instrument',instrumentIds)})),
  {_id:id('venue',catalogue.venue.id),_type:'venue',...Object.fromEntries(Object.entries(catalogue.venue).filter(([key])=>key!=='id'))},
  {_id:id('show',catalogue.show.id),_type:'show',title:catalogue.show.title,band:catalogue.show.band,date:catalogue.show.date,startTime:catalogue.show.startTime,venue:{_type:'reference',_ref:id('venue',catalogue.venue.id)},songs:refs('song',catalogue.show.songIds)},
];
const response = await fetch(`https://${config.projectId}.api.sanity.io/v2026-10-04/data/mutate/${config.dataset}`, {method:'POST',headers:{authorization:`Bearer ${config.token}`,'content-type':'application/json'},body:JSON.stringify({mutations:documents.map(document=>({createIfNotExists:document}))}),signal:AbortSignal.timeout(30000)});
if (!response.ok) throw new Error(`Sanity seed failed (${response.status}). Check access and dataset. No credentials are printed.`);
console.log(`Seed checked ${documents.length} original records in ${config.projectId}/${config.dataset}. Existing records were preserved.`);
