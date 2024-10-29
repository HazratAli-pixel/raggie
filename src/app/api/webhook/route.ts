import axios from "axios";
import { NextResponse } from "next/server";

async function getOpenAIResponse(userMessage: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-3.5-turbo",
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
  if (req.body) {
    // const userMessage: string = await payload.body.events[0].message.text;
    // const userMessage: string = "what is the capital of bangladesh";
    // const openAIResponse = await getOpenAIResponse(userMessage);
    await axios.post(
      `https://api.line.me/v2/bot/message/reply`,
      {
        replyToken: payload.events[0].replyToken,
        messages: [{ type: "text", text: "Reply from api Raggie" }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    return NextResponse.json({
      statusCode: 200,
      // openAIResponse: openAIResponse,
    });
  }
}
