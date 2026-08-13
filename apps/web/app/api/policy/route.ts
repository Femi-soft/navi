import { demoPolicy } from "@navi/policy";

export async function GET() {
  return Response.json({ policy: demoPolicy, mode: "sample-data" });
}
