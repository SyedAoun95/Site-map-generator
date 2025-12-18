import { shopifyWebhookHandler } from "../../../lib/utils";

export async function POST(req) {
  try {
    const data = await req.json();

    console.log("Customers Data Request:", data);

    return new Response(JSON.stringify({ status: "received" }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Error", { status: 500 });
  }
}
