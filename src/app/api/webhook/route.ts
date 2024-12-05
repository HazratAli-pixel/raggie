import axios from "axios";
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
  const payload = await req.json();
  console.log("Payload :", payload);
  console.log("Request: ", req);
  const userMessages: string = await payload.events[0].message.text;
  console.log("userMessages: ", userMessages);
  const rawBody = await req.text();
  console.log("rawBody: ", rawBody);
  console.log("req headers: ", req.headers);
  const signature = req.headers.get("x-line-signature");
  console.log("signature: ", signature);

  // if (!signature) {
  //   return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  // }
  // const hash = crypto
  //   .createHmac("sha256", process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN!)
  //   .update(rawBody)
  //   .digest("base64");
  // if (hash !== signature) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  // }

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
