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
  if (req.body) {
    // const userMessage: string = await payload.events[0].message.text;
    const openAIResponse = await getOpenAIResponse(payload.msg);
    console.log("OpenAI Response: ", openAIResponse);
    // await axios.post(
    //   "https://slack.com/api/chat.postMessage",
    //   {
    //     channel: payload.event.channel,
    //     text: openAIResponse,
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    return NextResponse.json({
      statusCode: 200,
      openAIResponse: openAIResponse,
    });
  }
}
