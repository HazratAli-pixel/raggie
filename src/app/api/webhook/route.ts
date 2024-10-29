import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

async function getOpenAIResponse(userMessage: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4",
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

export async function POST(req: NextRequest) {
  // const payload = await req.text();
  // console.log("Payload :", payload);
  console.log("Request: ", req);
  if (req.body) {
    const userMessage: string = await req.body.events[0].message.text;
    const openAIResponse = await getOpenAIResponse(userMessage);
    await axios.post(
      `https://api.line.me/v2/bot/message/reply`,
      {
        replyToken: req.body.events[0].replyToken ?? "",
        messages: [{ type: "text", text: openAIResponse }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    return NextResponse.json({
      status: "sucess",
      code: 200,
    });
  }
}
