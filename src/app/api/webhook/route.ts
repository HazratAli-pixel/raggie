import axios from "axios";
import crypto from "crypto";
import { NextResponse } from "next/server";
async function getOpenAIResponse(userMessage: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [{ role: "user", content: userMessage }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
      },
    }
  );
  return response.data.choices[0].message.content;
}

export async function POST(req: Request) {
  const payloadd = (await req.text()) as string;
  const signature = req.headers.get("x-line-signature");
  console.log("payloadd: ", payloadd);
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const hash = crypto
    .createHmac("sha256", process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN!)
    .update(payloadd)
    .digest("base64");
  console.log("hash: ", hash);
  console.log("signature: ", signature);

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const payload = await req.json();
  console.log("Payload :", payload);
  console.log("Request: ", req);

  if (req.body) {
    const userMessage: string = await payload.events[0].message.text;
    const mentioned = userMessage.includes("@ALEX");
    console.log("Mention", mentioned, userMessage);
    const openAIResponse = await getOpenAIResponse(userMessage);
    if (mentioned) {
      await axios.post(
        `https://api.line.me/v2/bot/message/reply`,
        {
          replyToken: payload.events[0].replyToken,
          messages: [{ type: "text", text: openAIResponse }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN}`,
          },
        }
      );

      return NextResponse.json({
        statusCode: 200,
      });
    }
  }
}
