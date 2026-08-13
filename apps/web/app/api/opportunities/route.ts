import { demoOpportunities } from "@navi/opportunities";

export async function GET() {
  return Response.json({ opportunities: await demoOpportunities.discover(), mode: "sample-data" });
}
