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
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }
  const { event } = payload;
  if (event && event.type === "app_mention") {
    const userMessage = event.text.replace(/<@[^>]+>/, "").trim();
    console.log("userMessage: ", userMessage);
    try {
      // Get ChatGPT response from OpenAI
      const openAIResponse = await getOpenAIResponse(userMessage);
      console.log("response: ", openAIResponse);
      // Send response to Slack
      await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel: event.channel,
          text: openAIResponse,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Success:", openAIResponse);
      return NextResponse.json({ status: "Message sent to Slack" });
    } catch (error) {
      console.error("Error:", error);
      return NextResponse.json({ error: "Failed to process request" });
    }
  }
  console.log("No Action is taken:", event);
  return NextResponse.json({ status: "No action taken" });
}
