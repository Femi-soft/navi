export async function GET() {
  return Response.json({ status: "ok", mode: "scaffold", executionEnabled: false });
}
