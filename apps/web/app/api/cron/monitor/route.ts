import { timingSafeEqual } from "node:crypto";

import { runMonitoringProbe } from "../../../../lib/server/monitoring";

export async function GET(request:Request) {
  const expected=process.env.CRON_SECRET;
  const received=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
  if (!expected || !sameSecret(received,expected)) return Response.json({ error:"UNAUTHORIZED" },{ status:401 });
  try {
    const report=await runMonitoringProbe();
    return Response.json(report,{ status:report.status==="healthy"?200:503 });
  } catch {
    return Response.json({ error:"MONITORING_PROBE_FAILED", retrievedAt:new Date().toISOString(), source:"NAVI_MONITORING_PROBE" },{ status:503 });
  }
}

function sameSecret(received:string,expected:string) {
  const left=Buffer.from(received);
  const right=Buffer.from(expected);
  return left.length===right.length && timingSafeEqual(left,right);
}
