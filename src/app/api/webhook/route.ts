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
  const rowBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  const hash = crypto
    .createHmac("sha256", "bed207df519919d69768f3190d0b2565")
    .update(rowBody)
    .digest("base64");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const payload = await JSON.parse(rowBody);
  console.log("message Object", payload.events[0].message);
  console.log("payload", payload);

  if (req.body) {
    const userMessage: string = await payload.events[0].message.text;
    const userMessages = userMessage.replace(/@\w+/g, "").trim();
    // const mentionsWord: string[] = userMessage.match(/@\w+/g) || [];
    // const mentioned = userMessage.includes(String(mentionsWord[0]));
    const openAIResponse = await getOpenAIResponse(userMessages);
    const userType = await payload.events[0].source.type;
    if (userType === "group") {
      const mentioned = await payload.events[0].message.mention.mentionees[0]
        .isSelf;
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
      }
      return NextResponse.json({
        statusCode: 200,
      });
    } else if (userType === "user") {
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
