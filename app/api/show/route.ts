import { handleShowRequest } from '../../../lib/show-service.ts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function environment(): Record<string,string | undefined> {
  return {
    SANITY_PROJECT_ID: process.env.SANITY_PROJECT_ID,
    SANITY_DATASET: process.env.SANITY_DATASET,
    SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
  };
}

export async function GET(request: Request) { return handleShowRequest(request,environment()); }
export async function POST(request: Request) { return handleShowRequest(request,environment()); }
