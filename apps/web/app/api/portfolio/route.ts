import { demoPortfolio } from "@navi/portfolio";

export async function GET() {
  return Response.json(await demoPortfolio.read("0x71000000000000000000000000000000000042af"));
}
